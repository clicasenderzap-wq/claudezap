const { BotConfig, BotConversation, WhatsappAccount, Contact, Message } = require('../models');
const whatsapp = require('./whatsappService');
const { enqueueScheduled } = require('./queueService');

const ESCALATION_SIGNALS = [
  'transferir para atendente',
  'falar com humano',
  'atendente humano',
  'falar com pessoa',
  'precisa de atendimento humano',
  '[[ESCALAR]]',
];

function needsEscalation(text) {
  const lower = text.toLowerCase();
  return ESCALATION_SIGNALS.some((s) => lower.includes(s));
}

// Parses [[AGENDAR:YYYY-MM-DD HH:mm:message text]] tags from bot replies
// Returns { cleanText, schedules: [{ scheduledFor, content }] }
function parseScheduleTags(text) {
  const SCHEDULE_RE = /\[\[AGENDAR:(\d{4}-\d{2}-\d{2} \d{2}:\d{2}):(.+?)\]\]/g;
  const schedules = [];
  let match;
  while ((match = SCHEDULE_RE.exec(text)) !== null) {
    const scheduledFor = new Date(match[1]);
    if (!isNaN(scheduledFor.getTime()) && scheduledFor > new Date()) {
      schedules.push({ scheduledFor, content: match[2].trim() });
    }
  }
  const cleanText = text.replace(SCHEDULE_RE, '').trim();
  return { cleanText, schedules };
}

async function createBotScheduledMessages(account, fromPhone, schedules) {
  try {
    const digits = String(fromPhone).replace(/\D/g, '');
    const variants = [digits, digits.startsWith('55') ? digits.slice(2) : `55${digits}`];
    const contact = await Contact.findOne({ where: { user_id: account.user_id, phone: variants } });
    if (!contact) return;

    for (const { scheduledFor, content } of schedules) {
      const msg = await Message.create({
        user_id: account.user_id,
        contact_id: contact.id,
        account_id: account.id,
        content,
        status: 'queued',
        scheduled_for: scheduledFor,
      });
      const jobId = await enqueueScheduled(msg.id, account.user_id, account.id, fromPhone, content, scheduledFor);
      await msg.update({ queue_job_id: String(jobId) });
    }
  } catch (err) {
    console.error('[Bot] erro ao criar agendamento:', err.message);
  }
}

async function callAI(config, messages) {
  if (!config.ai_api_key) throw new Error('Chave de API não configurada');

  if (config.ai_provider === 'anthropic') {
    const Anthropic = require('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: config.ai_api_key });

    const response = await client.messages.create({
      model: config.ai_model || 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: config.system_prompt + '\n\nSe o cliente precisar de atendimento humano especializado ou se você não conseguir resolver o problema, inclua exatamente [[ESCALAR]] na sua resposta.\n\nPara agendar um follow-up automático para este cliente em uma data futura, inclua na sua resposta a tag [[AGENDAR:AAAA-MM-DD HH:mm:texto da mensagem]] — exemplo: [[AGENDAR:2026-05-01 10:00:Olá {{nome}}, só passando para confirmar nosso combinado!]]. A tag não aparecerá para o cliente.',
      messages,
    });
    return response.content[0].text;
  }

  if (config.ai_provider === 'openai') {
    const { default: OpenAI } = require('openai');
    const client = new OpenAI({ apiKey: config.ai_api_key });

    const response = await client.chat.completions.create({
      model: config.ai_model || 'gpt-4o-mini',
      max_tokens: 500,
      messages: [
        { role: 'system', content: config.system_prompt + '\n\nSe o cliente precisar de atendimento humano especializado ou se você não conseguir resolver o problema, inclua exatamente [[ESCALAR]] na sua resposta.\n\nPara agendar um follow-up automático para este cliente em uma data futura, inclua na sua resposta a tag [[AGENDAR:AAAA-MM-DD HH:mm:texto da mensagem]] — exemplo: [[AGENDAR:2026-05-01 10:00:Olá {{nome}}, só passando para confirmar nosso combinado!]]. A tag não aparecerá para o cliente.' },
        ...messages,
      ],
    });
    return response.choices[0].message.content;
  }

  throw new Error('Provedor de IA não suportado');
}

async function handleMessage(accountId, fromPhone, text) {
  const config = await BotConfig.findOne({ where: { account_id: accountId, enabled: true } });
  if (!config) return;

  // Horário comercial
  if (config.business_hours_only) {
    const hour = new Date().getHours();
    if (hour < config.start_hour || hour >= config.end_hour) return;
  }

  // Busca ou cria conversa
  let conv = await BotConversation.findOne({ where: { account_id: accountId, contact_phone: fromPhone } });

  if (!conv) {
    conv = await BotConversation.create({ account_id: accountId, contact_phone: fromPhone, messages: [] });
    // Envia mensagem de boas-vindas
    if (config.welcome_message) {
      await whatsapp.sendText(accountId, fromPhone, config.welcome_message);
      const msgs = [{ role: 'assistant', content: config.welcome_message, ts: Date.now() }];
      await conv.update({ messages: msgs, last_message_at: new Date() });
      conv.messages = msgs;
    }
  }

  // Conversa já escalada ou fechada: ignora
  if (conv.status === 'escalated' || conv.status === 'closed') return;

  // Adiciona mensagem do cliente ao histórico
  const history = [...(conv.messages || []), { role: 'user', content: text, ts: Date.now() }];

  // Limite de turns: escala automaticamente
  const userTurns = history.filter((m) => m.role === 'user').length;
  if (userTurns > config.max_turns) {
    await conv.update({ messages: history, status: 'escalated', last_message_at: new Date() });
    await whatsapp.sendText(accountId, fromPhone, config.escalation_message);
    return;
  }

  // Chama IA com o histórico (últimas 20 msgs para não estourar tokens)
  const aiMessages = history.slice(-20).map((m) => ({ role: m.role, content: m.content }));
  let reply;
  try {
    reply = await callAI(config, aiMessages);
  } catch (err) {
    console.error('[Bot] erro na IA:', err.message);
    return;
  }

  // Verifica se precisa escalar
  const shouldEscalate = needsEscalation(reply);
  // Parse schedule tags first, then strip escalation tag
  const { cleanText: textAfterSchedule, schedules } = parseScheduleTags(reply);
  const cleanReply = textAfterSchedule.replace('[[ESCALAR]]', '').trim();

  const newHistory = [...history, { role: 'assistant', content: cleanReply, ts: Date.now() }];

  if (shouldEscalate) {
    await conv.update({ messages: newHistory, status: 'escalated', last_message_at: new Date() });
    if (cleanReply) await whatsapp.sendText(accountId, fromPhone, cleanReply);
    await whatsapp.sendText(accountId, fromPhone, config.escalation_message);
  } else {
    await conv.update({ messages: newHistory, last_message_at: new Date() });
    await whatsapp.sendText(accountId, fromPhone, cleanReply);
  }

  // Create any scheduled follow-ups the AI requested
  if (schedules.length > 0) {
    const account = await WhatsappAccount.findByPk(accountId).catch(() => null);
    if (account) await createBotScheduledMessages(account, fromPhone, schedules);
  }
}

module.exports = { handleMessage };

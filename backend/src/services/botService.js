const { Op } = require('sequelize');
const { BotConfig, BotConversation, WhatsappAccount, User, Contact, Message } = require('../models');
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

const SYSTEM_SUFFIX = '\n\nSe o cliente precisar de atendimento humano especializado ou se você não conseguir resolver o problema, inclua exatamente [[ESCALAR]] na sua resposta.\n\nPara agendar um follow-up automático para este cliente em uma data futura, inclua na sua resposta a tag [[AGENDAR:AAAA-MM-DD HH:mm:texto da mensagem]] — exemplo: [[AGENDAR:2026-05-01 10:00:Olá {{nome}}, só passando para confirmar nosso combinado!]]. A tag não aparecerá para o cliente.';

async function callAI(config, messages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada no servidor');

  const { default: OpenAI } = require('openai');
  const client = new OpenAI({ apiKey });

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 500,
    messages: [
      { role: 'system', content: (config.system_prompt || '') + SYSTEM_SUFFIX },
      ...messages,
    ],
  });
  return response.choices[0].message.content;
}

// Normalize phone to local digits (strip country code 55 for BR numbers)
function normalizePhone(p) {
  const digits = String(p).replace(/\D/g, '');
  return digits.startsWith('55') && digits.length >= 12 ? digits.slice(2) : digits;
}

async function handleMessage(accountId, fromPhone, text) {
  const account = await WhatsappAccount.findByPk(accountId);
  if (!account) { console.log(`[Bot] conta ${accountId} não encontrada`); return; }

  const user = await User.findByPk(account.user_id);
  if (!user || !['pro', 'pro_cortesia'].includes(user.plan)) {
    console.log(`[Bot] user ${account.user_id} plano inelegível: ${user?.plan}`);
    return;
  }

  // Prevent bot loop: skip if sender is one of the user's own WhatsApp accounts
  const ownAccounts = await WhatsappAccount.findAll({ where: { user_id: account.user_id }, attributes: ['phone'] });
  const ownPhones = ownAccounts.map((a) => normalizePhone(a.phone)).filter(Boolean);
  const senderNorm = normalizePhone(fromPhone);
  if (ownPhones.some((p) => p === senderNorm)) {
    console.log(`[Bot] ignorando mensagem de conta própria: ${fromPhone}`);
    return;
  }

  const config = await BotConfig.findOne({ where: { account_id: accountId, enabled: true } });
  if (!config) { console.log(`[Bot] nenhum bot ativo para conta ${accountId}`); return; }

  // Horário comercial
  if (config.business_hours_only) {
    const hour = new Date().getHours();
    if (hour < config.start_hour || hour >= config.end_hour) {
      console.log(`[Bot] fora do horário comercial (${hour}h, janela ${config.start_hour}-${config.end_hour})`);
      return;
    }
  }

  // Busca ou cria conversa
  let conv = await BotConversation.findOne({ where: { account_id: accountId, contact_phone: fromPhone } });

  // Auto-reset: se conversa escalada/fechada há mais de 24h, reinicia
  if (conv && (conv.status === 'escalated' || conv.status === 'closed')) {
    const idleMs = Date.now() - new Date(conv.last_message_at || conv.created_at).getTime();
    if (idleMs > 24 * 60 * 60 * 1000) {
      console.log(`[Bot] reiniciando conversa escalada após ${Math.round(idleMs / 3600000)}h de inatividade`);
      await conv.update({ status: 'active', messages: [], last_message_at: null });
    } else {
      console.log(`[Bot] conversa em status ${conv.status} — aguardando 24h para reiniciar`);
      return;
    }
  }

  if (!conv) {
    // Enforce 500 conversations/month limit
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const allAccounts = await WhatsappAccount.findAll({ where: { user_id: account.user_id }, attributes: ['id'] });
    const accountIds = allAccounts.map((a) => a.id);
    const monthlyCount = await BotConversation.count({
      where: { account_id: accountIds, created_at: { [Op.gte]: monthStart } },
    });
    if (monthlyCount >= 500) {
      console.log(`[Bot] limite mensal de conversas atingido para user ${account.user_id}`);
      return;
    }

    conv = await BotConversation.create({ account_id: accountId, contact_phone: fromPhone, messages: [] });
    // Envia mensagem de boas-vindas
    if (config.welcome_message) {
      await whatsapp.sendText(accountId, fromPhone, config.welcome_message);
      const msgs = [{ role: 'assistant', content: config.welcome_message, ts: Date.now() }];
      await conv.update({ messages: msgs, last_message_at: new Date() });
      conv.messages = msgs;
    }
  }

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
    await createBotScheduledMessages(account, fromPhone, schedules);
  }
}

module.exports = { handleMessage };

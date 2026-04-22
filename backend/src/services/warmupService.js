const { WarmupConfig, WarmupLog, WhatsappAccount } = require('../models');
const { Op } = require('sequelize');
const whatsapp = require('./whatsappService');

// ── Biblioteca de mensagens humanizadas ──────────────────────────────────────

const INITIATORS = [
  'Oi! Tudo bem?',
  'Olá! Como você está?',
  'Oi, tudo certo por aí?',
  'Ei, tudo bem?',
  'Boa tarde! Como vai?',
  'Oi! Como está sendo seu dia?',
  'Olá! Tudo tranquilo?',
  'Ei! Tudo bom?',
  'Oi, sumido! Tudo certo?',
  'Passando para dar um alô! Tudo bem?',
  'Oi! Posso te ligar mais tarde?',
  'Tudo bem com você?',
  'Oi! Está livre agora?',
  'Olá! Bom dia, como vai?',
  'Oi! Tudo em ordem?',
  'E aí, como você está?',
  'Oi! Tem um minutinho?',
  'Olá! Tudo na paz?',
  'Bom dia! Tudo bem?',
  'Boa noite! Como foi seu dia?',
];

const RESPONSES = [
  'Oi! Tudo ótimo aqui, obrigado! E você?',
  'Olá! Estou bem sim, e você?',
  'Tudo certo! E por aí?',
  'Oi! Tudo bem sim! 😊',
  'Estou bem! Obrigado por perguntar!',
  'Tudo ótimo! E você, como está?',
  'Oi! Pode sim, fico no aguardo! 👍',
  'Estou bem, obrigado! E você?',
  'Tudo bem por aqui! 😄',
  'Olá! Tudo tranquilo sim!',
  'Oi! Que bom te ver! Tudo certo aqui.',
  'Sim, tudo ótimo! E aí, como você está?',
  'Tudo bem! Obrigado! 🙂',
  'Oi! Estou ótimo, valeu! E você?',
  'Pode ligar sim! Estarei por aqui.',
  'Tudo certo! 👍',
  'Estou bem sim, obrigado por perguntar!',
  'Olá! Tudo na paz por aqui!',
  'Foi ótimo, obrigado! E o seu?',
  'Estou sim, pode falar!',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Serviço principal ────────────────────────────────────────────────────────

class WarmupService {
  constructor() {
    this.timer = null;
  }

  start() {
    console.log('[Warmup] serviço iniciado');
    this._scheduleNext();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
  }

  _scheduleNext() {
    // Intervalo aleatório entre 4 e 9 minutos para não parecer automático
    const delay = (4 + Math.random() * 5) * 60 * 1000;
    this.timer = setTimeout(() => this._tick(), delay);
  }

  async _tick() {
    try {
      await this._processAll();
    } catch (err) {
      console.error('[Warmup] erro no tick:', err.message);
    } finally {
      this._scheduleNext();
    }
  }

  async _processAll() {
    const configs = await WarmupConfig.findAll({ where: { enabled: true } });
    for (const config of configs) {
      await this._processUser(config).catch((e) =>
        console.error(`[Warmup] erro para user ${config.user_id}:`, e.message)
      );
    }
  }

  async _processUser(config) {
    const hour = new Date().getHours();
    if (hour < config.start_hour || hour >= config.end_hour) return;

    // Verifica cota diária
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sentToday = await WarmupLog.count({
      where: { user_id: config.user_id, sent_at: { [Op.gte]: startOfDay } },
    });
    if (sentToday >= config.messages_per_day) return;

    // Contas conectadas com número identificado (filtra pelas selecionadas se houver)
    const selectedIds = config.account_ids || [];
    const where = { user_id: config.user_id };
    if (selectedIds.length) where.id = selectedIds;
    const accounts = await WhatsappAccount.findAll({ where });
    const connected = accounts.filter((a) => whatsapp.getStatus(a.id) === 'connected' && a.phone);

    if (connected.length < 2) {
      console.log(`[Warmup] user ${config.user_id}: menos de 2 contas conectadas com número, pulando`);
      return;
    }

    // Escolhe remetente e destinatário aleatórios
    const shuffled = [...connected].sort(() => Math.random() - 0.5);
    const sender = shuffled[0];
    const receiver = shuffled[1];

    const initMsg = pick(INITIATORS);
    await whatsapp.sendText(sender.id, receiver.phone, initMsg);
    await WarmupLog.create({
      user_id: config.user_id,
      from_account_id: sender.id,
      to_account_id: receiver.id,
      from_label: sender.label,
      to_label: receiver.label,
      message: initMsg,
    });

    console.log(`[Warmup] ${sender.label} → ${receiver.label}: "${initMsg}"`);

    // Resposta após 15–90 segundos
    if (sentToday + 1 < config.messages_per_day) {
      const replyDelay = (15 + Math.random() * 75) * 1000;
      setTimeout(async () => {
        try {
          const replyMsg = pick(RESPONSES);
          await whatsapp.sendText(receiver.id, sender.phone, replyMsg);
          await WarmupLog.create({
            user_id: config.user_id,
            from_account_id: receiver.id,
            to_account_id: sender.id,
            from_label: receiver.label,
            to_label: sender.label,
            message: replyMsg,
          });
          console.log(`[Warmup] ${receiver.label} → ${sender.label}: "${replyMsg}"`);
        } catch (e) {
          console.error('[Warmup] erro na resposta:', e.message);
        }
      }, replyDelay);
    }
  }

  // Chamado externamente para forçar um ciclo imediato (ex: ao ativar)
  async runNow(userId) {
    const config = await WarmupConfig.findOne({ where: { user_id: userId, enabled: true } });
    if (config) await this._processUser(config);
  }

  async getStats(userId) {
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(); startOfWeek.setDate(startOfWeek.getDate() - 7); startOfWeek.setHours(0, 0, 0, 0);

    const [today, week, recent] = await Promise.all([
      WarmupLog.count({ where: { user_id: userId, sent_at: { [Op.gte]: startOfDay } } }),
      WarmupLog.count({ where: { user_id: userId, sent_at: { [Op.gte]: startOfWeek } } }),
      WarmupLog.findAll({
        where: { user_id: userId },
        order: [['sent_at', 'DESC']],
        limit: 20,
      }),
    ]);

    return { today, week, recent };
  }
}

module.exports = new WarmupService();

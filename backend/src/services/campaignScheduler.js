// Agendador de campanhas WhatsApp — única forma de (re)agendar mensagens de campanha.
// O plano fica gravado em messages.scheduled_for e segue três regras:
//  1. Nenhuma mensagem sai antes do horário planejado (exceto quando o usuário antecipa um lote).
//  2. Intervalo mínimo entre mensagens da campanha = delay_ms com variação de ±30%.
//  3. Campanhas em lotes: no máximo batch_size envios em qualquer janela de batch_interval_hours.
// Mensagens atrasadas (restart, app offline, pausa, chip removido) são redistribuídas a partir
// de agora respeitando essas regras — nunca disparam todas de uma vez.

const { jitter, enqueueAt, cancelJob } = require('./queueService');

const ACTIVE_STATUSES = ['running', 'scheduled'];

function toMs(d) {
  return d ? new Date(d).getTime() : null;
}

function batchSettings(campaign) {
  const size = campaign.batch_mode && campaign.batch_size > 0 ? Number(campaign.batch_size) : null;
  const intervalMs = (Number(campaign.batch_interval_hours) || 8) * 3_600_000;
  return { size, intervalMs };
}

function pendingOrder(a, b) {
  const ba = a.batch_index ?? 0;
  const bb = b.batch_index ?? 0;
  if (ba !== bb) return ba - bb;
  const ta = toMs(a.scheduled_for) ?? Number.MAX_SAFE_INTEGER;
  const tb = toMs(b.scheduled_for) ?? Number.MAX_SAFE_INTEGER;
  if (ta !== tb) return ta - tb;
  return String(a.id).localeCompare(String(b.id));
}

// Núcleo puro do agendamento: devolve Map(messageId → horário em ms) para cada mensagem 'queued'.
function planSchedule({ messages, delayMs, batchSize = null, batchIntervalMs = 0, startAt, sendNowBatch = null, rand = jitter }) {
  const minGap = Math.round(delayMs * 0.7);
  const times = messages
    .filter((m) => (m.status === 'sent' || m.status === 'delivered') && m.sent_at)
    .map((m) => toMs(m.sent_at))
    .sort((a, b) => a - b);
  let last = times.length ? times[times.length - 1] : null;

  const pending = messages
    .filter((m) => m.status === 'queued')
    .map((m) => (batchSize ? m : { ...m, batch_index: 0 }))
    .sort(pendingOrder);

  const plan = new Map();
  for (const m of pending) {
    const forced = sendNowBatch != null && (m.batch_index ?? 0) === sendNowBatch;
    let t = forced ? startAt : Math.max(startAt, toMs(m.scheduled_for) ?? startAt);
    if (last != null && t < last + minGap) t = last + rand(delayMs);
    if (batchSize && !forced && times.length >= batchSize) {
      t = Math.max(t, times[times.length - batchSize] + batchIntervalMs);
    }
    times.push(t);
    last = t;
    plan.set(m.id, t);
  }
  return plan;
}

// Atualiza uma coluna de várias mensagens numa única query (column/sqlType são constantes internas)
async function bulkUpdate(column, sqlType, pairs) {
  if (!pairs.length) return;
  const { sequelize } = require('../models');
  for (let i = 0; i < pairs.length; i += 500) {
    const chunk = pairs.slice(i, i + 500);
    await sequelize.query(
      `UPDATE messages AS m SET ${column} = v.val
         FROM (SELECT unnest(ARRAY[:ids]::uuid[]) AS id, unnest(ARRAY[:vals]::${sqlType}[]) AS val) AS v
        WHERE m.id = v.id`,
      { replacements: { ids: chunk.map((p) => p[0]), vals: chunk.map((p) => p[1]) } }
    );
  }
}

// Campanhas criadas antes do batch_index existir: reconstrói o lote de cada mensagem pela
// ordem original de envio (scheduled_for gravado na criação) e grava para ficar estável.
async function ensureBatchIndexes(campaign, messages) {
  const { size } = batchSettings(campaign);
  if (!size || messages.every((m) => m.batch_index != null)) return;
  const ranked = [...messages].sort((a, b) => {
    const ta = toMs(a.scheduled_for) ?? Number.MAX_SAFE_INTEGER;
    const tb = toMs(b.scheduled_for) ?? Number.MAX_SAFE_INTEGER;
    if (ta !== tb) return ta - tb;
    const ca = toMs(a.createdAt) ?? 0;
    const cb = toMs(b.createdAt) ?? 0;
    if (ca !== cb) return ca - cb;
    return String(a.id).localeCompare(String(b.id));
  });
  const updates = [];
  ranked.forEach((m, i) => {
    if (m.batch_index == null) {
      m.batch_index = Math.floor(i / size);
      updates.push([m.id, m.batch_index]);
    }
  });
  await bulkUpdate('batch_index', 'int', updates);
}

// Serializa replanejamentos da mesma campanha (startup, adiamento e ações do usuário podem coincidir)
const _locks = new Map();
function withCampaignLock(campaignId, fn) {
  const prev = _locks.get(campaignId) || Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.catch(() => {});
  _locks.set(campaignId, tail);
  tail.then(() => { if (_locks.get(campaignId) === tail) _locks.delete(campaignId); });
  return run;
}

async function _reschedule(campaignId, { graceMs = 0, sendNowBatch = null }) {
  const { Campaign, Message } = require('../models');
  const campaign = await Campaign.findByPk(campaignId);
  if (!campaign || !ACTIVE_STATUSES.includes(campaign.status)) return { scheduled: 0, firstAt: null };

  const messages = await Message.findAll({
    where: { campaign_id: campaign.id },
    attributes: ['id', 'user_id', 'status', 'scheduled_for', 'sent_at', 'batch_index', 'createdAt'],
  });
  await ensureBatchIndexes(campaign, messages);

  let startAt = Date.now() + graceMs;
  if (campaign.status === 'scheduled' && campaign.scheduled_for) {
    startAt = Math.max(startAt, toMs(campaign.scheduled_for));
  }
  const { size, intervalMs } = batchSettings(campaign);
  const plan = planSchedule({
    messages: messages.map((m) => ({
      id: m.id, status: m.status, scheduled_for: m.scheduled_for, sent_at: m.sent_at, batch_index: m.batch_index,
    })),
    delayMs: campaign.delay_ms || 5000,
    batchSize: size,
    batchIntervalMs: intervalMs,
    startAt,
    sendNowBatch,
  });

  const changed = [];
  let firstAt = null;
  for (const m of messages) {
    const t = plan.get(m.id);
    if (t == null) continue;
    if (firstAt == null || t < firstAt) firstAt = t;
    if (Math.abs((toMs(m.scheduled_for) ?? 0) - t) > 1000) changed.push([m.id, new Date(t).toISOString()]);
  }
  await bulkUpdate('scheduled_for', 'timestamptz', changed);
  for (const m of messages) {
    const t = plan.get(m.id);
    if (t != null) enqueueAt(m.id, m.user_id, t);
  }
  return { scheduled: plan.size, firstAt: firstAt != null ? new Date(firstAt) : null };
}

function rescheduleCampaign(campaignId, opts = {}) {
  return withCampaignLock(campaignId, () => _reschedule(campaignId, opts));
}

// Cancela os disparos agendados de mensagens (o status no banco não muda)
function cancelMessages(messages) {
  for (const m of messages) cancelJob(m.id);
}

// Distribui as mensagens pendentes entre os números da campanha, trocando a cada rotate_every
async function redistributeAccounts(campaign) {
  const { Message } = require('../models');
  const accountIds = Array.isArray(campaign.account_ids) ? campaign.account_ids : [];
  if (!accountIds.length) return 0;
  const pending = await Message.findAll({
    where: { campaign_id: campaign.id, status: 'queued' },
    attributes: ['id', 'account_id', 'scheduled_for', 'batch_index'],
  });
  pending.sort(pendingOrder);
  const rotate = Math.max(1, campaign.rotate_every || 1);
  const updates = [];
  pending.forEach((m, i) => {
    const acc = accountIds[Math.floor(i / rotate) % accountIds.length];
    if (m.account_id !== acc) updates.push([m.id, acc]);
  });
  await bulkUpdate('account_id', 'uuid', updates);
  return pending.length;
}

// Replaneja todas as campanhas ativas com mensagens na fila (usado no startup do servidor)
async function rescheduleActiveCampaigns({ graceMs }) {
  const { Message, Campaign } = require('../models');
  const { Op } = require('sequelize');
  const rows = await Message.findAll({
    where: { status: 'queued', campaign_id: { [Op.ne]: null } },
    attributes: ['campaign_id'],
    group: ['campaign_id'],
    raw: true,
  });
  const campaigns = await Campaign.findAll({
    where: { id: rows.map((r) => r.campaign_id), status: ACTIVE_STATUSES },
    attributes: ['id'],
  });
  let total = 0;
  for (const c of campaigns) {
    try {
      const r = await rescheduleCampaign(c.id, { graceMs });
      total += r.scheduled;
    } catch (e) {
      console.error(`[Scheduler] falha ao replanejar campanha ${c.id}:`, e.message);
    }
  }
  return { campaigns: campaigns.length, messages: total };
}

// Avisos por campanha exibidos na tela (por que não está enviando / por que pausou)
const _notices = new Map(); // campaignId → { text, at }
function setNotice(campaignId, text) {
  _notices.set(campaignId, { text, at: new Date().toISOString() });
}
function clearNotice(campaignId) {
  _notices.delete(campaignId);
}
function getNotice(campaignId) {
  return _notices.get(campaignId) || null;
}

// Condição passageira (app fechado, chip reconectando): mantém tudo na fila e empurra o plano
function deferCampaign(campaignId, delayMs, reason) {
  if (reason) setNotice(campaignId, reason);
  return rescheduleCampaign(campaignId, { graceMs: delayMs }).catch((e) =>
    console.error(`[Scheduler] falha ao adiar campanha ${campaignId}:`, e.message)
  );
}

// Resumo por lote para a tela da campanha
function summarizeBatches(campaign, messages) {
  const { size } = batchSettings(campaign);
  if (!size) return null;
  const map = new Map();
  for (const m of messages) {
    const b = m.batch_index ?? 0;
    if (!map.has(b)) {
      map.set(b, { index: b, total: 0, sent: 0, delivered: 0, failed: 0, queued: 0, nextAt: null, lastAt: null, firstSentAt: null, lastSentAt: null });
    }
    const s = map.get(b);
    s.total++;
    if (m.status === 'queued') {
      s.queued++;
      const t = toMs(m.scheduled_for);
      if (t != null) {
        s.nextAt = s.nextAt == null ? t : Math.min(s.nextAt, t);
        s.lastAt = s.lastAt == null ? t : Math.max(s.lastAt, t);
      }
    } else if (m.status === 'sent' || m.status === 'delivered') {
      s[m.status]++;
      const t = toMs(m.sent_at);
      if (t != null) {
        s.firstSentAt = s.firstSentAt == null ? t : Math.min(s.firstSentAt, t);
        s.lastSentAt = s.lastSentAt == null ? t : Math.max(s.lastSentAt, t);
      }
    } else if (m.status === 'failed') {
      s.failed++;
    }
  }
  const iso = (t) => (t == null ? null : new Date(t).toISOString());
  return [...map.values()]
    .sort((a, b) => a.index - b.index)
    .map((s) => ({ ...s, nextAt: iso(s.nextAt), lastAt: iso(s.lastAt), firstSentAt: iso(s.firstSentAt), lastSentAt: iso(s.lastSentAt) }));
}

// Quantas mensagens cada número enviou/tem na fila nesta campanha
function summarizeAccounts(messages) {
  const map = new Map();
  for (const m of messages) {
    if (!m.account_id) continue;
    if (!map.has(m.account_id)) map.set(m.account_id, { account_id: m.account_id, sent: 0, delivered: 0, failed: 0, queued: 0 });
    const s = map.get(m.account_id);
    if (s[m.status] !== undefined) s[m.status]++;
  }
  return [...map.values()];
}

module.exports = {
  planSchedule,
  rescheduleCampaign,
  rescheduleActiveCampaigns,
  deferCampaign,
  redistributeAccounts,
  cancelMessages,
  ensureBatchIndexes,
  summarizeBatches,
  summarizeAccounts,
  setNotice,
  clearNotice,
  getNotice,
  ACTIVE_STATUSES,
};

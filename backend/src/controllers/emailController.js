const { Op } = require('sequelize');
const { EmailCampaign, EmailMessage, Contact } = require('../models');
const { enqueueEmail } = require('../services/emailQueueService');

// ── Campaigns ─────────────────────────────────────────────────────────────────

async function listCampaigns(req, res, next) {
  try {
    const campaigns = await EmailCampaign.findAll({
      where: { user_id: req.user.id },
      order: [['created_at', 'DESC']],
    });
    res.json(campaigns);
  } catch (e) { next(e); }
}

async function getCampaign(req, res, next) {
  try {
    const campaign = await EmailCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    res.json(campaign);
  } catch (e) { next(e); }
}

async function createCampaign(req, res, next) {
  try {
    const { name, subject, from_name, html_body, delay_ms } = req.body;
    if (!name || !subject || !html_body) return res.status(400).json({ error: 'name, subject e html_body são obrigatórios' });
    const campaign = await EmailCampaign.create({
      user_id: req.user.id, name, subject, from_name, html_body,
      delay_ms: delay_ms ?? 1000,
    });
    res.status(201).json(campaign);
  } catch (e) { next(e); }
}

async function updateCampaign(req, res, next) {
  try {
    const campaign = await EmailCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    if (campaign.status !== 'draft') return res.status(400).json({ error: 'Só campanhas em rascunho podem ser editadas' });
    const { name, subject, from_name, html_body, delay_ms } = req.body;
    await campaign.update({ name, subject, from_name, html_body, delay_ms });
    res.json(campaign);
  } catch (e) { next(e); }
}

async function deleteCampaign(req, res, next) {
  try {
    const campaign = await EmailCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    if (campaign.status === 'running') return res.status(400).json({ error: 'Não é possível excluir campanha em andamento' });
    await EmailMessage.destroy({ where: { campaign_id: campaign.id } });
    await campaign.destroy();
    res.json({ ok: true });
  } catch (e) { next(e); }
}

async function sendCampaign(req, res, next) {
  try {
    const campaign = await EmailCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return res.status(400).json({ error: 'Campanha já foi enviada ou está em andamento' });
    }

    const { scheduled_for, tag_filter } = req.body;

    // Build contact list
    const where = { user_id: req.user.id, email_opt_out: false, email: { [Op.and]: [{ [Op.not]: null }, { [Op.ne]: '' }] } };
    if (tag_filter) where.tags = { [Op.contains]: [tag_filter] };

    const contacts = await Contact.findAll({ where, attributes: ['id', 'name', 'email'] });
    if (contacts.length === 0) return res.status(400).json({ error: 'Nenhum contato com email válido encontrado' });

    const scheduledAt = scheduled_for ? new Date(scheduled_for) : null;
    const startOffset = scheduledAt ? Math.max(0, scheduledAt.getTime() - Date.now()) : 0;

    await campaign.update({
      status: scheduledAt ? 'scheduled' : 'running',
      scheduled_for: scheduledAt,
      total_contacts: contacts.length,
      sent_count: 0,
      failed_count: 0,
      open_count: 0,
      tag_filter: tag_filter || null,
    });

    // Create EmailMessage records and enqueue
    for (let i = 0; i < contacts.length; i++) {
      const c = contacts[i];
      const msg = await EmailMessage.create({
        campaign_id: campaign.id,
        user_id: req.user.id,
        contact_id: c.id,
        to_email: c.email,
        to_name: c.name,
        status: 'queued',
      });
      const delayMs = startOffset + i * (campaign.delay_ms ?? 1000);
      const jobId = await enqueueEmail(msg.id, delayMs);
      await msg.update({ queue_job_id: String(jobId) });
    }

    res.json({ ok: true, total: contacts.length });
  } catch (e) { next(e); }
}

async function getCampaignStats(req, res, next) {
  try {
    const campaign = await EmailCampaign.findOne({ where: { id: req.params.id, user_id: req.user.id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });
    const messages = await EmailMessage.findAll({
      where: { campaign_id: campaign.id },
      attributes: ['status', 'to_email', 'to_name', 'sent_at', 'opened_at', 'error_message'],
      order: [['created_at', 'ASC']],
    });
    res.json({ campaign, messages });
  } catch (e) { next(e); }
}

// ── Public tracking ──────────────────────────────────────────────────────────

const PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'
);

async function trackOpen(req, res) {
  try {
    const msg = await EmailMessage.findByPk(req.params.id);
    if (msg && !msg.opened_at) {
      await msg.update({ status: 'opened', opened_at: new Date() });
      await EmailCampaign.increment('open_count', { where: { id: msg.campaign_id } });
    }
  } catch {}
  res.set('Content-Type', 'image/gif').set('Cache-Control', 'no-store').send(PIXEL);
}

async function unsubscribe(req, res) {
  try {
    const msg = await EmailMessage.findOne({ where: { unsubscribe_token: req.params.token } });
    if (msg) {
      await Contact.update({ email_opt_out: true }, { where: { id: msg.contact_id } });
    }
  } catch {}
  res.set('Content-Type', 'text/html').send(`<!DOCTYPE html><html><body style="font-family:sans-serif;text-align:center;padding:60px 20px">
    <h2 style="color:#111">Inscrição cancelada</h2>
    <p style="color:#6b7280">Você não receberá mais emails desta lista.</p>
    <p style="margin-top:32px"><a href="https://clicaai.ia.br" style="color:#16a34a">Voltar para o Clica Aí</a></p>
  </body></html>`);
}

module.exports = { listCampaigns, getCampaign, createCampaign, updateCampaign, deleteCampaign, sendCampaign, getCampaignStats, trackOpen, unsubscribe };

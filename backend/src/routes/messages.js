const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/messageController');

router.get('/', ctrl.history);

router.post('/send', [
  body('contact_id').isUUID(),
  body('content').notEmpty().trim(),
], ctrl.sendSingle);

router.post('/campaign', [
  body('name').notEmpty().trim(),
  body('message_template').notEmpty().trim(),
  body('contact_ids').optional().isArray(),
  body('contact_ids.*').optional().isUUID(),
  body('tags').optional().isArray(),
  body('delay_ms').optional().isInt({ min: 1000 }),
  body('batch_mode').optional().isBoolean(),
  body('batch_size').optional().isInt({ min: 1, max: 500 }),
  body('batch_interval_hours').optional().isFloat({ min: 0.5, max: 168 }),
  body('exclude_contacted').optional().isBoolean(),
], ctrl.sendCampaign);

module.exports = router;

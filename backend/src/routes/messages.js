const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/messageController');

router.get('/', ctrl.history);
router.get('/scheduled', ctrl.listScheduled);
router.delete('/:id/cancel', ctrl.cancelScheduled);

router.post('/send', [
  body('contact_id').isUUID(),
  body('content').notEmpty().trim(),
], ctrl.sendSingle);

router.post('/schedule', [
  body('contact_id').isUUID(),
  body('content').notEmpty().trim(),
  body('scheduled_for').isISO8601().withMessage('Data/hora inválida'),
  body('account_id').optional().isUUID(),
], ctrl.scheduleMessage);

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

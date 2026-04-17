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
  body('contact_ids').isArray({ min: 1 }),
  body('contact_ids.*').isUUID(),
  body('delay_ms').optional().isInt({ min: 1000 }),
], ctrl.sendCampaign);

module.exports = router;

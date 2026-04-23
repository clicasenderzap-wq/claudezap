const router = require('express').Router();
const ctrl = require('../controllers/botController');
const { requireProBot } = require('../middleware/planGuard');

router.use(requireProBot);

router.get('/stats', ctrl.getMonthlyStats);
router.get('/accounts/:accountId/config', ctrl.getConfig);
router.put('/accounts/:accountId/config', ctrl.updateConfig);
router.get('/accounts/:accountId/conversations', ctrl.getConversations);
router.put('/conversations/:id/close', ctrl.closeConversation);
router.put('/conversations/:id/reopen', ctrl.reopenConversation);

module.exports = router;

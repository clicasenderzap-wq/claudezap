const router = require('express').Router();
const ctrl = require('../controllers/campaignController');

router.get('/', ctrl.list);
router.get('/:id/messages', ctrl.messages);
router.get('/:id/summary', ctrl.summary);
router.post('/:id/resend', ctrl.resend);
router.post('/:id/pause', ctrl.pause);
router.post('/:id/resume', ctrl.resume);
router.post('/:id/resend-failed', ctrl.resendFailed);
router.post('/:id/retry-undelivered', ctrl.retryUndelivered);
router.post('/:id/force-status', ctrl.forceStatus);
router.post('/:id/remove-account', ctrl.removeAccount);
router.post('/:id/add-account', ctrl.addAccount);
router.post('/:id/send-batch-now', ctrl.sendBatchNow);
router.delete('/:id', ctrl.remove);

module.exports = router;

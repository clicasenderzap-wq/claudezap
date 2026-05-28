const router = require('express').Router();
const ctrl = require('../controllers/emailController');

// static routes must come before /:id to avoid being captured as an id param
router.get('/recipient-count',           ctrl.getRecipientCount);
router.get('/unsubscribed',              ctrl.listUnsubscribed);
router.post('/resubscribe/:contactId',   ctrl.resubscribeContact);
router.get('/',                          ctrl.listCampaigns);
router.post('/',                         ctrl.createCampaign);
router.get('/:id',                       ctrl.getCampaign);
router.put('/:id',                       ctrl.updateCampaign);
router.delete('/:id',                    ctrl.deleteCampaign);
router.post('/:id/send',                 ctrl.sendCampaign);
router.get('/:id/stats',                 ctrl.getCampaignStats);
router.post('/:id/test',                 ctrl.testCampaign);
router.post('/:id/duplicate',            ctrl.duplicateCampaign);
router.post('/:id/cancel',               ctrl.cancelCampaign);
router.post('/:id/resend-unopened',      ctrl.resendUnopened);

module.exports = router;

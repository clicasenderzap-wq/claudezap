const router = require('express').Router();
const ctrl = require('../controllers/emailController');

router.get('/',              ctrl.listCampaigns);
router.post('/',             ctrl.createCampaign);
router.get('/:id',           ctrl.getCampaign);
router.put('/:id',           ctrl.updateCampaign);
router.delete('/:id',        ctrl.deleteCampaign);
router.post('/:id/send',     ctrl.sendCampaign);
router.get('/:id/stats',     ctrl.getCampaignStats);

module.exports = router;

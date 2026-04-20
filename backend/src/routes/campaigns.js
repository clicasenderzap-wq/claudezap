const router = require('express').Router();
const ctrl = require('../controllers/campaignController');

router.get('/', ctrl.list);
router.post('/:id/resend', ctrl.resend);
router.delete('/:id', ctrl.remove);

module.exports = router;

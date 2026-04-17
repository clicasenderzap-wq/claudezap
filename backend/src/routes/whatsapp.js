const router = require('express').Router();
const ctrl = require('../controllers/whatsappController');

router.get('/qr', ctrl.getQR);
router.get('/status', ctrl.getStatus);
router.delete('/session', ctrl.disconnect);

module.exports = router;

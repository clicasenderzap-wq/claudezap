const router = require('express').Router();
const accounts = require('../controllers/whatsappAccountController');

// Multi-account routes
router.get('/accounts', accounts.list);
router.post('/accounts', accounts.create);
router.put('/accounts/:id', accounts.updateLabel);
router.get('/accounts/:id/qr', accounts.getQR);
router.post('/accounts/:id/pairing-code', accounts.requestPairingCode);
router.delete('/accounts/:id', accounts.remove);
router.get('/inbox', accounts.inbox);
router.get('/desktop-status', accounts.desktopStatus);
router.get('/inbox/optout-count', accounts.optoutCount);

module.exports = router;

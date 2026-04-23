const router = require('express').Router();
const accounts = require('../controllers/whatsappAccountController');

// Multi-account routes
router.get('/accounts', accounts.list);
router.post('/accounts', accounts.create);
router.put('/accounts/:id', accounts.updateLabel);
router.get('/accounts/:id/qr', accounts.getQR);
router.delete('/accounts/:id', accounts.remove);
router.get('/inbox', accounts.inbox);

module.exports = router;

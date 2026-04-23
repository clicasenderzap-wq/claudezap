const router = require('express').Router();
const { requireAdmin } = require('../middleware/planGuard');
const ctrl = require('../controllers/adminController');

router.use(requireAdmin);

router.get('/users', ctrl.listUsers);
router.get('/users/:id', ctrl.getUser);
router.put('/users/:id', ctrl.updateUser);
router.post('/users/:id/approve', ctrl.approveUser);
router.post('/users/:id/reject', ctrl.rejectUser);
router.get('/stats', ctrl.getStats);

router.get('/whatsapp-accounts', ctrl.listWhatsappAccounts);
router.post('/whatsapp-accounts/:id/disconnect', ctrl.disconnectWhatsappAccount);
router.delete('/whatsapp-accounts/:id', ctrl.removeWhatsappAccount);

module.exports = router;

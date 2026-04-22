const router = require('express').Router();
const { requireAdmin } = require('../middleware/planGuard');
const ctrl = require('../controllers/adminController');

router.use(requireAdmin);

router.get('/users', ctrl.listUsers);
router.get('/users/:id', ctrl.getUser);
router.put('/users/:id', ctrl.updateUser);
router.get('/stats', ctrl.getStats);

module.exports = router;

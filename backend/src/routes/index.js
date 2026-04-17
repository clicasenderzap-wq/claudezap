const router = require('express').Router();
const auth = require('../middleware/auth');

router.use('/auth', require('./auth'));
router.use('/contacts', auth, require('./contacts'));
router.use('/messages', auth, require('./messages'));
router.use('/whatsapp', auth, require('./whatsapp'));
router.use('/dashboard', auth, require('./dashboard'));

module.exports = router;

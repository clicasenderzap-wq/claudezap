const router = require('express').Router();
const auth = require('../middleware/auth');

router.use('/auth', require('./auth'));
router.use('/contacts', auth, require('./contacts'));
router.use('/messages', auth, require('./messages'));
router.use('/campaigns', auth, require('./campaigns'));
router.use('/whatsapp', auth, require('./whatsapp'));
router.use('/dashboard', auth, require('./dashboard'));
router.use('/warmup', auth, require('./warmup'));

module.exports = router;

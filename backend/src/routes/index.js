const router = require('express').Router();
const auth = require('../middleware/auth');
const optin = require('../controllers/optinController');

router.get('/optin/:userId', optin.getOptinInfo);
router.post('/optin/:userId', optin.submitOptin);

router.use('/auth', require('./auth'));
router.use('/contacts', auth, require('./contacts'));
router.use('/messages', auth, require('./messages'));
router.use('/campaigns', auth, require('./campaigns'));
router.use('/whatsapp', auth, require('./whatsapp'));
router.use('/dashboard', auth, require('./dashboard'));
router.use('/warmup', auth, require('./warmup'));
router.use('/bot', auth, require('./bot'));
router.use('/admin', auth, require('./admin'));

module.exports = router;

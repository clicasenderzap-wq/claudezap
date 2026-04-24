const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const { requireActive } = require('../middleware/planGuard');
const optin = require('../controllers/optinController');

const optinLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  keyGenerator: (req) => req.params.userId || req.ip,
  message: { error: 'Muitas submissões para este link. Tente novamente mais tarde.' },
});

router.get('/optin/:userId', optin.getOptinInfo);
router.post('/optin/:userId', optinLimiter, optin.submitOptin);

router.use('/auth', require('./auth'));
router.use('/contacts', auth, requireActive, require('./contacts'));
router.use('/messages', auth, requireActive, require('./messages'));
router.use('/campaigns', auth, requireActive, require('./campaigns'));
router.use('/whatsapp', auth, requireActive, require('./whatsapp'));
router.use('/dashboard', auth, requireActive, require('./dashboard'));
router.use('/warmup', auth, requireActive, require('./warmup'));
router.use('/bot', auth, requireActive, require('./bot'));
router.use('/admin', auth, require('./admin'));
router.use('/media', auth, requireActive, require('./media'));
router.use('/webhooks', require('./webhooks'));

module.exports = router;

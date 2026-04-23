const router = require('express').Router();
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/authController');
const auth = require('../middleware/auth');

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de cadastro. Tente novamente em 1 hora.' },
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos.' },
});

router.post('/register', registerLimiter, [
  body('name').notEmpty().trim().withMessage('Nome obrigatório'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').isLength({ min: 8 }).withMessage('Senha deve ter no mínimo 8 caracteres'),
  body('whatsapp')
    .notEmpty().withMessage('WhatsApp obrigatório')
    .matches(/^\+?[\d\s\-().]{10,20}$/).withMessage('Número de WhatsApp inválido'),
], ctrl.register);

router.post('/login', loginLimiter, [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], ctrl.login);

router.get('/verify-email', ctrl.verifyEmail);

router.post('/resend-verification', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Muitas tentativas. Aguarde 15 minutos.' },
}), ctrl.resendVerification);

router.get('/me', auth, ctrl.me);

module.exports = router;

const router = require('express').Router();
const ctrl = require('../controllers/warmupController');

router.get('/', ctrl.getConfig);
router.put('/', ctrl.updateConfig);
router.get('/stats', ctrl.getStats);

module.exports = router;

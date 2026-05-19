const router = require('express').Router();
const ctrl = require('../controllers/optoutController');

router.get('/', ctrl.list);
router.get('/stats', ctrl.stats);
router.post('/', ctrl.add);
router.delete('/:id', ctrl.remove);

module.exports = router;

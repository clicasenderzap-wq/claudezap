const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/contactController');
const upload = require('../middleware/upload');

router.get('/', ctrl.list);
router.post('/', [
  body('name').notEmpty().trim(),
  body('phone').notEmpty().trim(),
], ctrl.create);
router.put('/:id', [
  body('name').optional().notEmpty().trim(),
  body('phone').optional().notEmpty().trim(),
], ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/import', upload.single('file'), ctrl.importCSV);

module.exports = router;

const router = require('express').Router();
const multer = require('multer');
const ctrl = require('../controllers/mediaController');

// Store in memory (buffer) — will be streamed to R2
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB hard cap
});

router.post('/upload', upload.single('file'), ctrl.upload);

module.exports = router;

const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const allowed = ['.csv', '.xlsx', '.xls'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('Apenas arquivos CSV ou Excel (.xlsx, .xls) são permitidos'));
    }
    cb(null, true);
  },
});

module.exports = upload;

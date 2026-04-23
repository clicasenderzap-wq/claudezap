const storage = require('../services/storageService');

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'video/mp4',
  'audio/mpeg', 'audio/ogg', 'audio/mp4',
]);

// WhatsApp limits per type (bytes)
const SIZE_LIMITS = {
  image: 16 * 1024 * 1024,
  video: 16 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
  document: 100 * 1024 * 1024,
};

function getCategory(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
}

async function upload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' });

  const { mimetype, originalname, buffer, size } = req.file;

  if (!ALLOWED_MIME.has(mimetype)) {
    return res.status(400).json({ error: `Tipo de arquivo não suportado: ${mimetype}` });
  }

  const category = getCategory(mimetype);
  const limit = SIZE_LIMITS[category];
  if (size > limit) {
    const mb = Math.round(limit / 1024 / 1024);
    return res.status(400).json({ error: `Arquivo muito grande. Limite para ${category}: ${mb} MB` });
  }

  if (!storage.isConfigured()) {
    return res.status(503).json({ error: 'Armazenamento de mídia não configurado no servidor. Configure as variáveis R2_*.' });
  }

  try {
    const { url, key } = await storage.uploadFile(buffer, originalname, mimetype, req.user.id);
    res.json({
      url,
      key,
      name: originalname,
      type: mimetype,
      category,
      size,
    });
  } catch (err) {
    console.error('[Media] erro no upload:', err.message);
    res.status(500).json({ error: 'Erro ao fazer upload do arquivo. Tente novamente.' });
  }
}

module.exports = { upload };

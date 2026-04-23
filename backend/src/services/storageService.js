const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { randomUUID } = require('crypto');
const path = require('path');

// Cloudflare R2 credentials — set these env vars in your deployment
const R2_ACCOUNT_ID        = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID     = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET            = process.env.R2_BUCKET || 'claudezap-media';
// Public URL of your R2 bucket (configure in Cloudflare dashboard → R2 → Custom domain or r2.dev)
const R2_PUBLIC_URL        = process.env.R2_PUBLIC_URL;

let s3Client = null;

function getClient() {
  if (!s3Client) {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error('R2 não configurado. Defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID e R2_SECRET_ACCESS_KEY.');
    }
    s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

function isConfigured() {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_PUBLIC_URL);
}

async function uploadFile(buffer, originalName, mimetype, userId) {
  const ext = path.extname(originalName) || '';
  const key = `${userId}/${randomUUID()}${ext}`;

  await getClient().send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    Metadata: { originalName, userId },
  }));

  const url = `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`;
  return { url, key };
}

async function deleteFile(key) {
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
  } catch {
    // Non-fatal — log and continue
    console.warn('[Storage] falha ao deletar arquivo:', key);
  }
}

module.exports = { uploadFile, deleteFile, isConfigured };

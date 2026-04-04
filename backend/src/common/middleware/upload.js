import multer from 'multer';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsRootDir = path.join(__dirname, '../../uploads');
const cvUploadDir = path.join(uploadsRootDir, 'cv');
const healthUploadDir = path.join(uploadsRootDir, 'health');

mkdirSync(cvUploadDir, { recursive: true });
mkdirSync(healthUploadDir, { recursive: true });

const cvAllowedExtensions = new Set(['.pdf', '.doc', '.docx']);
const healthAllowedExtensions = new Set(['.pdf', '.doc', '.docx', '.png']);

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    cb(null, file.fieldname === 'healthFile' ? healthUploadDir : cvUploadDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${randomUUID()}${extension}`);
  }
});

function fileFilter(_req, file, cb) {
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = file.fieldname === 'healthFile' ? healthAllowedExtensions : cvAllowedExtensions;
  if (!allowedExtensions.has(extension)) {
    return cb(new Error(file.fieldname === 'healthFile'
      ? 'Only PDF, DOC, DOCX, PNG files are allowed for health documents.'
      : 'Only PDF, DOC, DOCX files are allowed.'));
  }
  return cb(null, true);
}

export const cvUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

export const applicationFilesUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

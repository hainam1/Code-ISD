import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const uploadsRoot = join(__dirname, '../../uploads/applications');

function sanitizeBaseName(fileName = 'file') {
  const extension = extname(fileName);
  const baseName = fileName.slice(0, Math.max(0, fileName.length - extension.length)) || 'file';
  return {
    extension: extension.toLowerCase(),
    baseName: baseName.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'file',
  };
}

export async function saveApplicationFile({ applicationId, fieldName, file }) {
  const { extension, baseName } = sanitizeBaseName(file.name || 'file');
  const candidateDir = join(uploadsRoot, applicationId);
  const storedFileName = `${fieldName}-${baseName}${extension}`;
  const absolutePath = join(candidateDir, storedFileName);

  await mkdir(candidateDir, { recursive: true });

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await writeFile(absolutePath, buffer);

  return {
    fileName: file.name || storedFileName,
    mimeType: file.type || 'application/octet-stream',
    size: file.size || buffer.byteLength,
    storedFileName,
    relativePath: join(applicationId, storedFileName),
  };
}

export async function readApplicationFile(relativePath) {
  const absolutePath = join(uploadsRoot, relativePath);
  return readFile(absolutePath);
}

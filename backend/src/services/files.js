import path from 'node:path';
import { getEnv } from '../config/env.js';
import { getSupabase } from '../config/supabase.js';

const AVATAR_BUCKET = 'avatars';
const APPLICATION_BUCKET = 'application-files';
const AVATAR_ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const APPLICATION_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
];

let avatarBucketReadyPromise;
let applicationBucketReadyPromise;

function sanitizeBaseName(fileName = 'file') {
  const extension = path.extname(fileName).toLowerCase();
  const baseName = fileName.slice(0, Math.max(0, fileName.length - extension.length)) || 'file';
  return {
    extension,
    baseName: baseName.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'file',
  };
}

function parseAvatarDataUrl(dataUrl) {
  const value = String(dataUrl || '').trim();
  const match = value.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);

  if (!match) {
    throw new Error('Anh dai dien khong hop le.');
  }

  return {
    mimeType: match[1],
    base64Payload: match[2],
  };
}

function assertSupabaseStorageAdminAccess() {
  const { supabaseServiceRoleKey } = getEnv();

  if (!supabaseServiceRoleKey) {
    throw new Error('Thieu SUPABASE_SERVICE_ROLE_KEY de luu file len Supabase Storage.');
  }

  if (supabaseServiceRoleKey.startsWith('sb_publishable_')) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY hien dang la publishable key. Hay thay bang secret/service-role key de quan ly Supabase Storage.',
    );
  }
}

async function ensureBucket({ bucketName, allowedMimeTypes, fileSizeLimit, publicBucket, cacheKey }) {
  assertSupabaseStorageAdminAccess();

  if (cacheKey.current) {
    return cacheKey.current;
  }

  cacheKey.current = (async () => {
    const supabase = getSupabase();
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Khong the doc bucket ${bucketName} tren Supabase: ${listError.message}`);
    }

    const existingBucket = (buckets || []).find(
      (bucket) => bucket.name === bucketName || bucket.id === bucketName,
    );

    if (!existingBucket) {
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: publicBucket,
        fileSizeLimit,
        allowedMimeTypes,
      });

      if (createError) {
        throw new Error(`Khong the tao bucket ${bucketName} tren Supabase: ${createError.message}`);
      }

      return;
    }

    const { error: updateError } = await supabase.storage.updateBucket(bucketName, {
      public: publicBucket,
      fileSizeLimit,
      allowedMimeTypes,
    });

    if (updateError) {
      throw new Error(`Khong the cap nhat bucket ${bucketName} tren Supabase: ${updateError.message}`);
    }
  })();

  try {
    await cacheKey.current;
  } catch (error) {
    cacheKey.current = undefined;
    throw error;
  }
}

async function ensureAvatarBucket() {
  await ensureBucket({
    bucketName: AVATAR_BUCKET,
    allowedMimeTypes: AVATAR_ALLOWED_MIME_TYPES,
    fileSizeLimit: '2MB',
    publicBucket: true,
    cacheKey: {
      get current() {
        return avatarBucketReadyPromise;
      },
      set current(value) {
        avatarBucketReadyPromise = value;
      },
    },
  });
}

async function ensureApplicationBucket() {
  await ensureBucket({
    bucketName: APPLICATION_BUCKET,
    allowedMimeTypes: APPLICATION_ALLOWED_MIME_TYPES,
    fileSizeLimit: '5MB',
    publicBucket: false,
    cacheKey: {
      get current() {
        return applicationBucketReadyPromise;
      },
      set current(value) {
        applicationBucketReadyPromise = value;
      },
    },
  });
}

export async function saveApplicationBuffer({ applicationId, fieldName, file }) {
  const { extension, baseName } = sanitizeBaseName(file.originalname || 'file');
  const storedFileName = `${fieldName}-${baseName}${extension}`;
  const relativePath = path.posix.join(applicationId, storedFileName);

  await ensureApplicationBucket();

  const supabase = getSupabase();
  const { error: uploadError } = await supabase.storage
    .from(APPLICATION_BUCKET)
    .upload(relativePath, file.buffer, {
      contentType: file.mimetype || 'application/octet-stream',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Khong the tai file ung tuyen len Supabase: ${uploadError.message}`);
  }

  return {
    fileName: file.originalname || storedFileName,
    mimeType: file.mimetype || 'application/octet-stream',
    size: file.size || file.buffer.byteLength,
    storedFileName,
    relativePath,
  };
}

export async function readApplicationFile(relativePath) {
  await ensureApplicationBucket();

  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(APPLICATION_BUCKET).download(relativePath);

  if (error) {
    throw new Error(`Khong the doc file ung tuyen tren Supabase: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function saveAvatarDataUrl({ userId, dataUrl }) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    throw new Error('Thieu userId de luu anh dai dien.');
  }

  const { mimeType, base64Payload } = parseAvatarDataUrl(dataUrl);
  const fileName = `avatar-${Date.now()}.webp`;
  const objectPath = `${normalizedUserId}/${fileName}`;
  const buffer = Buffer.from(base64Payload, 'base64');

  await ensureAvatarBucket();

  const supabase = getSupabase();
  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Khong the tai anh dai dien len Supabase: ${uploadError.message}`);
  }

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);

  return data.publicUrl;
}

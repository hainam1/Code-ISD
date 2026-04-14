import { extname } from 'node:path';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { getSupabaseEnv } from '@/lib/supabase/config';

const APPLICATION_BUCKET = 'application-files';
const APPLICATION_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
];
const APPLICATION_FILE_SIZE_LIMIT = '5MB';

let applicationBucketReadyPromise;

function sanitizeBaseName(fileName = 'file') {
  const extension = extname(fileName).toLowerCase();
  const baseName = fileName.slice(0, Math.max(0, fileName.length - extension.length)) || 'file';

  return {
    extension,
    baseName: baseName.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'file',
  };
}

function assertSupabaseStorageAdminAccess() {
  const { serviceRoleKey } = getSupabaseEnv();

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY to store application files in Supabase Storage.');
  }

  if (serviceRoleKey.startsWith('sb_publishable_')) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be a secret/service-role key to manage application file storage.');
  }
}

async function ensureApplicationBucket() {
  assertSupabaseStorageAdminAccess();

  if (applicationBucketReadyPromise) {
    return applicationBucketReadyPromise;
  }

  applicationBucketReadyPromise = (async () => {
    const supabase = getSupabaseClient();
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Unable to list Supabase Storage buckets: ${listError.message}`);
    }

    const existingBucket = (buckets || []).find(
      (bucket) => bucket.name === APPLICATION_BUCKET || bucket.id === APPLICATION_BUCKET,
    );

    if (!existingBucket) {
      const { error: createError } = await supabase.storage.createBucket(APPLICATION_BUCKET, {
        public: false,
        fileSizeLimit: APPLICATION_FILE_SIZE_LIMIT,
        allowedMimeTypes: APPLICATION_ALLOWED_MIME_TYPES,
      });

      if (createError) {
        throw new Error(`Unable to create Supabase Storage bucket for application files: ${createError.message}`);
      }

      return;
    }

    const { error: updateError } = await supabase.storage.updateBucket(APPLICATION_BUCKET, {
      public: false,
      fileSizeLimit: APPLICATION_FILE_SIZE_LIMIT,
      allowedMimeTypes: APPLICATION_ALLOWED_MIME_TYPES,
    });

    if (updateError) {
      throw new Error(`Unable to update Supabase Storage bucket for application files: ${updateError.message}`);
    }
  })();

  try {
    await applicationBucketReadyPromise;
  } catch (error) {
    applicationBucketReadyPromise = undefined;
    throw error;
  }
}

export async function saveApplicationFile({ applicationId, fieldName, file }) {
  const { extension, baseName } = sanitizeBaseName(file.name || 'file');
  const storedFileName = `${fieldName}-${baseName}${extension}`;
  const relativePath = `${applicationId}/${storedFileName}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await ensureApplicationBucket();

  const supabase = getSupabaseClient();
  const { error: uploadError } = await supabase.storage
    .from(APPLICATION_BUCKET)
    .upload(relativePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Unable to upload application file to Supabase Storage: ${uploadError.message}`);
  }

  return {
    fileName: file.name || storedFileName,
    mimeType: file.type || 'application/octet-stream',
    size: file.size || buffer.byteLength,
    storedFileName,
    relativePath,
  };
}

export async function readApplicationFile(relativePath) {
  await ensureApplicationBucket();

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(APPLICATION_BUCKET).download(relativePath);

  if (error) {
    throw new Error(`Unable to read application file from Supabase Storage: ${error.message}`);
  }

  const arrayBuffer = await data.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

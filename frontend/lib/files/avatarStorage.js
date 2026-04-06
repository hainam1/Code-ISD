import { getSupabaseClient } from '@/lib/supabaseClient';
import { getSupabaseEnv } from '@/lib/supabase/config';

const AVATAR_BUCKET = 'avatars';
const AVATAR_ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
let avatarBucketReadyPromise;

function parseDataUrl(dataUrl) {
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
  const { serviceRoleKey } = getSupabaseEnv();

  if (!serviceRoleKey) {
    throw new Error('Thieu SUPABASE_SERVICE_ROLE_KEY de luu avatar len Supabase Storage.');
  }

  if (serviceRoleKey.startsWith('sb_publishable_')) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY hien dang la publishable key. Hay thay bang secret/service-role key de tao bucket va upload avatar len Supabase Storage.',
    );
  }
}

async function ensureAvatarBucket() {
  assertSupabaseStorageAdminAccess();

  if (avatarBucketReadyPromise) {
    return avatarBucketReadyPromise;
  }

  avatarBucketReadyPromise = (async () => {
    const supabase = getSupabaseClient();
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      throw new Error(`Khong the doc bucket avatar tren Supabase: ${listError.message}`);
    }

    const existingBucket = (buckets || []).find(
      (bucket) => bucket.name === AVATAR_BUCKET || bucket.id === AVATAR_BUCKET,
    );

    if (!existingBucket) {
      const { error: createError } = await supabase.storage.createBucket(AVATAR_BUCKET, {
        public: true,
        fileSizeLimit: '2MB',
        allowedMimeTypes: AVATAR_ALLOWED_MIME_TYPES,
      });

      if (createError) {
        throw new Error(`Khong the tao bucket avatar tren Supabase: ${createError.message}`);
      }

      return;
    }

    if (!existingBucket.public) {
      const { error: updateError } = await supabase.storage.updateBucket(AVATAR_BUCKET, {
        public: true,
        fileSizeLimit: '2MB',
        allowedMimeTypes: AVATAR_ALLOWED_MIME_TYPES,
      });

      if (updateError) {
        throw new Error(`Khong the cap nhat bucket avatar tren Supabase: ${updateError.message}`);
      }
    }
  })();

  try {
    await avatarBucketReadyPromise;
  } catch (error) {
    avatarBucketReadyPromise = undefined;
    throw error;
  }
}

export async function saveAvatarDataUrl({ userId, dataUrl }) {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) {
    throw new Error('Thieu userId de luu anh dai dien.');
  }

  const { mimeType, base64Payload } = parseDataUrl(dataUrl);
  const fileName = `avatar-${Date.now()}.webp`;
  const objectPath = `${normalizedUserId}/${fileName}`;
  const buffer = Buffer.from(base64Payload, 'base64');

  await ensureAvatarBucket();

  const supabase = getSupabaseClient();
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

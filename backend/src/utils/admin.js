import { randomUUID } from 'node:crypto';
import { getEnv } from '../config/env.js';
import { getSupabase } from '../config/supabase.js';

const ADMIN_NAME = 'Admin tuyen dung';

export async function findPrimaryAdminUser() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('role', 'ADMIN')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data || null;
}

export async function resolveAdminDatabaseId(fallbackCandidateId = null) {
  const supabase = getSupabase();
  const env = getEnv();
  const adminUser = await findPrimaryAdminUser();

  if (adminUser?.id) {
    return adminUser.id;
  }

  const { data: adminByEmail, error: adminByEmailError } = await supabase
    .from('users')
    .select('id')
    .eq('email', env.adminEmail)
    .limit(1)
    .maybeSingle();

  if (adminByEmailError) {
    throw new Error(adminByEmailError.message);
  }

  if (adminByEmail?.id) {
    return adminByEmail.id;
  }

  const now = new Date().toISOString();
  const adminId = randomUUID();
  const { data: insertedAdmin, error: insertAdminError } = await supabase
    .from('users')
    .insert([
      {
        id: adminId,
        full_name: ADMIN_NAME,
        email: env.adminEmail,
        phone: `admin-${adminId.replace(/-/g, '').slice(0, 20)}`,
        role: 'ADMIN',
        password_hash: null,
        created_at: now,
        updated_at: now,
      },
    ])
    .select('id')
    .maybeSingle();

  if (insertedAdmin?.id) {
    return insertedAdmin.id;
  }

  if (insertAdminError?.code === '23505') {
    const { data: conflictedAdmin, error: conflictedAdminError } = await supabase
      .from('users')
      .select('id')
      .eq('email', env.adminEmail)
      .limit(1)
      .maybeSingle();

    if (conflictedAdminError) {
      throw new Error(conflictedAdminError.message);
    }

    if (conflictedAdmin?.id) {
      return conflictedAdmin.id;
    }
  }

  if (insertAdminError) {
    throw new Error(insertAdminError.message);
  }

  return fallbackCandidateId || null;
}

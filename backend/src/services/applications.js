import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { getEnv } from '../config/env.js';
import { getSupabase } from '../config/supabase.js';
import { saveApplicationBuffer, saveAvatarDataUrl } from './files.js';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);
const HEALTH_ALLOWED_MIME_TYPES = new Set([...ALLOWED_MIME_TYPES, 'image/png']);
const HEALTH_ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'png']);
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0[3-9][0-9]{8}$/;

function isPlaceholderEmail(value) {
  return /@smartguard\.local$/i.test(String(value || '').trim());
}

function isPlaceholderPhone(value) {
  return /^placeholder-/i.test(String(value || '').trim());
}

function toPublicEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return isPlaceholderEmail(email) ? '' : email;
}

function toPublicPhone(value) {
  const phone = String(value || '').trim();
  return isPlaceholderPhone(phone) ? '' : phone;
}

function buildPlaceholderEmail() {
  return `temp-${randomUUID()}@smartguard.local`.slice(0, 255);
}

function buildPlaceholderPhone() {
  return `placeholder-${randomUUID().replace(/-/g, '').slice(0, 20)}`.slice(0, 32);
}

function getExt(filename = '') {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

function validateUpload(file, allowedMimeTypes, allowedExtensions, invalidMessage, sizeMessage) {
  if (!file) {
    return { ok: false, message: invalidMessage };
  }
  const ext = getExt(file.originalname || '');
  if (!allowedMimeTypes.has(file.mimetype) && !allowedExtensions.has(ext)) {
    return { ok: false, message: invalidMessage };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { ok: false, message: sizeMessage };
  }
  return { ok: true };
}

export async function listApplications(candidateId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('applications')
    .select('*, jobs(*)')
    .eq('candidate_id', String(candidateId || '').trim())
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((item) => ({
    id: item.id,
    candidateId: item.candidate_id,
    jobId: item.job_id,
    fullName: item.candidate_full_name,
    email: item.candidate_email,
    phone: item.candidate_phone,
    note: item.note,
    cvFile: { fileName: item.cv_original_name, mimeType: item.cv_mime_type, size: item.cv_size, storedFileName: item.cv_path, relativePath: item.cv_path },
    healthFile: item.health_path
      ? { fileName: item.health_original_name, mimeType: item.health_mime_type, size: item.health_size, storedFileName: item.health_path, relativePath: item.health_path }
      : null,
    status: item.status,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    job: item.jobs
      ? { id: item.jobs.id, title: item.jobs.title, company: item.jobs.company_name, location: item.jobs.location, salary: item.jobs.salary_max !== null ? `${item.jobs.salary_min} - ${item.jobs.salary_max}` : 'Thoa thuan' }
      : null,
  }));
}

export async function submitApplication({ fields, files }) {
  const supabase = getSupabase();
  const fullName = String(fields.fullName || '').trim();
  const identifier = String(fields.identifier || '').trim();
  const contactType = String(fields.contactType || 'email').trim() === 'phone' ? 'phone' : 'email';
  const email = contactType === 'email' ? identifier.toLowerCase() : '';
  const phone = contactType === 'phone' ? identifier : '';
  const note = String(fields.note || '').trim();
  const jobId = String(fields.jobId || '').trim();
  const candidateId = String(fields.candidateId || '').trim();
  const cv = files.cv?.[0];
  const healthFile = files.healthFile?.[0];

  if (!jobId) throw Object.assign(new Error('Vui lòng chọn vị trí tuyển dụng trước khi nộp hồ sơ.'), { status: 400 });
  if (!fullName || !identifier || !candidateId) throw Object.assign(new Error('Vui lòng nhập đầy đủ thông tin ứng tuyển.'), { status: 400 });
  if (contactType === 'email' && !EMAIL_REGEX.test(email)) throw Object.assign(new Error('Email không hợp lệ.'), { status: 400 });
  if (contactType === 'phone' && !PHONE_REGEX.test(phone)) throw Object.assign(new Error('Số điện thoại phải gồm 10 chữ số và bắt đầu từ 03 đến 09.'), { status: 400 });

  const cvValidation = validateUpload(cv, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, 'Hệ thống chỉ chấp nhận file CV định dạng PDF, DOC hoặc DOCX.', 'Kích thước file CV không vượt quá 5MB.');
  if (!cvValidation.ok) throw Object.assign(new Error(cvValidation.message), { status: 400 });

  const healthValidation = validateUpload(healthFile, HEALTH_ALLOWED_MIME_TYPES, HEALTH_ALLOWED_EXTENSIONS, 'Hồ sơ sức khỏe chỉ chấp nhận PDF, DOC, DOCX hoặc PNG.', 'Kích thước hồ sơ sức khỏe không vượt quá 5MB.');
  if (!healthValidation.ok) throw Object.assign(new Error(healthValidation.message), { status: 400 });

  const { data: job } = await supabase.from('jobs').select('id').eq('id', jobId).maybeSingle();
  if (!job) throw Object.assign(new Error('Công việc không tồn tại.'), { status: 404 });

  const { data: candidate } = await supabase.from('users').select('id').eq('id', candidateId).maybeSingle();
  if (!candidate) throw Object.assign(new Error('Không tìm thấy tài khoản ứng viên.'), { status: 401 });

  const { data: duplicate } = await supabase.from('applications').select('id').eq('candidate_id', candidateId).eq('job_id', jobId).limit(1).maybeSingle();
  if (duplicate) throw Object.assign(new Error('Bạn đã ứng tuyển vị trí này rồi.'), { status: 409 });

  const applicationId = randomUUID();
  const savedCv = await saveApplicationBuffer({ applicationId, fieldName: 'cv', file: cv });
  const savedHealth = await saveApplicationBuffer({ applicationId, fieldName: 'health', file: healthFile });
  const now = new Date().toISOString();

  const { error } = await supabase.from('applications').insert([
    {
      id: applicationId,
      candidate_id: candidateId,
      job_id: jobId,
      candidate_full_name: fullName,
      candidate_email: email || null,
      candidate_phone: phone || null,
      note: note || null,
      cv_original_name: savedCv.fileName,
      cv_mime_type: savedCv.mimeType,
      cv_size: savedCv.size,
      cv_path: savedCv.relativePath,
      health_original_name: savedHealth.fileName,
      health_mime_type: savedHealth.mimeType,
      health_size: savedHealth.size,
      health_path: savedHealth.relativePath,
      status: 'Under Review',
      status_history: [{ status: 'Under Review', updatedAt: now, updatedBy: candidateId }],
      created_at: now,
      updated_at: now,
    },
  ]);

  if (error) {
    throw new Error(error.message);
  }

  return { id: applicationId, candidateId, jobId, fullName, email, phone, note, cvFile: savedCv, healthFile: savedHealth, status: 'Under Review', createdAt: now, updatedAt: now };
}

export async function login(input) {
  const env = getEnv();
  const supabase = getSupabase();
  const identifier = String(input.identifier || '').trim().toLowerCase();
  const password = String(input.password || '').trim();
  const loginType = input.loginType === 'admin' ? 'admin' : 'user';

  if (loginType === 'admin') {
    if (identifier !== env.adminEmail || password !== env.adminPassword) {
      throw Object.assign(new Error('Email, số điện thoại, mật khẩu hoặc loại tài khoản chưa chính xác'), { status: 401 });
    }
    return { message: 'Đăng nhập thành công', token: 'admin-internal-token', user: { id: 'admin-internal', name: 'Admin', email: env.adminEmail, phone: '', role: 'ADMIN' } };
  }

  const { data: users, error } = await supabase.from('users').select('*').or(`email.eq.${identifier},phone.eq.${identifier}`).limit(1);
  if (error) {
    throw new Error(error.message);
  }

  const user = users?.[0];
  if (!user) throw Object.assign(new Error('Email, số điện thoại, mật khẩu hoặc loại tài khoản chưa chính xác'), { status: 401 });

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch || String(user.role || '').toUpperCase() === 'ADMIN') {
    throw Object.assign(new Error('Email, số điện thoại, mật khẩu hoặc loại tài khoản chưa chính xác'), { status: 401 });
  }

  return {
    message: 'Đăng nhập thành công',
    token: `user-${user.id}`,
    user: {
      id: user.id,
      fullName: user.full_name || '',
      name: user.full_name || '',
      email: toPublicEmail(user.email),
      phone: toPublicPhone(user.phone),
      dob: user.date_of_birth || '',
      idCard: user.id_card || '',
      address: user.address || '',
      avatarUrl: user.avatar_url || '',
      role: user.role || 'USER',
    },
  };
}

export async function register(input) {
  const supabase = getSupabase();
  const fullName = String(input.fullName || '').trim();
  const identifier = String(input.identifier || '').trim();
  const registerType = input.registerType === 'phone' ? 'phone' : 'email';
  const email = registerType === 'email' ? identifier.toLowerCase() : '';
  const phone = registerType === 'phone' ? identifier : '';
  const password = String(input.password || '').trim();

  const duplicateConditions = [];
  if (email) duplicateConditions.push(`email.eq.${email}`);
  if (phone) duplicateConditions.push(`phone.eq.${phone}`);

  const { data: existingUsers, error: checkError } = await supabase
    .from('users')
    .select('id')
    .or(duplicateConditions.join(','))
    .limit(1);
  if (checkError) {
    throw new Error(checkError.message);
  }
  if (existingUsers?.length) throw Object.assign(new Error('Email hoặc số điện thoại đã tồn tại.'), { status: 409 });

  const passwordHash = await bcrypt.hash(password, 10);
  const placeholderEmail = email || buildPlaceholderEmail();
  const placeholderPhone = phone || buildPlaceholderPhone();
  const userId = randomUUID();
  const { data: user, error } = await supabase
    .from('users')
    .insert([{ id: userId, full_name: fullName, email: placeholderEmail, phone: placeholderPhone, role: 'CANDIDATE', password_hash: passwordHash }])
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    message: 'Đăng ký thành công',
    user: {
      id: user.id,
      fullName: user.full_name,
      email: toPublicEmail(user.email),
      phone: toPublicPhone(user.phone),
    },
  };
}

export async function updateProfile(input) {
  const supabase = getSupabase();
  const userId = String(input.userId || '').trim();
  const { data: user, error: fetchError } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (fetchError) {
    throw new Error(fetchError.message);
  }
  if (!user) throw Object.assign(new Error('Không tìm thấy tài khoản.'), { status: 404 });

  const rawAvatarUrl = String(input.avatarUrl || '').trim();
  const avatarUrl = rawAvatarUrl.startsWith('data:image/')
    ? await saveAvatarDataUrl({ userId, dataUrl: rawAvatarUrl })
    : rawAvatarUrl;

  const payload = {
    full_name: String(input.fullName || '').trim(),
    date_of_birth: String(input.dob || '').trim() || null,
    id_card: String(input.idCard || '').trim() || null,
    address: String(input.address || '').trim() || null,
    avatar_url: avatarUrl || null,
    updated_at: new Date().toISOString(),
  };
  const email = toPublicEmail(input.email);
  const phone = toPublicPhone(input.phone);
  const currentEmail = toPublicEmail(user.email);
  const currentPhone = toPublicPhone(user.phone);
  if (email) {
    payload.email = email;
  } else if (currentEmail) {
    payload.email = buildPlaceholderEmail();
  }
  if (phone) {
    payload.phone = phone;
  } else if (currentPhone) {
    payload.phone = buildPlaceholderPhone();
  }

  const { data: updatedUser, error: updateError } = await supabase.from('users').update(payload).eq('id', userId).select().single();
  if (updateError) {
    const message = String(updateError.message || '');
    if (updateError.code === '23505' && message.includes('users_phone_key')) {
      throw Object.assign(new Error('Số điện thoại đã được sử dụng.'), { status: 409 });
    }
    if (updateError.code === '23505' && message.includes('users_email_key')) {
      throw Object.assign(new Error('Email đã được sử dụng.'), { status: 409 });
    }
    throw Object.assign(new Error(updateError.message), { status: updateError.code === '23505' ? 409 : 500 });
  }

  return {
    id: updatedUser.id || '',
    fullName: updatedUser.full_name || '',
    name: updatedUser.full_name || '',
    email: toPublicEmail(updatedUser.email),
    phone: toPublicPhone(updatedUser.phone),
    dob: updatedUser.date_of_birth || '',
    idCard: updatedUser.id_card || '',
    address: updatedUser.address || '',
    avatarUrl: updatedUser.avatar_url || '',
    role: updatedUser.role || 'USER',
  };
}

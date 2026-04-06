import 'server-only';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { jobsSeed } from '@/features/jobs/data/jobsSeed.js';
import { getSupabaseClient } from '@/lib/supabaseClient';

const ADMIN_ID = 'admin-internal';
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin12345';
const ADMIN_PLACEHOLDER_EMAIL = 'admin-internal@smartguard.local';
const ADMIN_PLACEHOLDER_PHONE = 'placeholder-admin-internal';

let currentDb = null;

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createCompositeData() {
  return {
    users: [],
    jobs: [],
    deletedJobIds: [],
    applications: [],
    notifications: [],
    chatThreads: []
  };
}

function formatCurrencyValue(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return '';
  }

  return new Intl.NumberFormat('vi-VN').format(Number(value));
}

function formatSalaryRange(min, max, currency = 'VND') {
  if (min == null && max == null) {
    return '';
  }

  const resolvedMin = min == null ? max : min;
  const resolvedMax = max == null ? min : max;
  const suffix = currency || 'VND';

  if (resolvedMin === resolvedMax) {
    return `${formatCurrencyValue(resolvedMin)} ${suffix} / tháng`;
  }

  return `${formatCurrencyValue(resolvedMin)} - ${formatCurrencyValue(resolvedMax)} ${suffix} / tháng`;
}

function parseSalaryRange(value) {
  const matches = String(value || '').match(/\d[\d.]*/g) || [];
  const normalized = matches
    .map((item) => Number(item.replaceAll('.', '')))
    .filter((item) => Number.isFinite(item) && item >= 0);

  if (normalized.length === 0) {
    return { salaryMin: null, salaryMax: null };
  }

  if (normalized.length === 1) {
    return { salaryMin: normalized[0], salaryMax: normalized[0] };
  }

  return {
    salaryMin: Math.min(...normalized),
    salaryMax: Math.max(...normalized)
  };
}

function parseCountLabel(value) {
  const match = String(value || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function normalizeLegacyRole(role) {
  return String(role || '').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
}

function normalizeDatabaseRole(role) {
  return String(role || '').toUpperCase() === 'ADMIN' ? 'ADMIN' : 'CANDIDATE';
}

function normalizeJobStatus(status) {
  const rawStatus = String(status || '').trim().toUpperCase();
  if (
    rawStatus.includes('CLOSED') ||
    rawStatus.includes('ĐÃ ĐÓNG') ||
    rawStatus.includes('DA DONG') ||
    rawStatus.includes('HẾT') ||
    rawStatus.includes('HET')
  ) {
    return 'CLOSED';
  }
  if (rawStatus.includes('DRAFT') || rawStatus.includes('NHÁP') || rawStatus.includes('NHAP')) {
    return 'DRAFT';
  }
  return 'OPEN';
}

function mapStatusToLegacy(status) {
  switch (String(status || '').toUpperCase()) {
    case 'CLOSED':
      return 'Đã đóng';
    case 'DRAFT':
      return 'Nháp';
    default:
      return 'Đang tuyển dụng';
  }
}

function buildPlaceholderEmail(userId) {
  return `${userId}@smartguard.local`.slice(0, 255);
}

function buildPlaceholderPhone(userId) {
  return `placeholder-${String(userId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`.slice(0, 32);
}

function buildJobFallback(jobRow, applicationCount) {
  const seedJob = jobsSeed.find((item) => item.id === jobRow.id);
  if (seedJob) {
    return {
      ...seedJob,
      title: jobRow.title,
      description: jobRow.description,
      company: jobRow.company_name || seedJob.company,
      location: jobRow.location,
      address: jobRow.address || seedJob.address || jobRow.location,
      salary: formatSalaryRange(jobRow.salary_min, jobRow.salary_max, jobRow.salary_currency) || seedJob.salary,
      quantity: String(jobRow.slots_total || seedJob.quantity || ''),
      candidates: `${applicationCount} Ứng viên`,
      status: mapStatusToLegacy(jobRow.status),
      summary: {
        ...(seedJob.summary || {}),
        place: jobRow.location,
        mode: jobRow.employment_type || seedJob.summary?.mode || 'Toàn thời gian'
      }
    };
  }

  return {
    id: jobRow.id,
    title: jobRow.title,
    location: jobRow.location,
    salary: formatSalaryRange(jobRow.salary_min, jobRow.salary_max, jobRow.salary_currency),
    badge: String(jobRow.status || '').toUpperCase() === 'OPEN' ? 'NEW' : '',
    company: jobRow.company_name || 'Smart Guard',
    address: jobRow.address || jobRow.location,
    description: jobRow.description || '',
    requirements: [],
    experience: '',
    candidates: `${applicationCount} Ứng viên`,
    quantity: jobRow.slots_total ? String(jobRow.slots_total) : '',
    status: mapStatusToLegacy(jobRow.status),
    summary: {
      place: jobRow.location,
      mode: jobRow.employment_type || 'Toàn thời gian',
      postedAt: 'Vừa đăng'
    },
    schedule: [
      { label: 'LUÂN PHIÊN', value: 'Làm theo ca' },
      { label: 'THỜI GIAN', value: '8h' },
      { label: 'NGÀY NGHỈ', value: '4 ngày / tháng' },
      { label: 'HÌNH THỨC', value: jobRow.employment_type || 'Toàn thời gian' }
    ]
  };
}

function ensureAdminUser(data) {
  const users = Array.isArray(data.users) ? data.users : [];
  let adminUser = users.find((user) => user.id === ADMIN_ID);

  if (!adminUser) {
    adminUser = {
      id: ADMIN_ID,
      fullName: 'Admin',
      email: ADMIN_PLACEHOLDER_EMAIL,
      phone: ADMIN_PLACEHOLDER_PHONE,
      role: 'ADMIN',
      passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      dob: '',
      idCard: '',
      address: '',
      avatarUrl: ''
    };
    users.push(adminUser);
  }

  adminUser.role = 'ADMIN';
  if (!adminUser.passwordHash || !bcrypt.compareSync(ADMIN_PASSWORD, adminUser.passwordHash)) {
    adminUser.passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
  }

  data.users = users;
  return data;
}

async function fetchAllTables(supabase) {
  const queries = await Promise.all([
    supabase.from('users').select('id, full_name, email, phone, role, password_hash, date_of_birth, id_card, address, avatar_url, created_at, updated_at').order('created_at', { ascending: true }),
    supabase.from('jobs').select('id, title, description, company_name, location, address, employment_type, status, salary_min, salary_max, salary_currency, slots_filled, slots_total, created_at, updated_at').order('created_at', { ascending: false }),
    supabase.from('applications').select('id, candidate_id, job_id, candidate_full_name, candidate_email, candidate_phone, note, cv_original_name, cv_mime_type, cv_size, cv_path, health_original_name, health_mime_type, health_size, health_path, status, created_at, updated_at').order('created_at', { ascending: false }),
    supabase.from('notifications').select('id, user_id, type, title, message, payload, is_read, created_at, read_at').order('created_at', { ascending: false }),
    supabase.from('chat_threads').select('id, candidate_id, created_at, updated_at').order('created_at', { ascending: true }),
    supabase.from('chat_messages').select('id, thread_id, sender_id, receiver_id, content, is_read, created_at, read_at').order('created_at', { ascending: true })
  ]);

  for (const result of queries) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  return {
    users: queries[0].data || [],
    jobs: queries[1].data || [],
    applications: queries[2].data || [],
    notifications: queries[3].data || [],
    chatThreads: queries[4].data || [],
    chatMessages: queries[5].data || []
  };
}

function buildCompositeData(raw) {
  const data = createCompositeData();
  const applicationCountByJobId = new Map();

  for (const application of raw.applications) {
    applicationCountByJobId.set(
      application.job_id,
      (applicationCountByJobId.get(application.job_id) || 0) + 1
    );
  }

  data.users = raw.users.map((user) => ({
    id: user.id,
    fullName: user.full_name || '',
    email: user.email === ADMIN_PLACEHOLDER_EMAIL ? '' : user.email || '',
    phone: user.phone === ADMIN_PLACEHOLDER_PHONE ? '' : user.phone || '',
    role: normalizeLegacyRole(user.role),
    passwordHash: user.password_hash || '',
    createdAt: user.created_at,
    updatedAt: user.updated_at,
    dob: user.date_of_birth || '',
    idCard: user.id_card || '',
    address: user.address || '',
    avatarUrl: user.avatar_url || ''
  }));

  data.jobs = raw.jobs.map((job) => buildJobFallback(job, applicationCountByJobId.get(job.id) || 0));

  data.applications = raw.applications.map((application) => ({
    id: application.id,
    candidateId: application.candidate_id,
    jobId: application.job_id,
    fullName: application.candidate_full_name || '',
    email: application.candidate_email || '',
    phone: application.candidate_phone || '',
    note: application.note || '',
    cvFile: {
      fileName: application.cv_original_name,
      mimeType: application.cv_mime_type,
      size: application.cv_size,
      relativePath: application.cv_path,
      storedFileName: application.cv_path?.split('/')?.at(-1) || ''
    },
    healthFile: application.health_original_name
      ? {
          fileName: application.health_original_name,
          mimeType: application.health_mime_type,
          size: application.health_size,
          relativePath: application.health_path,
          storedFileName: application.health_path?.split('/')?.at(-1) || ''
        }
      : null,
    status: application.status,
    createdAt: application.created_at,
    updatedAt: application.updated_at
  }));

  data.notifications = raw.notifications.map((notification) => ({
    id: notification.id,
    userId: notification.user_id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    interview: notification.payload || null,
    payload: notification.payload || null,
    isRead: Boolean(notification.is_read),
    createdAt: notification.created_at,
    readAt: notification.read_at
  }));

  const messagesByThreadId = new Map();
  for (const message of raw.chatMessages) {
    if (!messagesByThreadId.has(message.thread_id)) {
      messagesByThreadId.set(message.thread_id, []);
    }

    messagesByThreadId.get(message.thread_id).push({
      id: message.id,
      senderId: message.sender_id,
      receiverId: message.receiver_id,
      content: message.content,
      createdAt: message.created_at,
      isRead: Boolean(message.is_read),
      readAt: message.read_at
    });
  }

  data.chatThreads = raw.chatThreads.map((thread) => ({
    id: thread.id,
    candidateId: thread.candidate_id,
    participants: [ADMIN_ID, thread.candidate_id],
    messages: messagesByThreadId.get(thread.id) || [],
    createdAt: thread.created_at,
    updatedAt: thread.updated_at
  }));

  return ensureAdminUser(data);
}

async function deleteMissingRows(supabase, table, idColumn, nextIds, previousIds) {
  const idsToDelete = previousIds.filter((id) => !nextIds.includes(id));
  if (idsToDelete.length === 0) {
    return;
  }

  const { error } = await supabase.from(table).delete().in(idColumn, idsToDelete);
  if (error) {
    throw new Error(`Failed to delete rows from ${table}: ${error.message}`);
  }
}

function normalizeUsersForDb(users) {
  const seenEmails = new Set();
  const seenPhones = new Set();

  return users.map((user) => {
    let email = (user.id === ADMIN_ID ? ADMIN_PLACEHOLDER_EMAIL : String(user.email || '').trim().toLowerCase()) || buildPlaceholderEmail(user.id);
    let phone = (user.id === ADMIN_ID ? ADMIN_PLACEHOLDER_PHONE : String(user.phone || '').trim()) || buildPlaceholderPhone(user.id);

    if (seenEmails.has(email)) {
      email = buildPlaceholderEmail(user.id);
    }
    if (seenPhones.has(phone)) {
      phone = buildPlaceholderPhone(user.id);
    }

    seenEmails.add(email);
    seenPhones.add(phone);

    return {
      id: user.id,
      full_name: String(user.fullName || '').trim() || 'Unknown User',
      email,
      phone,
      role: user.id === ADMIN_ID ? 'ADMIN' : normalizeDatabaseRole(user.role),
      password_hash: user.passwordHash || '',
      date_of_birth: user.dob || null,
      id_card: user.idCard || null,
      address: user.address || null,
      avatar_url: user.avatarUrl || null,
      created_at: user.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
}

function normalizeJobsForDb(jobs) {
  return jobs.map((job) => {
    const salary = parseSalaryRange(job.salary);
    return {
      id: job.id,
      title: String(job.title || '').trim() || 'Untitled Job',
      description: job.description || '',
      company_name: job.company || 'Smart Guard',
      location: job.location || 'Unknown',
      address: job.address || job.location || null,
      employment_type: job.summary?.mode || 'Full-time',
      status: normalizeJobStatus(job.status),
      salary_min: salary.salaryMin,
      salary_max: salary.salaryMax,
      salary_currency: 'VND',
      slots_filled: parseCountLabel(job.candidates),
      slots_total: parseCountLabel(job.quantity),
      created_at: job.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  });
}

function normalizeApplicationsForDb(applications) {
  const seenCandidateJobs = new Set();

  return applications.filter((application) => {
    const key = `${application.candidateId}::${application.jobId}`;
    if (seenCandidateJobs.has(key)) {
      return false;
    }
    seenCandidateJobs.add(key);
    return true;
  }).map((application) => ({
    id: application.id,
    candidate_id: application.candidateId,
    job_id: application.jobId,
    candidate_full_name: application.fullName || null,
    candidate_email: application.email || null,
    candidate_phone: application.phone || null,
    note: application.note || null,
    cv_original_name: application.cvFile?.fileName || 'unknown-file',
    cv_mime_type: application.cvFile?.mimeType || 'application/octet-stream',
    cv_size: Number(application.cvFile?.size) || 0,
    cv_path: application.cvFile?.relativePath || application.cvFile?.storedFileName || `${application.id}/cv`,
    health_original_name: application.healthFile?.fileName || null,
    health_mime_type: application.healthFile?.mimeType || null,
    health_size: application.healthFile?.size == null ? null : Number(application.healthFile.size) || 0,
    health_path: application.healthFile?.relativePath || application.healthFile?.storedFileName || null,
    status: application.status || 'Under Review',
    status_history: [
      {
        status: application.status || 'Under Review',
        updatedAt: application.updatedAt || application.createdAt || new Date().toISOString(),
        updatedBy: application.candidateId || null
      }
    ],
    created_at: application.createdAt || new Date().toISOString(),
    updated_at: application.updatedAt || new Date().toISOString()
  }));
}

function normalizeNotificationsForDb(notifications) {
  return notifications.map((notification) => ({
    id: notification.id,
    user_id: notification.userId,
    type: notification.type || 'GENERAL',
    title: notification.title || 'Notification',
    message: notification.message || '',
    payload: notification.payload || notification.interview || null,
    is_read: Boolean(notification.isRead),
    created_at: notification.createdAt || new Date().toISOString(),
    read_at: notification.readAt || null
  }));
}

function normalizeChatForDb(chatThreads) {
  const threadRows = [];
  const messageRows = [];

  for (const thread of chatThreads) {
    threadRows.push({
      id: thread.id,
      candidate_id: thread.candidateId,
      created_at: thread.createdAt || new Date().toISOString(),
      updated_at: thread.updatedAt || new Date().toISOString()
    });

    for (const message of thread.messages || []) {
      messageRows.push({
        id: message.id,
        thread_id: thread.id,
        sender_id: message.senderId,
        receiver_id: message.receiverId,
        content: message.content || '',
        is_read: Boolean(message.isRead),
        created_at: message.createdAt || new Date().toISOString(),
        read_at: message.readAt || null
      });
    }
  }

  return { threadRows, messageRows };
}

async function upsertRows(supabase, table, rows) {
  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from(table).upsert(rows, { onConflict: 'id' });
  if (error) {
    throw new Error(`Failed to write ${table}: ${error.message}`);
  }
}

async function persistData(nextData, previousData) {
  const supabase = getSupabaseClient();
  const normalized = ensureAdminUser(deepClone(nextData));
  const users = normalizeUsersForDb(normalized.users || []);
  const jobs = normalizeJobsForDb(normalized.jobs || []);
  const applications = normalizeApplicationsForDb(normalized.applications || []);
  const notifications = normalizeNotificationsForDb(normalized.notifications || []);
  const { threadRows, messageRows } = normalizeChatForDb(normalized.chatThreads || []);

  await upsertRows(supabase, 'users', users);
  await upsertRows(supabase, 'jobs', jobs);
  await upsertRows(supabase, 'applications', applications);
  await upsertRows(supabase, 'notifications', notifications);
  await upsertRows(supabase, 'chat_threads', threadRows);
  await upsertRows(supabase, 'chat_messages', messageRows);

  await deleteMissingRows(
    supabase,
    'chat_messages',
    'id',
    messageRows.map((item) => item.id),
    ((previousData.chatThreads || []).flatMap((thread) => (thread.messages || []).map((message) => message.id)))
  );
  await deleteMissingRows(
    supabase,
    'chat_threads',
    'id',
    threadRows.map((item) => item.id),
    (previousData.chatThreads || []).map((thread) => thread.id)
  );
  await deleteMissingRows(
    supabase,
    'notifications',
    'id',
    notifications.map((item) => item.id),
    (previousData.notifications || []).map((item) => item.id)
  );
  await deleteMissingRows(
    supabase,
    'applications',
    'id',
    applications.map((item) => item.id),
    (previousData.applications || []).map((item) => item.id)
  );
  await deleteMissingRows(
    supabase,
    'jobs',
    'id',
    jobs.map((item) => item.id),
    (previousData.jobs || []).map((item) => item.id)
  );
}

async function loadPersistedData() {
  const supabase = getSupabaseClient();
  const raw = await fetchAllTables(supabase);
  return buildCompositeData(raw);
}

export async function getDb() {
  if (currentDb) {
    return currentDb;
  }

  const data = await loadPersistedData();

  currentDb = {
    data: deepClone(data),
    snapshot: deepClone(data),
    async read() {
      const latest = await loadPersistedData();
      this.data = deepClone(latest);
      this.snapshot = deepClone(latest);
      return this.data;
    },
    async write() {
      await persistData(this.data, this.snapshot);
      const latest = await loadPersistedData();
      this.data = deepClone(latest);
      this.snapshot = deepClone(latest);
      return this.data;
    }
  };

  return currentDb;
}

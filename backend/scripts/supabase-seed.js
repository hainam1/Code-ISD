import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendRootDir = path.join(__dirname, '..');
const frontendRootDir = path.join(__dirname, '../../frontend');

function loadEnvFile(filePath) {
  try {
    process.loadEnvFile(filePath);
  } catch {
    // Ignore missing env files so local setup can stay partial.
  }
}

// Frontend owns the Next.js environment files after the split.
loadEnvFile(path.join(frontendRootDir, '.env.local'));
loadEnvFile(path.join(frontendRootDir, '.env'));
loadEnvFile(path.join(backendRootDir, '.env.local'));
loadEnvFile(path.join(backendRootDir, '.env'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const backendDataDir = path.join(backendRootDir, 'data');
const usersFile = path.join(backendDataDir, 'users.json');
const jobsFile = path.join(backendDataDir, 'jobs.json');
const appDataFile = path.join(backendDataDir, 'app-data.json');
const chatsFile = path.join(backendDataDir, 'chats.json');

const USER_ROLES = new Set(['CANDIDATE', 'HR', 'MANAGEMENT', 'ADMIN']);
const APP_STATUSES = new Set([
  'Under Review',
  'Shortlisted',
  'Rejected',
  'Interview Scheduled',
  'Interviewed',
  'Approved',
  'Final Rejected'
]);

function assertEnv() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.');
  }
}

async function readJson(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}, returning empty data.`);
    return {};
  }
}

function chunkArray(items, size = 200) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function upsertInChunks(supabase, table, rows, options = {}) {
  for (const chunk of chunkArray(rows)) {
    const { error } = await supabase.from(table).upsert(chunk, options);
    if (error) {
      throw new Error(`Failed to seed ${table}: ${error.message}`);
    }
  }
}

function safeTrim(value) {
  return String(value || '').trim();
}

function truncate(value, maxLength) {
  const normalized = value == null ? null : String(value);
  if (normalized == null || normalized === '') {
    return null;
  }
  return normalized.length > maxLength ? normalized.slice(0, maxLength) : normalized;
}

function normalizeTimestamp(value, fallback = null) {
  const source = value ? new Date(value) : null;
  if (!source || Number.isNaN(source.getTime())) {
    return fallback;
  }
  return source.toISOString();
}

function buildPlaceholderEmail(userId) {
  return `${userId}@smartguard.local`.slice(0, 255);
}

function buildPlaceholderPhone(userId) {
  return `placeholder-${String(userId).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)}`.slice(0, 32);
}

function normalizeRole(user) {
  const rawRole = safeTrim(user.role).toUpperCase();
  if (rawRole === 'USER' || !rawRole) {
    const email = safeTrim(user.email).toLowerCase();
    if (email === 'admin@gmail.com' || email === 'admin@longhai.com') {
      return 'ADMIN';
    }
    return 'CANDIDATE';
  }

  if (USER_ROLES.has(rawRole)) {
    return rawRole;
  }

  return 'CANDIDATE';
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

function parseFirstInteger(value) {
  const match = String(value || '').match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function normalizeJobStatus(job) {
  const rawStatus = safeTrim(job.status).toUpperCase();
  if (rawStatus.includes('DRAFT')) {
    return 'DRAFT';
  }
  if (
    rawStatus.includes('CLOSED') ||
    rawStatus.includes('ĐÃ ĐÓNG') ||
    rawStatus.includes('DA DONG') ||
    rawStatus.includes('HẾT') ||
    rawStatus.includes('HET')
  ) {
    return 'CLOSED';
  }
  return 'OPEN';
}

function buildStatusHistory(application) {
  const createdAt = normalizeTimestamp(application.createdAt, new Date().toISOString());
  const updatedAt = normalizeTimestamp(application.updatedAt, createdAt);
  const status = APP_STATUSES.has(application.status) ? application.status : 'Under Review';
  const history = [
    {
      status: 'Under Review',
      updatedAt: createdAt,
      updatedBy: application.candidateId || null
    }
  ];

  if (status !== 'Under Review') {
    history.push({
      status,
      updatedAt,
      updatedBy: application.candidateId || null
    });
  }

  return history;
}

function buildFilePath(applicationId, file, prefix) {
  const relativePath = safeTrim(file?.relativePath);
  if (relativePath) {
    return truncate(relativePath.replaceAll('\\', '/'), 255);
  }

  const storedFileName = safeTrim(file?.storedFileName);
  if (storedFileName) {
    return truncate(`${applicationId}/${storedFileName}`.replaceAll('\\', '/'), 255);
  }

  const originalName = safeTrim(file?.fileName);
  if (originalName) {
    return truncate(`${applicationId}/${prefix}-${originalName}`.replaceAll('\\', '/'), 255);
  }

  return truncate(`${applicationId}/${prefix}-missing`, 255);
}

function pickPrimaryAdminId(users) {
  const explicitAdmin = users.find((user) => user.role === 'ADMIN');
  if (explicitAdmin) {
    return explicitAdmin.id;
  }

  const adminEmail = users.find((user) => user.email === 'admin@gmail.com');
  if (adminEmail) {
    return adminEmail.id;
  }

  return null;
}

function ensureUniqueUsers(users) {
  const seenEmails = new Set();
  const seenPhones = new Set();

  return users.map((user) => {
    const nextUser = { ...user };

    if (!nextUser.email || seenEmails.has(nextUser.email)) {
      nextUser.email = buildPlaceholderEmail(nextUser.id);
    }
    seenEmails.add(nextUser.email);

    if (!nextUser.phone || seenPhones.has(nextUser.phone)) {
      nextUser.phone = buildPlaceholderPhone(nextUser.id);
    }
    seenPhones.add(nextUser.phone);

    return nextUser;
  });
}

function dedupeApplications(applications) {
  const seenIds = new Set();
  const seenCandidateJobs = new Set();

  return applications.filter((application) => {
    if (!application.id || seenIds.has(application.id)) {
      return false;
    }

    const compositeKey = `${application.candidate_id}::${application.job_id}`;
    if (seenCandidateJobs.has(compositeKey)) {
      return false;
    }

    seenIds.add(application.id);
    seenCandidateJobs.add(compositeKey);
    return true;
  });
}

function dedupeThreads(threads) {
  const seenIds = new Set();
  const seenCandidates = new Set();

  return threads.filter((thread) => {
    if (!thread.id || seenIds.has(thread.id) || seenCandidates.has(thread.candidate_id)) {
      return false;
    }

    seenIds.add(thread.id);
    seenCandidates.add(thread.candidate_id);
    return true;
  });
}

async function main() {
  assertEnv();

  const [usersPayload, jobsPayload, appDataPayload, chatsPayload] = await Promise.all([
    readJson(usersFile),
    readJson(jobsFile),
    readJson(appDataFile),
    readJson(chatsFile)
  ]);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const rawUsers = Array.isArray(usersPayload.users) ? usersPayload.users : [];
  const normalizedUsers = ensureUniqueUsers(rawUsers.map((user) => {
    const role = normalizeRole(user);
    const email = safeTrim(user.email).toLowerCase() || buildPlaceholderEmail(user.id);
    const phone = safeTrim(user.phone) || buildPlaceholderPhone(user.id);

    return {
      id: truncate(user.id, 64),
      full_name: truncate(user.fullName, 255) || 'Unknown User',
      email: truncate(email, 255),
      phone: truncate(phone, 32),
      role,
      password_hash: truncate(user.passwordHash, 255) || '',
      date_of_birth: normalizeTimestamp(user.dob)?.slice(0, 10) || null,
      id_card: truncate(user.idCard, 32),
      address: truncate(user.address, 255),
      avatar_url: truncate(user.avatarUrl, 255),
      created_at: normalizeTimestamp(user.createdAt, new Date().toISOString()),
      updated_at: normalizeTimestamp(user.updatedAt, normalizeTimestamp(user.createdAt, new Date().toISOString()))
    };
  }));

  const primaryAdminId = pickPrimaryAdminId(normalizedUsers);

  const rawJobs = Array.isArray(jobsPayload.jobs) ? jobsPayload.jobs : [];
  const normalizedJobs = rawJobs.map((job) => {
    const salary = parseSalaryRange(job.salary);
    const createdAt = normalizeTimestamp(job.createdAt, new Date().toISOString());
    const updatedAt = normalizeTimestamp(job.updatedAt, createdAt);
    return {
      id: truncate(job.id, 128),
      title: truncate(job.title, 255) || 'Untitled Job',
      description: job.description || '',
      company_name: truncate(job.company, 255) || 'Smart Guard',
      location: truncate(job.location, 255) || 'Unknown',
      address: truncate(job.address, 255),
      requirements: Array.isArray(job.requirements)
        ? job.requirements.map((item) => String(item || '').trim()).filter(Boolean)
        : [],
      experience: truncate(job.experience, 128),
      schedule_type: truncate(job.scheduleType || job.schedule?.[0]?.value, 128),
      work_hours: truncate(job.workHours || job.schedule?.[1]?.value, 128),
      day_off: truncate(job.dayOff || job.schedule?.[2]?.value, 128),
      employment_type: truncate(job.summary?.mode, 64) || 'Full-time',
      status: normalizeJobStatus(job),
      salary_min: salary.salaryMin,
      salary_max: salary.salaryMax,
      salary_currency: 'VND',
      slots_filled: 0,
      slots_total: parseFirstInteger(job.quantity),
      created_at: createdAt,
      updated_at: updatedAt
    };
  });

  const rawApplications = Array.isArray(appDataPayload.applications) ? appDataPayload.applications : [];
  const normalizedApplications = dedupeApplications(rawApplications
    .filter((application) => application?.candidateId && application?.jobId && application?.cvFile)
    .map((application) => ({
      id: truncate(application.id, 64),
      candidate_id: truncate(application.candidateId, 64),
      job_id: truncate(application.jobId, 128),
      candidate_full_name: truncate(application.fullName, 255),
      candidate_email: truncate(safeTrim(application.email).toLowerCase(), 255),
      candidate_phone: truncate(application.phone, 32),
      note: application.note || null,
      cv_original_name: truncate(application.cvFile?.fileName, 255) || 'unknown-file',
      cv_mime_type: truncate(application.cvFile?.mimeType, 128) || 'application/octet-stream',
      cv_size: Number(application.cvFile?.size) || 0,
      cv_path: buildFilePath(application.id, application.cvFile, 'cv'),
      health_original_name: truncate(application.healthFile?.fileName, 255),
      health_mime_type: truncate(application.healthFile?.mimeType, 128),
      health_size: application.healthFile?.size == null ? null : Number(application.healthFile.size) || 0,
      health_path: application.healthFile ? buildFilePath(application.id, application.healthFile, 'health') : null,
      status: APP_STATUSES.has(application.status) ? application.status : 'Under Review',
      status_history: buildStatusHistory(application),
      created_at: normalizeTimestamp(application.createdAt, new Date().toISOString()),
      updated_at: normalizeTimestamp(application.updatedAt, normalizeTimestamp(application.createdAt, new Date().toISOString()))
    })));

  const rawNotifications = Array.isArray(appDataPayload.notifications) ? appDataPayload.notifications : [];
  const normalizedNotifications = rawNotifications
    .filter((notification) => notification?.userId)
    .map((notification) => ({
      id: truncate(notification.id, 64),
      user_id: truncate(notification.userId, 64),
      type: truncate(notification.type, 64) || 'GENERAL',
      title: truncate(notification.title, 255) || 'Notification',
      message: notification.message || '',
      payload: notification.payload || notification.interview || null,
      is_read: Boolean(notification.isRead),
      created_at: normalizeTimestamp(notification.createdAt, new Date().toISOString()),
      read_at: normalizeTimestamp(notification.readAt, null)
    }));

  const rawThreads = Array.isArray(chatsPayload.chatThreads) ? chatsPayload.chatThreads : [];
  const normalizedThreads = dedupeThreads(rawThreads
    .filter((thread) => thread?.candidateId)
    .map((thread) => ({
      id: truncate(thread.id, 64),
      candidate_id: truncate(thread.candidateId, 64),
      created_at: normalizeTimestamp(thread.createdAt, new Date().toISOString()),
      updated_at: normalizeTimestamp(thread.updatedAt, normalizeTimestamp(thread.createdAt, new Date().toISOString()))
    })));

  const normalizedMessages = rawThreads.flatMap((thread) => {
    const messages = Array.isArray(thread.messages) ? thread.messages : [];

    return messages
      .map((message) => {
        const senderId = message.senderId === 'admin-internal' ? primaryAdminId : message.senderId;
        const receiverId = message.receiverId === 'admin-internal' ? primaryAdminId : message.receiverId;

        if (!senderId || !receiverId) {
          return null;
        }

        return {
          id: truncate(message.id, 64),
          thread_id: truncate(thread.id, 64),
          sender_id: truncate(senderId, 64),
          receiver_id: truncate(receiverId, 64),
          content: message.content || '',
          is_read: Boolean(message.isRead),
          created_at: normalizeTimestamp(message.createdAt, new Date().toISOString()),
          read_at: normalizeTimestamp(message.readAt, null)
        };
      })
      .filter(Boolean);
  });

  await upsertInChunks(supabase, 'users', normalizedUsers, { onConflict: 'id' });
  await upsertInChunks(supabase, 'jobs', normalizedJobs, { onConflict: 'id' });
  await upsertInChunks(supabase, 'applications', normalizedApplications, { onConflict: 'id' });
  await upsertInChunks(supabase, 'notifications', normalizedNotifications, { onConflict: 'id' });
  await upsertInChunks(supabase, 'chat_threads', normalizedThreads, { onConflict: 'id' });
  await upsertInChunks(supabase, 'chat_messages', normalizedMessages, { onConflict: 'id' });

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        seeded: {
          users: normalizedUsers.length,
          jobs: normalizedJobs.length,
          applications: normalizedApplications.length,
          notifications: normalizedNotifications.length,
          chatThreads: normalizedThreads.length,
          chatMessages: normalizedMessages.length
        },
        skipped: {
          interviews: 'No dedicated JSON source file was found for interviews.'
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});

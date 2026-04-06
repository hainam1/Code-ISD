import { createClient } from '@/lib/supabase/server';
import { CANDIDATE_STATUS } from '@/features/candidates/constants/statusOptions';

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

function buildRelativePath(applicationId, storedPath) {
  const normalized = String(storedPath || '').trim();

  if (!normalized) {
    return '';
  }

  if (normalized.includes('/')) {
    return normalized;
  }

  return `${applicationId}/${normalized}`;
}

function mapInterview(interview) {
  if (!interview) {
    return null;
  }

  return {
    id: interview.id,
    interviewDate: interview.interview_date,
    interviewTime: interview.interview_time,
    location: interview.interview_location,
    rawDate: interview.scheduled_start_at ? String(interview.scheduled_start_at).slice(0, 10) : '',
    result: interview.result || 'Pending',
    comments: interview.comments || '',
  };
}

function mapCandidate(user, latestApplication) {
  const interview = Array.isArray(latestApplication?.interviews)
    ? latestApplication.interviews[0]
    : latestApplication?.interviews;
  const cvPath = latestApplication ? buildRelativePath(latestApplication.id, latestApplication.cv_path) : '';
  const healthPath = latestApplication ? buildRelativePath(latestApplication.id, latestApplication.health_path) : '';

  return {
    id: user.id,
    applicationId: latestApplication?.id || '',
    hasApplication: Boolean(latestApplication),
    fullName: user.full_name || 'Ứng viên',
    email: toPublicEmail(user.email),
    phone: toPublicPhone(user.phone),
    dob: user.date_of_birth || '',
    idCard: user.id_card || '',
    address: user.address || '',
    avatarUrl: user.avatar_url || '',
    position: latestApplication?.jobs?.title || 'Chưa ứng tuyển',
    appliedAt: latestApplication?.created_at || user.created_at,
    status: latestApplication?.status || CANDIDATE_STATUS.noApplication,
    cvFileName: cvPath ? cvPath.split('/').pop() : '',
    healthCertificateFileName: healthPath ? healthPath.split('/').pop() : '',
    cvFile: cvPath
      ? {
          fileName: latestApplication.cv_original_name || cvPath.split('/').pop(),
          mimeType: latestApplication.cv_mime_type || '',
          relativePath: cvPath,
        }
      : null,
    healthFile: healthPath
      ? {
          fileName: latestApplication.health_original_name || healthPath.split('/').pop(),
          mimeType: latestApplication.health_mime_type || '',
          relativePath: healthPath,
        }
      : null,
    interview: mapInterview(interview),
  };
}

async function listCandidateUsers(supabase) {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, phone, date_of_birth, id_card, address, avatar_url, role, created_at')
    .eq('role', 'CANDIDATE')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function listApplicationsByNewestFirst(supabase) {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      id,
      candidate_id,
      candidate_full_name,
      candidate_email,
      candidate_phone,
      cv_original_name,
      cv_mime_type,
      cv_path,
      health_original_name,
      health_mime_type,
      health_path,
      status,
      created_at,
      jobs:job_id(title),
      interviews(id, interview_date, interview_time, interview_location, scheduled_start_at, result, comments)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

function buildLatestApplicationMap(applications) {
  const latestByCandidateId = new Map();

  for (const application of applications) {
    if (!latestByCandidateId.has(application.candidate_id)) {
      latestByCandidateId.set(application.candidate_id, application);
    }
  }

  return latestByCandidateId;
}

export async function listAdminCandidates() {
  const supabase = createClient();
  const [users, applications] = await Promise.all([
    listCandidateUsers(supabase),
    listApplicationsByNewestFirst(supabase),
  ]);
  const latestApplications = buildLatestApplicationMap(applications);

  return users.map((user) => mapCandidate(user, latestApplications.get(user.id)));
}

export async function getAdminCandidateById(candidateId) {
  const supabase = createClient();
  const normalizedCandidateId = String(candidateId || '').trim();

  if (!normalizedCandidateId) {
    return null;
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, full_name, email, phone, date_of_birth, id_card, address, avatar_url, role, created_at')
    .eq('id', normalizedCandidateId)
    .eq('role', 'CANDIDATE')
    .maybeSingle();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    return null;
  }

  const { data: latestApplication, error: applicationError } = await supabase
    .from('applications')
    .select(`
      id,
      candidate_id,
      candidate_full_name,
      candidate_email,
      candidate_phone,
      cv_original_name,
      cv_mime_type,
      cv_path,
      health_original_name,
      health_mime_type,
      health_path,
      status,
      created_at,
      jobs:job_id(title),
      interviews(id, interview_date, interview_time, interview_location, scheduled_start_at, result, comments)
    `)
    .eq('candidate_id', normalizedCandidateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (applicationError) {
    throw new Error(applicationError.message);
  }

  return mapCandidate(user, latestApplication || null);
}

export async function updateAdminCandidateById(candidateId, updates) {
  const supabase = createClient();
  const normalizedCandidateId = String(candidateId || '').trim();
  const { data: latestApp, error } = await supabase
    .from('applications')
    .select('id')
    .eq('candidate_id', normalizedCandidateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!latestApp) {
    return null;
  }

  const payload = {};

  if (typeof updates.status === 'string' && updates.status.trim()) {
    payload.status = updates.status.trim();
  }

  if (typeof updates.healthCertificateFileName === 'string' && updates.healthCertificateFileName.trim()) {
    payload.health_path = buildRelativePath(latestApp.id, updates.healthCertificateFileName.trim());
  }

  if (Object.keys(payload).length > 0) {
    payload.updated_at = new Date().toISOString();
    const { error: updateError } = await supabase.from('applications').update(payload).eq('id', latestApp.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }

  return getAdminCandidateById(normalizedCandidateId);
}

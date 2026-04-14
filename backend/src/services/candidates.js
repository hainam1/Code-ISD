import { getSupabase } from '../config/supabase.js';
import { resolveAdminDatabaseId } from '../utils/admin.js';

const CANDIDATE_STATUS = {
  all: 'All',
  noApplication: 'No Application',
  review: 'Under Review',
  interview: 'Interview Scheduled',
  approved: 'Approved',
  failed: 'Final Rejected',
};

const FINAL_HISTORY_STATUSES = new Set([CANDIDATE_STATUS.approved, CANDIDATE_STATUS.failed]);

function isInterviewHistoryMissingError(error) {
  const code = String(error?.code || '').trim();
  const message = String(error?.message || '').toLowerCase();

  return (
    code === 'PGRST205' ||
    (message.includes('interview_history') && (
      message.includes('schema cache') ||
      message.includes('does not exist') ||
      message.includes('could not find the table')
    ))
  );
}

function normalizeCandidateStatus(status) {
  const normalized = String(status || '').trim();

  switch (normalized) {
    case CANDIDATE_STATUS.noApplication:
      return CANDIDATE_STATUS.noApplication;
    case CANDIDATE_STATUS.interview:
    case 'Interviewed':
      return CANDIDATE_STATUS.interview;
    case CANDIDATE_STATUS.review:
    case 'Needs Review':
    case 'Shortlisted':
      return CANDIDATE_STATUS.review;
    case 'Rejected':
      return 'Rejected';
    case CANDIDATE_STATUS.approved:
      return CANDIDATE_STATUS.approved;
    case CANDIDATE_STATUS.failed:
      return CANDIDATE_STATUS.failed;
    default:
      return normalized ? CANDIDATE_STATUS.review : CANDIDATE_STATUS.noApplication;
  }
}

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

function normalizeStatusHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const status = normalizeCandidateStatus(entry.status);
      const updatedAt = String(entry.updatedAt || entry.createdAt || '').trim();

      if (!status || !updatedAt) {
        return null;
      }

      return {
        status,
        updatedAt,
        updatedBy: String(entry.updatedBy || '').trim(),
        note: String(entry.note || '').trim(),
      };
    })
    .filter(Boolean);
}

function buildStatusHistoryEntry({ status, updatedBy, note, updatedAt }) {
  const entry = {
    status,
    updatedAt,
    updatedBy: String(updatedBy || 'admin-internal').trim() || 'admin-internal',
  };

  const normalizedNote = String(note || '').trim();

  if (normalizedNote) {
    entry.note = normalizedNote;
  }

  return entry;
}

function appendStatusHistory(history, entry) {
  const normalizedHistory = normalizeStatusHistory(history);
  const lastEntry = normalizedHistory[normalizedHistory.length - 1];

  if (
    lastEntry &&
    lastEntry.status === entry.status &&
    lastEntry.note === (entry.note || '') &&
    lastEntry.updatedBy === entry.updatedBy
  ) {
    return normalizedHistory;
  }

  return [...normalizedHistory, entry];
}

function hasInterviewNotification(candidateId, notifiedCandidateIds) {
  return Boolean(candidateId) && notifiedCandidateIds.has(candidateId);
}

function resolveCandidateStatus(latestApplication, notifiedCandidateIds) {
  if (!latestApplication) {
    return CANDIDATE_STATUS.noApplication;
  }

  const normalizedStatus = normalizeCandidateStatus(latestApplication.status);

  if (FINAL_HISTORY_STATUSES.has(normalizedStatus)) {
    return normalizedStatus;
  }

  if (hasInterviewNotification(latestApplication.candidate_id, notifiedCandidateIds)) {
    return CANDIDATE_STATUS.interview;
  }

  return normalizedStatus;
}

function getDecisionEntry(statusHistory, fallbackStatus, fallbackUpdatedAt) {
  const normalizedHistory = normalizeStatusHistory(statusHistory);

  for (let index = normalizedHistory.length - 1; index >= 0; index -= 1) {
    const entry = normalizedHistory[index];

    if (FINAL_HISTORY_STATUSES.has(entry.status)) {
      return entry;
    }
  }

  if (FINAL_HISTORY_STATUSES.has(fallbackStatus)) {
    return {
      status: fallbackStatus,
      updatedAt: fallbackUpdatedAt || '',
      updatedBy: '',
      note: '',
    };
  }

  return null;
}

function mapCandidate(user, latestApplication, notifiedCandidateIds = new Set()) {
  const interview = Array.isArray(latestApplication?.interviews)
    ? latestApplication.interviews[0]
    : latestApplication?.interviews;
  const cvPath = latestApplication ? buildRelativePath(latestApplication.id, latestApplication.cv_path) : '';
  const healthPath = latestApplication ? buildRelativePath(latestApplication.id, latestApplication.health_path) : '';
  const status = resolveCandidateStatus(latestApplication, notifiedCandidateIds);
  const statusHistory = normalizeStatusHistory(latestApplication?.status_history);
  const decision = getDecisionEntry(statusHistory, status, latestApplication?.updated_at || '');

  return {
    id: user.id,
    applicationId: latestApplication?.id || '',
    hasApplication: Boolean(latestApplication),
    fullName: user.full_name || 'Ung vien',
    email: toPublicEmail(user.email),
    phone: toPublicPhone(user.phone),
    dob: user.date_of_birth || '',
    idCard: user.id_card || '',
    address: user.address || '',
    avatarUrl: user.avatar_url || '',
    position: latestApplication?.jobs?.title || 'Chua ung tuyen',
    appliedAt: latestApplication?.created_at || user.created_at,
    updatedAt: latestApplication?.updated_at || user.updated_at || user.created_at,
    status,
    statusHistory,
    decisionStatus: decision?.status || '',
    decisionAt: decision?.updatedAt || '',
    decisionNote: decision?.note || '',
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

function buildHistoryEntryMap(historyEntries) {
  const latestByApplicationId = new Map();

  for (const entry of historyEntries) {
    if (!latestByApplicationId.has(entry.application_id)) {
      latestByApplicationId.set(entry.application_id, entry);
    }
  }

  return latestByApplicationId;
}

function mapHistoryCandidate(historyEntry, user, application) {
  const interview = Array.isArray(application?.interviews) ? application.interviews[0] : application?.interviews;

  return {
    id: user?.id || historyEntry.candidate_id,
    applicationId: historyEntry.application_id,
    fullName: user?.full_name || application?.candidate_full_name || 'Ung vien',
    email: toPublicEmail(user?.email || ''),
    phone: toPublicPhone(user?.phone || ''),
    avatarUrl: user?.avatar_url || '',
    position: application?.jobs?.title || 'Chua cap nhat',
    status: historyEntry.final_status,
    decisionStatus: historyEntry.final_status,
    decisionAt: historyEntry.evaluated_at || historyEntry.updated_at || historyEntry.created_at,
    decisionNote: historyEntry.note || '',
    fitLevel: historyEntry.fit_level || '',
    interview: mapInterview(interview),
  };
}

function buildFallbackHistoryEntries(applications) {
  return applications
    .filter((application) => FINAL_HISTORY_STATUSES.has(normalizeCandidateStatus(application.status)))
    .map((application) => {
      const statusHistory = normalizeStatusHistory(application.status_history);
      const decisionEntry = getDecisionEntry(
        statusHistory,
        normalizeCandidateStatus(application.status),
        application.updated_at || application.created_at || '',
      );

      return {
        application_id: application.id,
        candidate_id: application.candidate_id,
        job_id: application.job_id,
        final_status: decisionEntry?.status || normalizeCandidateStatus(application.status),
        interview_result: normalizeCandidateStatus(application.status) === CANDIDATE_STATUS.approved ? 'Pass' : 'Fail',
        fit_level: '',
        note: decisionEntry?.note || '',
        evaluated_at: decisionEntry?.updatedAt || application.updated_at || application.created_at || '',
        created_at: application.created_at || '',
        updated_at: application.updated_at || application.created_at || '',
      };
    });
}

async function listCandidateUsers(supabase) {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, phone, date_of_birth, id_card, address, avatar_url, role, created_at, updated_at')
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
      job_id,
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
      status_history,
      created_at,
      updated_at,
      jobs:job_id(title),
      interviews(id, interview_date, interview_time, interview_location, scheduled_start_at, result, comments)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

async function listInterviewHistoryEntries(supabase) {
  const { data, error } = await supabase
    .from('interview_history')
    .select('id, application_id, candidate_id, job_id, final_status, interview_result, fit_level, note, evaluated_by, evaluated_at, created_at, updated_at')
    .order('evaluated_at', { ascending: false });

  if (error) {
    if (isInterviewHistoryMissingError(error)) {
      return null;
    }

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

function buildApplicationMap(applications) {
  return new Map(applications.map((application) => [application.id, application]));
}

function buildUserMap(users) {
  return new Map(users.map((user) => [user.id, user]));
}

async function listInterviewNotifiedCandidateIds(supabase, candidateIds) {
  const normalizedCandidateIds = candidateIds.filter(Boolean);

  if (!normalizedCandidateIds.length) {
    return new Set();
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('user_id')
    .eq('type', 'INTERVIEW_SCHEDULED')
    .in('user_id', normalizedCandidateIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data || []).map((item) => item.user_id).filter(Boolean));
}

async function syncInterviewStatuses(supabase, applications, notifiedCandidateIds) {
  const latestApplications = Array.from(buildLatestApplicationMap(applications).values());
  const applicationIdsToUpdate = latestApplications
    .filter((application) => hasInterviewNotification(application.candidate_id, notifiedCandidateIds))
    .filter((application) => !FINAL_HISTORY_STATUSES.has(normalizeCandidateStatus(application.status)))
    .filter((application) => normalizeCandidateStatus(application.status) !== CANDIDATE_STATUS.interview)
    .map((application) => application.id);

  if (!applicationIdsToUpdate.length) {
    return;
  }

  const { error } = await supabase
    .from('applications')
    .update({
      status: CANDIDATE_STATUS.interview,
      updated_at: new Date().toISOString(),
    })
    .in('id', applicationIdsToUpdate);

  if (error) {
    throw new Error(error.message);
  }
}

async function getCandidateUsersAndApplications() {
  const supabase = getSupabase();
  const [users, applications] = await Promise.all([
    listCandidateUsers(supabase),
    listApplicationsByNewestFirst(supabase),
  ]);
  const notifiedCandidateIds = await listInterviewNotifiedCandidateIds(
    supabase,
    applications.map((application) => application.candidate_id),
  );

  await syncInterviewStatuses(supabase, applications, notifiedCandidateIds);

  return { supabase, users, applications, notifiedCandidateIds };
}

export async function listCandidates() {
  const { users, applications, notifiedCandidateIds } = await getCandidateUsersAndApplications();
  const latestApplications = buildLatestApplicationMap(applications);

  return users.map((user) => mapCandidate(user, latestApplications.get(user.id), notifiedCandidateIds));
}

export async function listHistory() {
  const { supabase, users, applications } = await getCandidateUsersAndApplications();
  const historyEntries = await listInterviewHistoryEntries(supabase);
  const resolvedHistoryEntries = Array.isArray(historyEntries)
    ? historyEntries
    : buildFallbackHistoryEntries(applications);
  const latestHistoryByApplicationId = buildHistoryEntryMap(resolvedHistoryEntries);
  const userMap = buildUserMap(users);
  const applicationMap = buildApplicationMap(applications);

  return Array.from(latestHistoryByApplicationId.values())
    .map((entry) => mapHistoryCandidate(entry, userMap.get(entry.candidate_id), applicationMap.get(entry.application_id)))
    .sort((left, right) => new Date(right.decisionAt || 0).getTime() - new Date(left.decisionAt || 0).getTime());
}

export async function getCandidateById(candidateId) {
  const supabase = getSupabase();
  const normalizedCandidateId = String(candidateId || '').trim();

  if (!normalizedCandidateId) {
    return null;
  }

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, full_name, email, phone, date_of_birth, id_card, address, avatar_url, role, created_at, updated_at')
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
      job_id,
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
      status_history,
      created_at,
      updated_at,
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

  const notifiedCandidateIds = await listInterviewNotifiedCandidateIds(supabase, [normalizedCandidateId]);
  const resolvedStatus = resolveCandidateStatus(latestApplication, notifiedCandidateIds);

  if (
    latestApplication?.id &&
    resolvedStatus === CANDIDATE_STATUS.interview &&
    normalizeCandidateStatus(latestApplication.status) !== CANDIDATE_STATUS.interview
  ) {
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        status: resolvedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', latestApplication.id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    latestApplication.status = resolvedStatus;
  }

  const candidate = mapCandidate(user, latestApplication || null, notifiedCandidateIds);

  if (latestApplication?.id) {
    const { data: historyEntry, error: historyError } = await supabase
      .from('interview_history')
      .select('final_status, fit_level, note, evaluated_at')
      .eq('application_id', latestApplication.id)
      .maybeSingle();

    if (historyError && !isInterviewHistoryMissingError(historyError)) {
      throw new Error(historyError.message);
    }

    if (historyEntry) {
      candidate.decisionStatus = historyEntry.final_status || candidate.decisionStatus;
      candidate.decisionAt = historyEntry.evaluated_at || candidate.decisionAt;
      candidate.decisionNote = historyEntry.note || candidate.decisionNote;
      candidate.fitLevel = historyEntry.fit_level || '';
    }
  }

  return candidate;
}

export async function updateCandidate(candidateId, updates) {
  const supabase = getSupabase();
  const normalizedCandidateId = String(candidateId || '').trim();

  const { data: latestApplication, error } = await supabase
    .from('applications')
    .select('id, candidate_id, job_id, status, status_history')
    .eq('candidate_id', normalizedCandidateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!latestApplication) {
    return null;
  }

  const now = new Date().toISOString();
  const nextStatus = typeof updates.status === 'string' && updates.status.trim()
    ? normalizeCandidateStatus(updates.status)
    : '';
  const rawUpdatedBy = String(updates.updatedBy || '').trim();
  const note = String(updates.note || '').trim();
  const fitLevel = String(updates.fitLevel || '').trim();
  const payload = {};

  if (nextStatus) {
    payload.status = nextStatus;
    payload.status_history = appendStatusHistory(
      latestApplication.status_history,
      buildStatusHistoryEntry({
        status: nextStatus,
        updatedBy: rawUpdatedBy || 'admin-internal',
        note,
        updatedAt: now,
      }),
    );
  }

  if (typeof updates.healthCertificateFileName === 'string' && updates.healthCertificateFileName.trim()) {
    payload.health_path = buildRelativePath(latestApplication.id, updates.healthCertificateFileName.trim());
  }

  if (!Object.keys(payload).length) {
    return getCandidateById(normalizedCandidateId);
  }

  payload.updated_at = now;

  const { error: updateError } = await supabase
    .from('applications')
    .update(payload)
    .eq('id', latestApplication.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const interviewPatch = {};
  let interviewResult = '';

  if (nextStatus === CANDIDATE_STATUS.approved) {
    interviewPatch.result = 'Pass';
    interviewResult = 'Pass';
  }

  if (nextStatus === CANDIDATE_STATUS.failed) {
    interviewPatch.result = 'Fail';
    interviewResult = 'Fail';
  }

  if (note) {
    interviewPatch.comments = note;
  }

  if (Object.keys(interviewPatch).length) {
    interviewPatch.updated_at = now;
    const { error: interviewError } = await supabase
      .from('interviews')
      .update(interviewPatch)
      .eq('application_id', latestApplication.id);

    if (interviewError) {
      throw new Error(interviewError.message);
    }
  }

  if (FINAL_HISTORY_STATUSES.has(nextStatus)) {
    const evaluatedBy =
      rawUpdatedBy && rawUpdatedBy !== 'admin-internal'
        ? rawUpdatedBy
        : await resolveAdminDatabaseId(normalizedCandidateId);

    const historyPayload = {
      application_id: latestApplication.id,
      candidate_id: latestApplication.candidate_id,
      job_id: latestApplication.job_id,
      final_status: nextStatus,
      interview_result: interviewResult || (nextStatus === CANDIDATE_STATUS.approved ? 'Pass' : 'Fail'),
      fit_level: fitLevel || null,
      note: note || null,
      evaluated_by: evaluatedBy || null,
      evaluated_at: now,
      updated_at: now,
    };

    const { error: historyError } = await supabase
      .from('interview_history')
      .upsert(historyPayload, { onConflict: 'application_id' });

    if (historyError && !isInterviewHistoryMissingError(historyError)) {
      throw new Error(historyError.message);
    }
  }

  return getCandidateById(normalizedCandidateId);
}

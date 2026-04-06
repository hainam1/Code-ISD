import { randomUUID } from 'node:crypto';
import { getSupabase } from '../config/supabase.js';
import { resolveAdminDatabaseId } from '../utils/admin.js';

function normalizeText(value) {
  return String(value || '').trim();
}

function formatDisplayDate(value) {
  if (!value) {
    return '';
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function mapInterview(interview) {
  return {
    id: interview.id,
    interviewId: interview.id,
    interviewDate: interview.interview_date,
    displayDate: formatDisplayDate(interview.interview_date),
    interviewTime: interview.interview_time,
    location: interview.interview_location,
    rawDate: interview.scheduled_start_at ? String(interview.scheduled_start_at).slice(0, 10) : interview.interview_date,
    result: interview.result || 'Pending',
    comments: interview.comments || '',
  };
}

export async function getCandidateInterview(candidateId) {
  const supabase = getSupabase();
  const { data: latestApplication, error: applicationError } = await supabase
    .from('applications')
    .select('id')
    .eq('candidate_id', normalizeText(candidateId))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (applicationError) {
    throw new Error(applicationError.message);
  }
  if (!latestApplication) {
    return null;
  }

  const { data, error } = await supabase.from('interviews').select('*').eq('application_id', latestApplication.id).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ? mapInterview(data) : null;
}

export async function upsertCandidateInterview({ candidateId, interviewDate, interviewTime, location, scheduledBy }) {
  const supabase = getSupabase();
  const normalizedCandidateId = normalizeText(candidateId);
  const normalizedDate = normalizeText(interviewDate);
  const normalizedTime = normalizeText(interviewTime);
  const normalizedLocation = normalizeText(location);

  if (!normalizedCandidateId || !normalizedDate || !normalizedTime || !normalizedLocation) {
    throw new Error('Thiếu dữ liệu lịch phỏng vấn.');
  }

  const { data: latestApplication, error: appError } = await supabase
    .from('applications')
    .select('id, candidate_id, job_id')
    .eq('candidate_id', normalizedCandidateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (appError) {
    throw new Error(appError.message);
  }
  if (!latestApplication) {
    throw new Error('Không tìm thấy hồ sơ ứng tuyển để gắn lịch phỏng vấn.');
  }

  const schedulerId =
    normalizeText(scheduledBy) === 'admin-internal'
      ? await resolveAdminDatabaseId(latestApplication.candidate_id)
      : normalizeText(scheduledBy) || (await resolveAdminDatabaseId(latestApplication.candidate_id));

  const now = new Date().toISOString();
  const payload = {
    application_id: latestApplication.id,
    candidate_id: latestApplication.candidate_id,
    job_id: latestApplication.job_id,
    scheduled_start_at: `${normalizedDate}T${normalizedTime.slice(0, 5)}:00`,
    interview_date: normalizedDate,
    interview_time: normalizedTime,
    interview_location: normalizedLocation,
    scheduled_by: schedulerId,
    updated_at: now,
  };

  const { data: existingInterview, error: existingInterviewError } = await supabase
    .from('interviews')
    .select('id')
    .eq('application_id', latestApplication.id)
    .maybeSingle();

  if (existingInterviewError) {
    throw new Error(existingInterviewError.message);
  }

  const interviewMutation = existingInterview?.id
    ? supabase
        .from('interviews')
        .update(payload)
        .eq('id', existingInterview.id)
    : supabase.from('interviews').insert([
        {
          id: randomUUID(),
          ...payload,
          created_at: now,
        },
      ]);

  const { data, error } = await interviewMutation.select('*').single();
  if (error) {
    throw new Error(error.message);
  }

  const { error: statusError } = await supabase
    .from('applications')
    .update({ status: 'Interview Scheduled', updated_at: new Date().toISOString() })
    .eq('id', latestApplication.id);

  if (statusError) {
    throw new Error(statusError.message);
  }

  return mapInterview(data);
}

import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() || 'admin@gmail.com';
const ADMIN_NAME = 'Admin tuyen dung';

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

function toInterviewResponse(interview) {
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

async function resolveSchedulerId(supabase, scheduledBy, candidateId) {
  const normalizedScheduledBy = normalizeText(scheduledBy);

  if (normalizedScheduledBy) {
    const { data: scheduler } = await supabase
      .from('users')
      .select('id')
      .eq('id', normalizedScheduledBy)
      .limit(1)
      .single();

    if (scheduler?.id) {
      return scheduler.id;
    }
  }

  const { data: adminUser } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'ADMIN')
    .limit(1)
    .single();

  if (adminUser?.id) {
    return adminUser.id;
  }

  const { data: adminByEmail } = await supabase
    .from('users')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .limit(1)
    .maybeSingle();

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
        email: ADMIN_EMAIL,
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
    const { data: conflictedAdmin } = await supabase
      .from('users')
      .select('id')
      .eq('email', ADMIN_EMAIL)
      .limit(1)
      .maybeSingle();

    if (conflictedAdmin?.id) {
      return conflictedAdmin.id;
    }
  }

  if (insertAdminError) {
    throw new Error(insertAdminError.message);
  }

  return candidateId;
}

export async function upsertCandidateInterview({
  candidateId,
  interviewDate,
  interviewTime,
  location,
  scheduledBy = 'admin-internal',
}) {
  const supabase = createClient();
  const normalizedCandidateId = normalizeText(candidateId);
  const normalizedDate = normalizeText(interviewDate);
  const normalizedTime = normalizeText(interviewTime);
  const normalizedLocation = normalizeText(location);

  if (!normalizedCandidateId || !normalizedDate || !normalizedTime || !normalizedLocation) {
    throw new Error('Thiếu dữ liệu lịch phỏng vấn.');
  }

  const { data: latestApplication, error: applicationError } = await supabase
    .from('applications')
    .select('id, candidate_id, job_id')
    .eq('candidate_id', normalizedCandidateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (applicationError || !latestApplication) {
    throw new Error('Không tìm thấy hồ sơ ứng tuyển để gắn lịch phỏng vấn.');
  }

  const schedulerId = await resolveSchedulerId(supabase, scheduledBy, latestApplication.candidate_id);
  const scheduledStartAt = `${normalizedDate}T${normalizedTime.slice(0, 5)}:00`;
  const now = new Date().toISOString();
  const interviewPayload = {
    application_id: latestApplication.id,
    candidate_id: latestApplication.candidate_id,
    job_id: latestApplication.job_id,
    scheduled_start_at: scheduledStartAt,
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
        .update(interviewPayload)
        .eq('id', existingInterview.id)
    : supabase.from('interviews').insert([
        {
          id: randomUUID(),
          ...interviewPayload,
          created_at: now,
        },
      ]);

  const { data: interview, error: interviewError } = await interviewMutation.select('*').single();

  if (interviewError || !interview) {
    throw new Error(interviewError?.message || 'Không thể lưu lịch phỏng vấn.');
  }

  const { error: statusError } = await supabase
    .from('applications')
    .update({
      status: 'Interview Scheduled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', latestApplication.id);

  if (statusError) {
    throw new Error(statusError.message);
  }

  return toInterviewResponse(interview);
}

export async function getCandidateInterview(candidateId) {
  const supabase = createClient();
  const normalizedCandidateId = normalizeText(candidateId);

  if (!normalizedCandidateId) {
    return null;
  }

  const { data: latestApplication } = await supabase
    .from('applications')
    .select('id')
    .eq('candidate_id', normalizedCandidateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!latestApplication) {
    return null;
  }

  const { data: interview, error } = await supabase
    .from('interviews')
    .select('*')
    .eq('application_id', latestApplication.id)
    .single();

  if (error || !interview) {
    return null;
  }

  return toInterviewResponse(interview);
}

import { randomUUID } from 'node:crypto';
import { getSupabase } from '../config/supabase.js';

function normalizeText(value) {
  return String(value || '').trim();
}

async function updateCandidateStatusToInterview(supabase, candidateId) {
  const normalizedCandidateId = normalizeText(candidateId);

  if (!normalizedCandidateId) {
    return;
  }

  const { data: latestApplication, error: applicationError } = await supabase
    .from('applications')
    .select('id')
    .eq('candidate_id', normalizedCandidateId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (applicationError || !latestApplication?.id) {
    return;
  }

  await supabase
    .from('applications')
    .update({ status: 'Interview Scheduled', updated_at: new Date().toISOString() })
    .eq('id', latestApplication.id);
}

function mapNotification(item) {
  return {
    id: item.id,
    userId: item.user_id,
    type: item.type,
    title: item.title,
    message: item.message,
    interview: item.payload,
    isRead: item.is_read,
    createdAt: item.created_at,
    readAt: item.read_at,
  };
}

export async function listNotifications(userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', normalizeText(userId))
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return (data || []).map(mapNotification);
}

export async function createInterviewNotification(input) {
  const supabase = getSupabase();
  const userId = normalizeText(input.userId || input.candidateId);
  const interviewId = normalizeText(input.interviewId);

  const { data: existing, error: existingError } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('type', 'INTERVIEW_SCHEDULED')
    .contains('payload', { interviewId })
    .limit(1);

  if (existingError) {
    throw new Error(existingError.message);
  }
  if (existing?.length) {
    await updateCandidateStatusToInterview(supabase, userId);
    return { notification: mapNotification(existing[0]), created: false };
  }

  const row = {
    id: randomUUID(),
    user_id: userId,
    type: 'INTERVIEW_SCHEDULED',
    title: 'Thông báo lịch phỏng vấn',
    message: `Bạn có lịch phỏng vấn cho vị trí ${normalizeText(input.position)}.`,
    payload: {
      candidateId: userId,
      candidateName: normalizeText(input.candidateName) || 'Ứng viên',
      position: normalizeText(input.position),
      interviewDate: normalizeText(input.interviewDate),
      interviewTime: normalizeText(input.interviewTime),
      location: normalizeText(input.location),
      interviewId,
    },
    is_read: false,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('notifications').insert([row]).select().single();
  if (error) {
    throw new Error(error.message);
  }

  await updateCandidateStatusToInterview(supabase, userId);

  return { notification: mapNotification(data), created: true };
}

export async function markNotificationAsRead(notificationId, userId) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', notificationId)
    .eq('user_id', normalizeText(userId))
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data ? mapNotification(data) : null;
}

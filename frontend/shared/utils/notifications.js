import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';
import { CANDIDATE_STATUS } from '@/features/candidates/constants/statusOptions';

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
    .update({
      status: CANDIDATE_STATUS.interview,
      updated_at: new Date().toISOString(),
    })
    .eq('id', latestApplication.id);
}

export async function listUserNotifications(userId) {
  const supabase = createClient();
  const normalizedUserId = normalizeText(userId);

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', normalizedUserId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((item) => ({
    id: item.id,
    userId: item.user_id,
    type: item.type,
    title: item.title,
    message: item.message,
    interview: item.payload,
    isRead: item.is_read,
    createdAt: item.created_at,
    readAt: item.read_at,
  }));
}

export async function createInterviewNotification({
  userId,
  candidateId,
  candidateName,
  position,
  interviewDate,
  interviewTime,
  location,
  interviewId,
}) {
  const supabase = createClient();
  const normalizedUserId = normalizeText(userId || candidateId);
  const normalizedInterviewId = normalizeText(interviewId);

  if (!normalizedUserId) {
    throw new Error('Thiếu mã ứng viên để gửi thông báo.');
  }

  const { data: existing, error: errExisting } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', normalizedUserId)
    .eq('type', 'INTERVIEW_SCHEDULED')
    .contains('payload', { interviewId: normalizedInterviewId })
    .limit(1);

  if (!errExisting && existing && existing.length > 0) {
    const item = existing[0];
    await updateCandidateStatusToInterview(supabase, normalizedUserId);
    return {
      notification: {
        id: item.id,
        userId: item.user_id,
        type: item.type,
        title: item.title,
        message: item.message,
        interview: item.payload,
        isRead: item.is_read,
        createdAt: item.created_at,
      },
      created: false,
    };
  }

  const payload = {
    candidateId: normalizedUserId,
    candidateName: normalizeText(candidateName) || 'Ứng viên',
    position: normalizeText(position),
    interviewDate: normalizeText(interviewDate),
    interviewTime: normalizeText(interviewTime),
    location: normalizeText(location),
    interviewId: normalizedInterviewId,
  };

  const notificationRow = {
    id: randomUUID(),
    user_id: normalizedUserId,
    type: 'INTERVIEW_SCHEDULED',
    title: 'Thông báo lịch phỏng vấn',
    message: `Bạn có lịch phỏng vấn cho vị trí ${normalizeText(position)}.`,
    payload,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  const { data: inserted, error: insertError } = await supabase
    .from('notifications')
    .insert([notificationRow])
    .select()
    .single();

  if (insertError) {
    throw new Error(`Không thể tạo thông báo: ${insertError.message}`);
  }

  await updateCandidateStatusToInterview(supabase, normalizedUserId);

  return {
    notification: {
      id: inserted.id,
      userId: inserted.user_id,
      type: inserted.type,
      title: inserted.title,
      message: inserted.message,
      interview: inserted.payload,
      isRead: inserted.is_read,
      createdAt: inserted.created_at,
    },
    created: true,
  };
}

export async function markNotificationAsRead(notificationId, userId) {
  const supabase = createClient();

  const { data: updated, error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error || !updated) {
    return null;
  }

  return {
    id: updated.id,
    userId: updated.user_id,
    type: updated.type,
    title: updated.title,
    message: updated.message,
    interview: updated.payload,
    isRead: updated.is_read,
    createdAt: updated.created_at,
    readAt: updated.read_at,
  };
}

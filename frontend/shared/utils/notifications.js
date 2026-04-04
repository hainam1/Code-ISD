import { randomUUID } from 'node:crypto';
import { getDb } from '@/lib/db/database';

function sortNotifications(items) {
  return [...items].sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
}

function normalizeText(value) {
  return String(value || '').trim();
}

export async function listUserNotifications(userId) {
  const db = await getDb();
  const normalizedUserId = normalizeText(userId);
  return sortNotifications((db.data.notifications || []).filter((item) => item.userId === normalizedUserId));
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
  const db = await getDb();
  const normalizedUserId = normalizeText(userId || candidateId);
  const normalizedInterviewId = normalizeText(interviewId);

  if (!normalizedUserId) {
    throw new Error('Thiếu mã ứng viên để gửi thông báo.');
  }

  const recipient = (db.data.users || []).find((item) => item.id === normalizedUserId);
  if (!recipient) {
    throw new Error('Không tìm thấy tài khoản ứng viên nhận thông báo.');
  }

  if (!Array.isArray(db.data.notifications)) {
    db.data.notifications = [];
  }

  const existing = (db.data.notifications || []).find(
    (item) => item.userId === normalizedUserId && item.interview?.interviewId === normalizedInterviewId
  );

  if (existing) {
    return { notification: existing, created: false };
  }

  const notification = {
    id: randomUUID(),
    userId: normalizedUserId,
    type: 'INTERVIEW_SCHEDULED',
    title: 'Thông báo lịch phỏng vấn',
    message: `Bạn có lịch phỏng vấn cho vị trí ${normalizeText(position)}.`,
    interview: {
      candidateId: normalizedUserId,
      candidateName: normalizeText(candidateName) || recipient.fullName || 'Ứng viên',
      position: normalizeText(position),
      interviewDate: normalizeText(interviewDate),
      interviewTime: normalizeText(interviewTime),
      location: normalizeText(location),
      interviewId: normalizedInterviewId,
    },
    isRead: false,
    createdAt: new Date().toISOString(),
  };

  db.data.notifications.push(notification);
  await db.write();
  return { notification, created: true };
}

export async function markNotificationAsRead(notificationId, userId) {
  const db = await getDb();
  const notification = (db.data.notifications || []).find((item) => item.id === notificationId && item.userId === userId);

  if (!notification) {
    return null;
  }

  notification.isRead = true;
  notification.readAt = new Date().toISOString();
  await db.write();
  return notification;
}

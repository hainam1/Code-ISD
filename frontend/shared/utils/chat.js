import { randomUUID } from 'node:crypto';
import { getDb } from '@/lib/db/database';

const ADMIN_ID = 'admin-internal';
const ADMIN_NAME = 'Admin tuyển dụng';

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeRole(value) {
  return normalizeText(value).toUpperCase();
}

function sortMessages(messages) {
  return [...messages].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

function findUserById(users, userId) {
  if (userId === ADMIN_ID) {
    return {
      id: ADMIN_ID,
      fullName: ADMIN_NAME,
      name: ADMIN_NAME,
      role: 'ADMIN',
      email: 'admin@gmail.com',
    };
  }

  return (users || []).find((user) => user.id === userId) || null;
}

function buildParticipant(user) {
  return {
    id: user?.id || '',
    fullName: user?.fullName || user?.name || 'Người dùng',
    role: normalizeRole(user?.role || 'USER'),
    email: user?.email || '',
    phone: user?.phone || '',
    avatarUrl: user?.avatarUrl || '',
  };
}

function buildThreadSummary(thread, users, viewerId) {
  const participants = Array.isArray(thread.participants) ? thread.participants : [];
  const candidateId =
    thread.candidateId ||
    participants.find((participantId) => participantId !== ADMIN_ID) ||
    '';
  const candidate = buildParticipant(findUserById(users, candidateId));
  const lastMessage = sortMessages(thread.messages || []).at(-1) || null;
  const unreadCount = (thread.messages || []).filter(
    (message) => message.receiverId === viewerId && !message.isRead,
  ).length;

  return {
    id: thread.id,
    candidate,
    participantIds: participants,
    unreadCount,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          senderId: lastMessage.senderId,
          content: lastMessage.content,
          createdAt: lastMessage.createdAt,
        }
      : null,
    updatedAt: thread.updatedAt || thread.createdAt,
  };
}

function buildThreadDetail(thread, users) {
  const participants = Array.isArray(thread.participants) ? thread.participants : [];

  return {
    id: thread.id,
    candidate: buildParticipant(findUserById(users, thread.candidateId)),
    participants: participants.map((participantId) => buildParticipant(findUserById(users, participantId))),
    messages: sortMessages(thread.messages || []).map((message) => ({
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      createdAt: message.createdAt,
      isRead: Boolean(message.isRead),
    })),
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
  };
}

function ensureThreadCollection(db) {
  if (!Array.isArray(db.data.chatThreads)) {
    db.data.chatThreads = [];
  }
}

export async function listChatThreads({ viewerId, viewerRole }) {
  const db = await getDb();
  ensureThreadCollection(db);

  const normalizedViewerId = normalizeText(viewerId);
  const normalizedRole = normalizeRole(viewerRole);
  const users = db.data.users || [];

  let threads = db.data.chatThreads;
  if (normalizedRole !== 'ADMIN') {
    threads = threads.filter((thread) => normalizeText(thread.candidateId) === normalizedViewerId);
  }

  return threads
    .map((thread) => buildThreadSummary(thread, users, normalizedViewerId))
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export async function getChatThread({ threadId, viewerId, viewerRole }) {
  const db = await getDb();
  ensureThreadCollection(db);

  const normalizedViewerId = normalizeText(viewerId);
  const normalizedRole = normalizeRole(viewerRole);
  const normalizedThreadId = normalizeText(threadId);
  const users = db.data.users || [];

  let thread = null;
  if (normalizedRole === 'ADMIN') {
    thread = db.data.chatThreads.find((item) => item.id === normalizedThreadId) || null;
  } else {
    thread =
      db.data.chatThreads.find(
        (item) =>
          item.id === normalizedThreadId &&
          normalizeText(item.candidateId) === normalizedViewerId,
      ) || null;
  }

  if (!thread) {
    return null;
  }

  let hasChanges = false;
  for (const message of thread.messages || []) {
    if (message.receiverId === normalizedViewerId && !message.isRead) {
      message.isRead = true;
      message.readAt = new Date().toISOString();
      hasChanges = true;
    }
  }

  if (hasChanges) {
    thread.updatedAt = new Date().toISOString();
    await db.write();
  }

  return buildThreadDetail(thread, users);
}

export async function sendChatMessage({ senderId, senderRole, candidateId, threadId, content }) {
  const db = await getDb();
  ensureThreadCollection(db);

  const normalizedSenderId = normalizeText(senderId);
  const normalizedSenderRole = normalizeRole(senderRole);
  const normalizedCandidateId =
    normalizedSenderRole === 'ADMIN' ? normalizeText(candidateId) : normalizedSenderId;
  const normalizedContent = normalizeText(content);

  if (!normalizedSenderId || !normalizedContent || !normalizedCandidateId) {
    throw new Error('Thiếu dữ liệu để gửi tin nhắn.');
  }

  const users = db.data.users || [];
  const candidate = findUserById(users, normalizedCandidateId);
  if (!candidate || normalizedCandidateId === ADMIN_ID) {
    throw new Error('Không tìm thấy ứng viên để tạo cuộc trò chuyện.');
  }

  let thread =
    db.data.chatThreads.find((item) => item.id === normalizeText(threadId)) ||
    db.data.chatThreads.find((item) => normalizeText(item.candidateId) === normalizedCandidateId);

  if (!thread) {
    const createdAt = new Date().toISOString();
    thread = {
      id: randomUUID(),
      candidateId: normalizedCandidateId,
      participants: [ADMIN_ID, normalizedCandidateId],
      messages: [],
      createdAt,
      updatedAt: createdAt,
    };
    db.data.chatThreads.push(thread);
  }

  const receiverId = normalizedSenderRole === 'ADMIN' ? normalizedCandidateId : ADMIN_ID;
  const message = {
    id: randomUUID(),
    senderId: normalizedSenderId,
    receiverId,
    content: normalizedContent,
    createdAt: new Date().toISOString(),
    isRead: false,
    readAt: null,
  };

  thread.messages.push(message);
  thread.updatedAt = message.createdAt;
  await db.write();

  return {
    thread: buildThreadDetail(thread, users),
    summary: buildThreadSummary(thread, users, normalizedSenderId),
    message,
  };
}

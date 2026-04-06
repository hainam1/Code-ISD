import { randomUUID } from 'node:crypto';
import { createClient } from '@/lib/supabase/server';

const ADMIN_DISPLAY_ID = 'admin-internal';
const ADMIN_NAME = 'Admin tuyen dung';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() || 'admin@gmail.com';

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeRole(value) {
  return normalizeText(value).toUpperCase();
}

async function resolveAdminDatabaseId(fallbackCandidateId = null) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('role', 'ADMIN')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.id) {
    return data.id;
  }

  const { data: adminByEmail, error: adminByEmailError } = await supabase
    .from('users')
    .select('id')
    .eq('email', ADMIN_EMAIL)
    .limit(1)
    .maybeSingle();

  if (adminByEmailError) {
    throw new Error(adminByEmailError.message);
  }

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
    const { data: conflictedAdmin, error: conflictedAdminError } = await supabase
      .from('users')
      .select('id')
      .eq('email', ADMIN_EMAIL)
      .limit(1)
      .maybeSingle();

    if (conflictedAdminError) {
      throw new Error(conflictedAdminError.message);
    }

    if (conflictedAdmin?.id) {
      return conflictedAdmin.id;
    }
  }

  if (insertAdminError) {
    throw new Error(insertAdminError.message);
  }

  return fallbackCandidateId || null;
}

function toDisplayUserId(userId, adminDbId) {
  if (!userId) {
    return userId;
  }

  if (userId === ADMIN_DISPLAY_ID) {
    return ADMIN_DISPLAY_ID;
  }

  return userId && adminDbId && userId === adminDbId ? ADMIN_DISPLAY_ID : userId;
}

function mapThreadSummary(thread, viewerDisplayId, adminDbId) {
  const user = thread.users || {};
  const messages = [...(thread.chat_messages || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const lastMessage = messages[messages.length - 1];
  const unreadCount = messages.filter(
    (message) => toDisplayUserId(message.receiver_id, adminDbId) === viewerDisplayId && !message.is_read,
  ).length;

  return {
    id: thread.id,
    candidate: {
      id: thread.candidate_id,
      fullName: user.full_name || 'Ung vien',
      role: user.role || 'CANDIDATE',
      email: user.email || '',
      phone: user.phone || '',
      avatarUrl: user.avatar_url || '',
    },
    participantIds: [ADMIN_DISPLAY_ID, thread.candidate_id],
    unreadCount,
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          senderId: toDisplayUserId(lastMessage.sender_id, adminDbId),
          content: lastMessage.content,
          createdAt: lastMessage.created_at,
        }
      : null,
    updatedAt: thread.updated_at,
  };
}

async function fetchThreads({ viewerId, viewerRole }) {
  const supabase = createClient();
  const role = normalizeRole(viewerRole);
  const query = supabase
    .from('chat_threads')
    .select(`
      id,
      candidate_id,
      updated_at,
      created_at,
      users:candidate_id(id, full_name, email, phone, avatar_url, role),
      chat_messages(id, sender_id, receiver_id, content, created_at, is_read)
    `)
    .order('updated_at', { ascending: false });

  if (role !== 'ADMIN') {
    query.eq('candidate_id', normalizeText(viewerId));
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export async function listChatThreads({ viewerId, viewerRole }) {
  const adminDbId = await resolveAdminDatabaseId(normalizeText(viewerId));
  const viewerDisplayId = normalizeRole(viewerRole) === 'ADMIN' ? ADMIN_DISPLAY_ID : normalizeText(viewerId);
  const threads = await fetchThreads({ viewerId, viewerRole });
  return threads.map((thread) => mapThreadSummary(thread, viewerDisplayId, adminDbId));
}

export async function getChatThread({ threadId, viewerId, viewerRole }) {
  const supabase = createClient();
  const role = normalizeRole(viewerRole);
  const adminDbId = await resolveAdminDatabaseId(normalizeText(viewerId));
  const viewerDbId = role === 'ADMIN' ? adminDbId : normalizeText(viewerId);

  const query = supabase
    .from('chat_threads')
    .select(`
      id,
      candidate_id,
      updated_at,
      created_at,
      users:candidate_id(id, full_name, email, phone, avatar_url, role),
      chat_messages(id, sender_id, receiver_id, content, created_at, is_read)
    `)
    .eq('id', normalizeText(threadId));

  if (role !== 'ADMIN') {
    query.eq('candidate_id', normalizeText(viewerId));
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const messages = [...(data.chat_messages || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const unreadIds = messages
    .filter((message) => {
      if (message.is_read) {
        return false;
      }

      if (role === 'ADMIN') {
        return message.receiver_id === viewerDbId || message.receiver_id === ADMIN_DISPLAY_ID;
      }

      return message.receiver_id === viewerDbId;
    })
    .map((message) => message.id);

  if (unreadIds.length > 0) {
    await supabase
      .from('chat_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in('id', unreadIds);
  }

  const user = data.users || {};
  return {
    id: data.id,
    candidate: {
      id: data.candidate_id,
      fullName: user.full_name || 'Ung vien',
      role: user.role || 'CANDIDATE',
      email: user.email || '',
      phone: user.phone || '',
      avatarUrl: user.avatar_url || '',
    },
    participants: [
      { id: ADMIN_DISPLAY_ID, fullName: ADMIN_NAME, role: 'ADMIN', email: 'admin@gmail.com' },
      { id: data.candidate_id, fullName: user.full_name || 'Ung vien', role: user.role || 'CANDIDATE', email: user.email || '' },
    ],
    messages: messages.map((message) => ({
      id: message.id,
      senderId: toDisplayUserId(message.sender_id, adminDbId),
      receiverId: toDisplayUserId(message.receiver_id, adminDbId),
      content: message.content,
      createdAt: message.created_at,
      isRead: unreadIds.includes(message.id) ? true : message.is_read,
    })),
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function sendChatMessage({ senderId, senderRole, candidateId, threadId, content }) {
  const supabase = createClient();
  const role = normalizeRole(senderRole);
  const adminDbId = await resolveAdminDatabaseId(normalizeText(candidateId) || normalizeText(senderId));
  const senderDbId = role === 'ADMIN' ? adminDbId : normalizeText(senderId);
  const normalizedCandidateId = role === 'ADMIN' ? normalizeText(candidateId) : normalizeText(senderId);
  const normalizedContent = normalizeText(content);
  const now = new Date().toISOString();

  if (!senderDbId || !normalizedCandidateId || !normalizedContent) {
    throw new Error('Thieu du lieu de gui tin nhan.');
  }

  let activeThreadId = normalizeText(threadId);
  if (!activeThreadId) {
    const { data: existingThread, error: existingError } = await supabase
      .from('chat_threads')
      .select('id')
      .eq('candidate_id', normalizedCandidateId)
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    if (existingThread?.id) {
      activeThreadId = existingThread.id;
    } else {
      const { data: insertedThread, error: threadError } = await supabase
        .from('chat_threads')
        .insert([
          {
            id: randomUUID(),
            candidate_id: normalizedCandidateId,
            created_at: now,
            updated_at: now,
          },
        ])
        .select('id')
        .single();

      if (threadError) {
        throw new Error(threadError.message);
      }
      activeThreadId = insertedThread.id;
    }
  }

  const receiverId = role === 'ADMIN' ? normalizedCandidateId : adminDbId;
  const { error } = await supabase.from('chat_messages').insert([
    {
      id: randomUUID(),
      thread_id: activeThreadId,
      sender_id: senderDbId,
      receiver_id: receiverId,
      content: normalizedContent,
      is_read: false,
      created_at: now,
    },
  ]);

  if (error) {
    throw new Error(error.message);
  }

  await supabase
    .from('chat_threads')
    .update({ updated_at: now })
    .eq('id', activeThreadId);

  const thread = await getChatThread({
    threadId: activeThreadId,
    viewerId: role === 'ADMIN' ? ADMIN_DISPLAY_ID : normalizedCandidateId,
    viewerRole: role,
  });
  const summary = thread
    ? {
        id: thread.id,
        candidate: thread.candidate,
        participantIds: [ADMIN_DISPLAY_ID, thread.candidate.id],
        unreadCount: 0,
        lastMessage: thread.messages[thread.messages.length - 1] || null,
        updatedAt: thread.updatedAt,
      }
    : null;

  return { thread, summary };
}

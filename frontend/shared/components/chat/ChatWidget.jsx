'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getSession } from '@/features/auth/api/authApi';
import styles from './ChatWidget.module.css';

const REFRESH_INTERVAL_MS = 5000;

function ChatIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v6A2.5 2.5 0 0 1 16.5 15H11l-4.5 4v-4H7.5A2.5 2.5 0 0 1 5 12.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function formatTime(dateValue) {
  if (!dateValue) {
    return '';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(dateValue));
}

function mergeActiveThreadState(threads, activeThread) {
  if (!activeThread?.id) {
    return threads;
  }

  const lastMessage = activeThread.messages?.[activeThread.messages.length - 1] || null;
  return threads.map((thread) =>
    thread.id === activeThread.id
      ? {
          ...thread,
          unreadCount: 0,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                senderId: lastMessage.senderId,
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
              }
            : thread.lastMessage,
          updatedAt: activeThread.updatedAt || thread.updatedAt,
        }
      : thread,
  );
}

async function requestChat(params) {
  const searchParams = new URLSearchParams(params);
  const response = await fetch(`/api/chat?${searchParams.toString()}`, { cache: 'no-store' });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message || 'Không thể tải chat.');
  }

  return payload;
}

export default function ChatWidget() {
  const [session, setSession] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [selectedThreadId, setSelectedThreadId] = useState('');
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messageListRef = useRef(null);

  useEffect(() => {
    function syncSession() {
      setSession(getSession());
    }

    syncSession();
    window.addEventListener('smart-guard-session-changed', syncSession);
    window.addEventListener('storage', syncSession);

    return () => {
      window.removeEventListener('smart-guard-session-changed', syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  const viewer = session?.user || null;
  const role = String(viewer?.role || '').toUpperCase();
  const isAdmin = role === 'ADMIN';

  useEffect(() => {
    if (!viewer?.id) {
      setThreads([]);
      setActiveThread(null);
      setSelectedThreadId('');
      return;
    }

    let active = true;

    async function loadChat(explicitThreadId = '') {
      try {
        const payload = await requestChat({
          viewerId: viewer.id,
          viewerRole: role,
          ...(explicitThreadId ? { threadId: explicitThreadId } : {}),
        });

        if (!active) {
          return;
        }

        const nextThreads = Array.isArray(payload.threads) ? payload.threads : [];
        setThreads(mergeActiveThreadState(nextThreads, payload.activeThread));

        const fallbackThreadId = explicitThreadId || selectedThreadId || '';

        if (payload.activeThread) {
          setActiveThread(payload.activeThread);
        } else if (!isOpen || !fallbackThreadId) {
          setActiveThread(null);
        }
      } catch {
        if (active) {
          setThreads([]);
        }
      }
    }

    const requestedThreadId = isOpen ? selectedThreadId : '';
    loadChat(requestedThreadId);
    const intervalId = window.setInterval(
      () => loadChat(isOpen ? selectedThreadId : ''),
      REFRESH_INTERVAL_MS,
    );

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [viewer?.id, role, isAdmin, selectedThreadId, isOpen]);

  useEffect(() => {
    const list = messageListRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [activeThread, isOpen]);

  const unreadCount = useMemo(
    () => threads.reduce((sum, thread) => sum + Number(thread.unreadCount || 0), 0),
    [threads],
  );

  const title = isAdmin ? 'Hộp thư ứng viên' : 'Chat với admin';
  const subtitle = isAdmin
    ? 'Chọn ứng viên để đọc và phản hồi nhanh.'
    : 'Trao đổi trực tiếp với bộ phận tuyển dụng.';

  async function handleSelectThread(threadId) {
    if (!viewer?.id || !threadId) {
      return;
    }

    setSelectedThreadId(threadId);
    const payload = await requestChat({
      viewerId: viewer.id,
      viewerRole: role,
      threadId,
    });
    setThreads(mergeActiveThreadState(Array.isArray(payload.threads) ? payload.threads : [], payload.activeThread));
    setActiveThread(payload.activeThread || null);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!viewer?.id || !draft.trim() || isSending) {
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: viewer.id,
          senderRole: role,
          threadId: activeThread?.id || selectedThreadId,
          candidateId: isAdmin ? activeThread?.candidate?.id : viewer.id,
          content: draft.trim(),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.message || 'Không thể gửi tin nhắn.');
      }

      setDraft('');
      setActiveThread(payload.thread || null);
      setSelectedThreadId(payload.thread?.id || '');
      setThreads((current) => {
        const nextSummary = payload.summary;
        if (!nextSummary) {
          return current;
        }

        const remaining = current.filter((item) => item.id !== nextSummary.id);
        return [nextSummary, ...remaining];
      });
      setIsOpen(true);
    } finally {
      setIsSending(false);
    }
  }

  if (!viewer?.id) {
    return null;
  }

  function handleToggleOpen() {
    if (!isOpen && !selectedThreadId && !isAdmin && threads[0]?.id) {
      setSelectedThreadId(threads[0].id);
    }

    setIsOpen((value) => !value);
  }

  const canReply = !isAdmin || Boolean(activeThread?.candidate?.id);

  return (
    <>
      {isOpen ? (
        <section className={`${styles.panel} ${isAdmin ? styles.panelAdmin : ''}`} aria-label={title}>
          <header className={styles.header}>
            <div className={styles.headerCopy}>
              <p className={styles.eyebrow}>Smart Guard</p>
              <h2 className={styles.title}>{title}</h2>
              <p className={styles.subtitle}>{subtitle}</p>
            </div>
            <button type="button" className={styles.closeButton} onClick={() => setIsOpen(false)} aria-label="Đóng chatbox">
              <CloseIcon />
            </button>
          </header>

          {isAdmin ? (
            <aside className={styles.threadList}>
              <div className={styles.threadListHeader}>
                <p className={styles.threadListTitle}>Ứng viên đang nhắn</p>
              </div>
              {threads.length > 0 ? (
                threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    className={`${styles.threadButton} ${thread.id === selectedThreadId ? styles.threadButtonActive : ''}`}
                    onClick={() => handleSelectThread(thread.id)}
                  >
                    <div className={styles.threadMeta}>
                      <p className={styles.threadName}>{thread.candidate?.fullName || 'Ứng viên'}</p>
                      <p className={styles.threadTime}>{formatTime(thread.lastMessage?.createdAt || thread.updatedAt)}</p>
                    </div>
                    {thread.lastMessage ? (
                      <p className={styles.threadPreview}>{thread.lastMessage.content}</p>
                    ) : (
                      <p className={styles.threadEmpty}>Chưa có nội dung.</p>
                    )}
                    {thread.unreadCount > 0 ? <span className={styles.threadBadge}>{thread.unreadCount}</span> : null}
                  </button>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <div>
                    <p className={styles.emptyTitle}>Chưa có hội thoại</p>
                    <p className={styles.emptyText}>Khi ứng viên nhắn câu hỏi, tên của họ sẽ xuất hiện ở đây.</p>
                  </div>
                </div>
              )}
            </aside>
          ) : null}

          <div className={styles.conversation}>
            <div className={styles.conversationHeader}>
              <p className={styles.conversationTitle}>
                {isAdmin
                  ? activeThread?.candidate?.fullName || 'Chọn ứng viên'
                  : activeThread?.participants?.find((participant) => participant.role === 'ADMIN')?.fullName || 'Admin tuyển dụng'}
              </p>
            </div>

            {activeThread?.messages?.length ? (
              <div ref={messageListRef} className={styles.messageList}>
                {activeThread.messages.map((message) => {
                  const isOutgoing = message.senderId === viewer.id;
                  const author =
                    activeThread.participants?.find((participant) => participant.id === message.senderId)?.fullName ||
                    'Người dùng';

                  return (
                    <article
                      key={message.id}
                      className={`${styles.messageItem} ${isOutgoing ? styles.messageOutgoing : ''}`}
                    >
                      <p className={styles.messageAuthor}>{author}</p>
                      <p className={styles.messageText}>{message.content}</p>
                      <p className={styles.messageMeta}>{formatTime(message.createdAt)}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <div>
                  <p className={styles.emptyTitle}>
                    {isAdmin ? 'Chọn một cuộc trò chuyện' : 'Bắt đầu trao đổi với admin'}
                  </p>
                  <p className={styles.emptyText}>
                    {isAdmin
                      ? 'Danh sách bên trái sẽ mở nội dung câu hỏi của từng ứng viên.'
                      : 'Gửi câu hỏi về hồ sơ, lịch phỏng vấn hoặc công việc để nhận phản hồi trực tiếp.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className={styles.composer}>
            <form className={styles.composerForm} onSubmit={handleSubmit}>
              <textarea
                className={styles.composerInput}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={isAdmin ? 'Nhập phản hồi cho ứng viên...' : 'Nhập câu hỏi cho admin...'}
                disabled={!canReply || isSending}
              />
              <div className={styles.composerActions}>
                <p className={styles.composerNote}>
                  {isAdmin && !activeThread?.candidate?.id
                    ? 'Chọn ứng viên trước khi trả lời.'
                    : 'Tin nhắn sẽ hiển thị ngay trong hộp chat của bên còn lại.'}
                </p>
                <button type="submit" className={styles.sendButton} disabled={!draft.trim() || !canReply || isSending}>
                  {isSending ? 'Đang gửi...' : 'Gửi tin nhắn'}
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : null}

      <button type="button" className={styles.launcher} onClick={handleToggleOpen} aria-label={title}>
        <ChatIcon />
        <span className={styles.launcherLabel}>Chat</span>
        {unreadCount > 0 ? <span className={styles.launcherBadge}>{unreadCount}</span> : null}
      </button>
    </>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getSession, logout } from '@/features/auth/api/authApi';
import styles from './AppHeader.module.css';

const NOTIFICATION_REFRESH_MS = 5000;

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2 4 5v6.5c0 5.1 3.4 9.6 8 10.8 4.6-1.2 8-5.7 8-10.8V5l-8-3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M9 12.2 11 14l4-4.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M15 17H9m9-1V11a6 6 0 1 0-12 0v5l-1.2 1.8A1 1 0 0 0 5.6 19h12.8a1 1 0 0 0 .8-1.2L18 16Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M10.6 19a1.7 1.7 0 0 0 2.8 0" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6H6.5A2.5 2.5 0 0 0 4 8.5v7A2.5 2.5 0 0 0 6.5 18H9" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13 8l4 4-4 4M17 12H9" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function formatCreatedAt(dateValue) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateValue));
}

function getSessionSnapshot() {
  return getSession();
}

function formatNotificationTitle(notification) {
  if (notification?.type === 'INTERVIEW_SCHEDULED') {
    return 'Thông báo lịch phỏng vấn';
  }

  return notification?.title || 'Thông báo';
}

function formatNotificationMessage(notification) {
  if (notification?.type === 'INTERVIEW_SCHEDULED') {
    const position = String(notification?.interview?.position || '').trim();
    return position
      ? `Bạn có lịch phỏng vấn cho vị trí ${position}.`
      : 'Bạn có lịch phỏng vấn mới.';
  }

  return notification?.message || '';
}

export default function AppHeader() {
  const [session, setSession] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const pathname = usePathname();

  useEffect(() => {
    function syncSession() {
      setSession(getSessionSnapshot());
    }

    syncSession();
    window.addEventListener('smart-guard-session-changed', syncSession);
    window.addEventListener('storage', syncSession);

    return () => {
      window.removeEventListener('smart-guard-session-changed', syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      if (!session?.user?.id || session?.user?.role === 'ADMIN') {
        setNotifications([]);
        return;
      }

      try {
        const response = await fetch(`/api/notifications?userId=${session.user.id}`, {
          cache: 'no-store',
        });
        const payload = await response.json();

        if (!active) {
          return;
        }

        setNotifications(Array.isArray(payload.notifications) ? payload.notifications : []);
      } catch {
        if (active) {
          setNotifications([]);
        }
      }
    }

    loadNotifications();

    if (!session?.user?.id || session?.user?.role === 'ADMIN') {
      return () => {
        active = false;
      };
    }

    const intervalId = window.setInterval(loadNotifications, NOTIFICATION_REFRESH_MS);

    function handleWindowFocus() {
      loadNotifications();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        loadNotifications();
      }
    }

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  async function handleNotificationClick(notification) {
    if (!session?.user?.id) {
      return;
    }

    if (!notification.isRead) {
      await fetch(`/api/notifications/${notification.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session.user.id }),
      });

      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item))
      );
    }

    setSelectedNotification(notification);
    setIsOpen(false);
  }

  function handleLogout() {
    logout();
    window.location.href = '/login';
  }

  const fullName = session?.user?.fullName || session?.user?.name || 'User';
  const avatarUrl = session?.user?.avatarUrl || '';
  const avatarInitial = fullName.charAt(0).toUpperCase();

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          <Link href="/jobs" className={styles.brand}>
            <span className={styles.brandIcon}>
              <ShieldIcon />
            </span>
            Smart Guard
          </Link>

          <div className={styles.rightActions}>
            <div className={styles.notificationWrap}>
              <button type="button" className={styles.iconButton} aria-label="Thông báo" onClick={() => setIsOpen((value) => !value)}>
                <BellIcon />
                {unreadCount > 0 ? <span className={styles.notificationBadge}>{unreadCount}</span> : null}
              </button>

              {isOpen ? (
                <div className={styles.notificationPanel}>
                  <div className={styles.notificationPanelHeader}>Thông báo</div>
                  {notifications.length > 0 ? (
                    <div className={styles.notificationList}>
                      {notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          className={notification.isRead ? styles.notificationItem : styles.notificationItemUnread}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <span className={styles.notificationTitle}>{formatNotificationTitle(notification)}</span>
                          <span className={styles.notificationMessage}>{formatNotificationMessage(notification)}</span>
                          <span className={styles.notificationMeta}>{formatCreatedAt(notification.createdAt)}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.notificationEmpty}>Chưa có thông báo.</div>
                  )}
                </div>
              ) : null}
            </div>

            <nav className={styles.rightMenu}>
              <Link
                href="/jobs"
                className={`${styles.menuButton} ${
                  pathname.startsWith('/jobs') ? styles.menuButtonActive : ''
                }`}
              >
                Công việc
              </Link>
              <Link
                href="/profile"
                className={`${styles.menuButton} ${
                  pathname.startsWith('/profile') ? styles.menuButtonActive : ''
                }`}
              >
                Hồ sơ
              </Link>
            </nav>

            <Link href="/profile" className={styles.avatarLink} aria-label="Hồ sơ người dùng">
              <span
                className={styles.avatar}
                style={avatarUrl ? { backgroundImage: `url(${avatarUrl})` } : undefined}
              >
                {avatarUrl ? null : avatarInitial}
              </span>
            </Link>

            <button type="button" className={styles.logoutButton} onClick={handleLogout}>
              Đăng xuất
              <span className={styles.logoutIcon}>
                <LogoutIcon />
              </span>
            </button>
          </div>
        </div>
      </header>

      {selectedNotification ? (
        <div className={styles.modalOverlay}>
          <div className={styles.notificationModal}>
            <div className={styles.notificationModalHeader}>
              <h2 className={styles.notificationModalTitle}>Thông tin lịch phỏng vấn</h2>
              <button type="button" className={styles.closeButton} onClick={() => setSelectedNotification(null)}>
                Đóng
              </button>
            </div>
            <div className={styles.notificationDetailGrid}>
              <div className={styles.notificationDetailCard}>
                <span className={styles.notificationDetailLabel}>Ứng viên</span>
                <strong>{selectedNotification.interview?.candidateName || fullName || 'Ứng viên'}</strong>
              </div>
              <div className={styles.notificationDetailCard}>
                <span className={styles.notificationDetailLabel}>Vị trí</span>
                <strong>{selectedNotification.interview?.position || 'N/A'}</strong>
              </div>
              <div className={styles.notificationDetailCard}>
                <span className={styles.notificationDetailLabel}>Ngày phỏng vấn</span>
                <strong>{selectedNotification.interview?.interviewDate || 'N/A'}</strong>
              </div>
              <div className={styles.notificationDetailCard}>
                <span className={styles.notificationDetailLabel}>Giờ phỏng vấn</span>
                <strong>{selectedNotification.interview?.interviewTime || 'N/A'}</strong>
              </div>
              <div className={styles.notificationDetailCard}>
                <span className={styles.notificationDetailLabel}>Địa điểm</span>
                <strong>{selectedNotification.interview?.location || 'N/A'}</strong>
              </div>
              <div className={styles.notificationDetailCard}>
                <span className={styles.notificationDetailLabel}>Interview ID</span>
                <strong>{selectedNotification.interview?.interviewId || 'N/A'}</strong>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_ROUTES } from '@/lib/constants/routes';
import ActionButtons from '@/shared/components/admin/ActionButtons';
import AdminHeader from '@/shared/components/admin/AdminHeader';
import CandidateInfoRow from '@/features/candidates/components/admin/CandidateInfoRow';
import InfoAlert from '@/shared/components/admin/InfoAlert';
import InterviewStatusBadge from '@/features/interviews/components/InterviewStatusBadge';
import SuccessCard from '@/shared/components/admin/SuccessCard';
import styles from '@/shared/components/admin/AdminDashboard.module.css';

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 11.5 20 4l-4.5 16-3.5-6-8-2.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M7 3v3M17 3v3M4 9h16M5.5 5.5h13A1.5 1.5 0 0 1 20 7v11.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5V7a1.5 1.5 0 0 1 1.5-1.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5v5l3.5 2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20s6-4.8 6-10a6 6 0 1 0-12 0c0 5.2 6 10 6 10Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function InterviewSuccessView({ interview }) {
  const router = useRouter();
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isSendingNotification, setIsSendingNotification] = useState(false);
  const [isNotificationSent, setIsNotificationSent] = useState(false);

  const editHref =
    `${ADMIN_ROUTES.interviewEdit}?candidateId=${interview.candidateId}` +
    `&candidateName=${encodeURIComponent(interview.candidateName)}` +
    `&position=${encodeURIComponent(interview.position)}` +
    `&interviewId=${encodeURIComponent(interview.interviewId)}` +
    `&date=${encodeURIComponent(interview.rawDate || '2023-10-24')}` +
    `&time=${encodeURIComponent(interview.interviewTime)}` +
    `&location=${encodeURIComponent(interview.location)}`;

  function handleCancelConfirm() {
    setIsCancelOpen(false);
    router.push(ADMIN_ROUTES.candidates);
  }

  async function handleSendNotification() {
    if (isNotificationSent) {
      return;
    }

    setIsSendingNotification(true);
    setNotificationMessage('');

    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: interview.candidateId,
          candidateId: interview.candidateId,
          candidateName: interview.candidateName,
          position: interview.position,
          interviewDate: interview.interviewDate,
          interviewTime: interview.interviewTime,
          location: interview.location,
          interviewId: interview.interviewId,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setNotificationMessage(payload?.message || 'Không thể gửi thông báo lịch phỏng vấn.');
        return;
      }

      setIsNotificationSent(true);
      setNotificationMessage(payload?.message || 'Đã gửi thông báo lịch phỏng vấn cho ứng viên.');
    } catch {
      setNotificationMessage('Không thể gửi thông báo lịch phỏng vấn.');
    } finally {
      setIsSendingNotification(false);
    }
  }

  return (
    <div className={styles.screen}>
      <AdminHeader />
      <main className={styles.successLayout}>
        <div className={styles.pageTopActions}>
          <Link href={ADMIN_ROUTES.candidates} className={styles.secondaryButton}>
            <span className={styles.buttonIcon}>
              <BackIcon />
            </span>
            Quay lại trang
          </Link>
        </div>

        <nav className={styles.breadcrumb}>
          <Link href={ADMIN_ROUTES.candidates} className={styles.breadcrumbLink}>
            Ứng viên
          </Link>
          <span className={styles.breadcrumbDivider}>{'>'}</span>
          <Link href={ADMIN_ROUTES.candidateDetail(interview.candidateId)} className={styles.breadcrumbLink}>
            {interview.candidateName}
          </Link>
          <span className={styles.breadcrumbDivider}>{'>'}</span>
          <span className={styles.breadcrumbCurrent}>Xác nhận lịch phỏng vấn</span>
        </nav>

        <SuccessCard
          header={
            <div className={styles.successHeader}>
              <InterviewStatusBadge />
              <span className={styles.interviewId}>ID: {interview.interviewId}</span>
            </div>
          }
          title="Lên lịch phỏng vấn"
          description="Lịch phỏng vấn đã được tạo. Bạn có thể gửi thông báo để ứng viên nhận được lịch phỏng vấn trong mục thông báo."
        >
          <div className={styles.interviewInfoCard}>
            <CandidateInfoRow label="Ứng viên" value={interview.candidateName} emphasizeAvatar />
            <CandidateInfoRow label="Vị trí" value={interview.position} />
            <CandidateInfoRow label="Ngày phỏng vấn" value={interview.interviewDate} icon={<CalendarIcon />} />
            <CandidateInfoRow label="Giờ phỏng vấn" value={interview.interviewTime} icon={<ClockIcon />} />
            <CandidateInfoRow label="Địa điểm" value={interview.location} icon={<LocationIcon />} />
          </div>

          <ActionButtons editHref={editHref} onCancel={() => setIsCancelOpen(true)} />
        </SuccessCard>

        <InfoAlert>
          Nếu cần thay đổi thời gian hoặc địa điểm phỏng vấn, vui lòng chọn "Chỉnh sửa lịch phỏng vấn".
        </InfoAlert>

        <div className={styles.notificationSection}>
          <button
            type="button"
            className={`${styles.detailButton} ${styles.fullWidthButton} ${isNotificationSent ? styles.disabledButton : ''}`}
            onClick={handleSendNotification}
            disabled={isSendingNotification || isNotificationSent}
          >
            <span className={styles.buttonIcon}>
              <SendIcon />
            </span>
            {isSendingNotification
              ? 'Đang gửi thông báo...'
              : isNotificationSent
                ? 'Đã gửi thông báo lịch phỏng vấn'
                : 'Gửi thông báo lịch phỏng vấn cho ứng viên'}
          </button>
          {notificationMessage ? (
            <p className={`${styles.feedbackText} ${notificationMessage.includes('Không thể') ? styles.feedbackError : styles.feedbackSuccess}`}>
              {notificationMessage}
            </p>
          ) : null}
        </div>
      </main>

      {isCancelOpen ? (
        <div className={styles.modalOverlay}>
          <div className={styles.confirmModal}>
            <h2 className={styles.sectionTitle}>Bạn có chắc muốn hủy lịch phỏng vấn này?</h2>
            <div className={styles.modalActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setIsCancelOpen(false)}>
                Hủy
              </button>
              <button type="button" className={styles.detailButton} onClick={handleCancelConfirm}>
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

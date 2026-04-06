'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ADMIN_ROUTES } from '@/lib/constants/routes';
import AdminHeader from '@/shared/components/admin/AdminHeader';
import styles from '@/shared/components/admin/AdminDashboard.module.css';

function SaveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h11l3 3v13H5z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 4v5h8V4M9 20v-6h6v6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 6-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function formatDisplayDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function parseTimeRange(timeRange) {
  const match = /^(\d{2}):(\d{2})\s-\s(\d{2}):(\d{2})$/.exec(timeRange || '');

  if (!match) {
    return {
      startTime: '09:00',
      endTime: '10:00',
    };
  }

  return {
    startTime: `${match[1]}:${match[2]}`,
    endTime: `${match[3]}:${match[4]}`,
  };
}

function parseTimeToMinutes(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(value || '');

  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export default function InterviewScheduleEditor({
  candidateId,
  candidateName,
  position,
  interviewId,
  initialDate,
  initialTime,
  initialLocation,
}) {
  const router = useRouter();
  const parsedTime = parseTimeRange(initialTime);
  const [selectedDate, setSelectedDate] = useState(initialDate || '2023-10-24');
  const [startTime, setStartTime] = useState(parsedTime.startTime);
  const [endTime, setEndTime] = useState(parsedTime.endTime);
  const [location, setLocation] = useState(initialLocation || 'Văn phòng Long Hải Security, Quận 1, TP Hồ Chí Minh');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  const selectedTime = `${startTime} - ${endTime}`;
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  const hasInvalidTimeRange =
    startMinutes !== null && endMinutes !== null && startMinutes > endMinutes;

  async function handleSubmit(event) {
    event.preventDefault();

    if (hasInvalidTimeRange || isSaving) {
      return;
    }

    setIsSaving(true);
    setFeedback('');

    try {
      const response = await fetch(`/api/admin/candidates/${candidateId}/interview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewDate: selectedDate,
          interviewTime: selectedTime,
          location,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setFeedback(payload?.message || 'Không thể lưu lịch phỏng vấn.');
        return;
      }

      const persistedInterview = payload?.interview || {};
      const nextUrl =
        `${ADMIN_ROUTES.interviews}?candidateId=${candidateId}` +
        `&candidateName=${encodeURIComponent(candidateName)}` +
        `&position=${encodeURIComponent(position)}` +
        `&interviewId=${encodeURIComponent(persistedInterview.interviewId || interviewId || '')}` +
        `&rawDate=${encodeURIComponent(persistedInterview.rawDate || selectedDate)}` +
        `&date=${encodeURIComponent(persistedInterview.displayDate || formatDisplayDate(selectedDate))}` +
        `&time=${encodeURIComponent(persistedInterview.interviewTime || selectedTime)}` +
        `&location=${encodeURIComponent(persistedInterview.location || location)}`;

      router.push(nextUrl);
    } catch {
      setFeedback('Không thể lưu lịch phỏng vấn.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.screen}>
      <AdminHeader />
      <main className={styles.successLayout}>
        <nav className={styles.breadcrumb}>
          <Link href={ADMIN_ROUTES.candidates} className={styles.breadcrumbLink}>
            Ứng viên
          </Link>
          <span className={styles.breadcrumbDivider}>{'>'}</span>
          <Link href={ADMIN_ROUTES.candidateDetail(candidateId)} className={styles.breadcrumbLink}>
            {candidateName}
          </Link>
          <span className={styles.breadcrumbDivider}>{'>'}</span>
          <span className={styles.breadcrumbCurrent}>Chỉnh sửa lịch phỏng vấn</span>
        </nav>

        <section className={styles.successCard}>
          <div className={styles.successCardBody}>
            <h1 className={styles.successTitle}>Chỉnh sửa lịch phỏng vấn</h1>
            <p className={styles.successDescription}>
              Chọn ngày phỏng vấn và khung giờ phù hợp cho {candidateName}. Interview ID: {interviewId || 'sẽ được tạo sau khi lưu'}.
            </p>

            <form onSubmit={handleSubmit} className={styles.scheduleForm}>
              <div className={styles.scheduleCard}>
                <label className={styles.scheduleLabel} htmlFor="interview-date">
                  Ngày phỏng vấn
                </label>
                <input
                  id="interview-date"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className={styles.scheduleInput}
                />
                <p className={styles.scheduleHint}>{formatDisplayDate(selectedDate)}</p>
              </div>

              <div className={styles.scheduleCard}>
                <p className={styles.scheduleLabel}>Khung giờ phỏng vấn</p>
                <div className={styles.timeAdjusters}>
                  <div className={styles.timeAdjusterCard}>
                    <label className={styles.scheduleLabel} htmlFor="interview-start-time">
                      Giờ bắt đầu
                    </label>
                    <input
                      id="interview-start-time"
                      type="time"
                      step="300"
                      value={startTime}
                      onChange={(event) => setStartTime(event.target.value)}
                      className={styles.scheduleInput}
                    />
                  </div>
                  <div className={styles.timeAdjusterCard}>
                    <label className={styles.scheduleLabel} htmlFor="interview-end-time">
                      Giờ kết thúc
                    </label>
                    <input
                      id="interview-end-time"
                      type="time"
                      step="300"
                      value={endTime}
                      onChange={(event) => setEndTime(event.target.value)}
                      className={styles.scheduleInput}
                    />
                  </div>
                </div>
                <p className={styles.scheduleHint}>Khung giờ đã chọn: {selectedTime}</p>
                {hasInvalidTimeRange ? (
                  <p className={`${styles.feedbackText} ${styles.feedbackError}`}>
                    Giờ bắt đầu lớn hơn giờ kết thúc là không hợp lệ.
                  </p>
                ) : null}
              </div>

              <div className={styles.scheduleCard}>
                <label className={styles.scheduleLabel} htmlFor="interview-location">
                  Địa điểm phỏng vấn
                </label>
                <input
                  id="interview-location"
                  type="text"
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className={styles.scheduleInput}
                />
              </div>

              <div className={styles.interviewActionGroup}>
                <button type="submit" className={styles.detailButton} disabled={hasInvalidTimeRange || isSaving}>
                  <span className={styles.buttonIcon}>
                    <SaveIcon />
                  </span>
                  {isSaving ? 'Đang lưu...' : 'Lưu lịch phỏng vấn'}
                </button>
                <Link href={ADMIN_ROUTES.candidateDetail(candidateId)} className={styles.secondaryButton}>
                  <span className={styles.buttonIcon}>
                    <BackIcon />
                  </span>
                  Quay lại chi tiết ứng viên
                </Link>
              </div>
              {feedback ? (
                <p className={`${styles.feedbackText} ${styles.feedbackError}`}>
                  {feedback}
                </p>
              ) : null}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

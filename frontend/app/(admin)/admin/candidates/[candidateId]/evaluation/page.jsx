'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AdminHeader from '@/shared/components/admin/AdminHeader';
import StatusBadge from '@/features/candidates/components/admin/StatusBadge';
import styles from '@/shared/components/admin/AdminDashboard.module.css';
import { ADMIN_ROUTES } from '@/lib/constants/routes';
import { getSession } from '@/features/auth/api/authApi';

const MAX_ADMIN_EVALUATION_NOTE_LENGTH = 500;

function EvaluationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v11a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m8 14 2.2-2.2 2 1.8L16 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 9h8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function InterviewInfoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.5v3M17 3.5v3M4.5 8h15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function formatDate(value) {
  if (!value) {
    return 'Chưa cập nhật';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN').format(date);
}

export default function CandidateEvaluationPage() {
  const params = useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState(null);
  const [note, setNote] = useState('');
  const [fitLevel, setFitLevel] = useState('Rat phu hop');
  const [decision, setDecision] = useState('Approved');
  const [feedback, setFeedback] = useState('');
  const [feedbackTone, setFeedbackTone] = useState('success');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const session = getSession();
    const role = session?.user?.role || '';

    if (role !== 'ADMIN') {
      router.replace('/login');
      return;
    }

    setIsAuthorized(true);

    async function loadCandidate() {
      try {
        const response = await fetch(`/api/admin/candidates/${params.candidateId}`, { cache: 'no-store' });

        if (!response.ok) {
          router.replace(ADMIN_ROUTES.candidates);
          return;
        }

        const payload = await response.json();
        const nextCandidate = payload.candidate || null;
        setCandidate(nextCandidate);
        setNote(nextCandidate?.decisionNote || nextCandidate?.interview?.comments || '');
        setFitLevel(nextCandidate?.fitLevel || 'Rat phu hop');
        setDecision(nextCandidate?.status === 'Final Rejected' ? 'Final Rejected' : 'Approved');
      } finally {
        setIsLoading(false);
      }
    }

    if (params?.candidateId) {
      loadCandidate();
    }
  }, [params, router]);

  const interviewResultLabel = useMemo(() => {
    if (!candidate?.interview?.result || candidate.interview.result === 'Pending') {
      return 'Chưa có kết quả';
    }

    if (candidate.interview.result === 'Pass') {
      return 'Sẵn sàng';
    }

    if (candidate.interview.result === 'Fail') {
      return 'Bị loại';
    }

    return candidate.interview.result;
  }, [candidate]);

  async function handleSubmit() {
    const session = getSession();
    setIsSubmitting(true);
    setFeedback('');

    const trimmedNote = note.trim();

    if (trimmedNote.length > MAX_ADMIN_EVALUATION_NOTE_LENGTH) {
      setFeedback(`Đánh giá chi tiết của admin không được vượt quá ${MAX_ADMIN_EVALUATION_NOTE_LENGTH} ký tự.`);
      setFeedbackTone('error');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/admin/candidates/${params.candidateId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: decision,
          note: trimmedNote,
          fitLevel,
          updatedBy: session?.user?.id || 'admin-internal',
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.message || 'Không thể lưu kết quả đánh giá.');
      }

      setCandidate(payload.candidate || null);
      setNote(payload.candidate?.decisionNote || note);
      router.push(ADMIN_ROUTES.history);
    } catch (error) {
      setFeedback(error?.message || 'Không thể lưu kết quả đánh giá.');
      setFeedbackTone('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isAuthorized || isLoading) {
    return <div className={styles.loadingState}>Đang tải trang đánh giá phỏng vấn...</div>;
  }

  if (!candidate) {
    return <div className={styles.loadingState}>Không tìm thấy ứng viên.</div>;
  }

  return (
    <div className={styles.screen}>
      <AdminHeader />
      <main className={styles.content}>
        <section className={styles.evaluationHero}>
          <div className={styles.dashboardHero}>
            <div className={styles.titleBlock}>
              <p className={styles.pageEyebrow}>Đánh giá phỏng vấn</p>
              <h1 className={styles.title}>Đánh giá phỏng vấn</h1>
              <p className={styles.subtitle}>
                Nhập kết quả và đánh giá ứng viên sau buổi phỏng vấn.
              </p>
            </div>
            <Link href={ADMIN_ROUTES.candidates} className={styles.jobFormBackButton}>
              Quay lại trang ứng viên
            </Link>
          </div>
        </section>

        <section className={styles.evaluationLayout}>
          <div className={styles.evaluationSidebar}>
            <article className={styles.evaluationCard}>
              <div className={styles.evaluationCardHeader}>
                <span className={styles.evaluationCardIcon}>
                  <EvaluationIcon />
                </span>
                <h2 className={styles.evaluationCardTitle}>Thông tin ứng viên</h2>
              </div>

              <div className={styles.evaluationInfoList}>
                <div className={styles.evaluationInfoItem}>
                  <p className={styles.evaluationInfoLabel}>Họ và tên</p>
                  <p className={styles.evaluationInfoValue}>{candidate.fullName}</p>
                </div>
                <div className={styles.evaluationInfoItem}>
                  <p className={styles.evaluationInfoLabel}>Email</p>
                  <p className={styles.evaluationInfoValue}>{candidate.email || 'Chưa cập nhật'}</p>
                </div>
                <div className={styles.evaluationInfoItem}>
                  <p className={styles.evaluationInfoLabel}>Số điện thoại</p>
                  <p className={styles.evaluationInfoValue}>{candidate.phone || 'Chưa cập nhật'}</p>
                </div>
                <div className={styles.evaluationInfoItem}>
                  <p className={styles.evaluationInfoLabel}>Vị trí ứng tuyển</p>
                  <div className={styles.evaluationBadgeRow}>
                    <span className={styles.evaluationPositionBadge}>{candidate.position || 'Chưa cập nhật'}</span>
                  </div>
                </div>
              </div>
            </article>

            <article className={styles.evaluationCard}>
              <div className={styles.evaluationCardHeader}>
                <span className={styles.evaluationCardIcon}>
                  <InterviewInfoIcon />
                </span>
                <h2 className={styles.evaluationCardTitle}>Chi tiết buổi phỏng vấn</h2>
              </div>

              <div className={styles.evaluationInterviewGrid}>
                <div className={styles.evaluationInfoItem}>
                  <p className={styles.evaluationInfoLabel}>Ngày phỏng vấn</p>
                  <p className={styles.evaluationInfoValue}>
                    {candidate.interview?.interviewDate || 'Chưa xếp lịch'}
                  </p>
                </div>
                <div className={styles.evaluationInfoItem}>
                  <p className={styles.evaluationInfoLabel}>Khung giờ</p>
                  <p className={styles.evaluationInfoValue}>
                    {candidate.interview?.interviewTime || 'Chưa cập nhật'}
                  </p>
                </div>
                <div className={`${styles.evaluationInfoItem} ${styles.evaluationInfoItemFull}`}>
                  <p className={styles.evaluationInfoLabel}>Địa điểm</p>
                  <p className={styles.evaluationInfoValue}>
                    {candidate.interview?.location || 'Chưa cập nhật'}
                  </p>
                </div>
                <div className={styles.evaluationInfoItem}>
                  <p className={styles.evaluationInfoLabel}>Trạng thái hiện tại</p>
                  <div className={styles.historyStatusWrap}>
                    <StatusBadge status={candidate.status} />
                  </div>
                </div>
                <div className={styles.evaluationInfoItem}>
                  <p className={styles.evaluationInfoLabel}>Kết quả gần nhất</p>
                  <p className={styles.evaluationInfoValue}>{interviewResultLabel}</p>
                </div>
              </div>
            </article>
          </div>

          <section className={styles.evaluationFormCard}>
            <div className={styles.evaluationCardHeader}>
              <span className={styles.evaluationCardIcon}>
                <EvaluationIcon />
              </span>
              <h2 className={styles.evaluationCardTitle}>Form đánh giá</h2>
            </div>

            <div className={styles.evaluationField}>
              <label htmlFor="evaluation-note" className={styles.evaluationFieldLabel}>
                Đánh giá chi tiết
              </label>
              <textarea
                id="evaluation-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                className={styles.evaluationTextarea}
                placeholder="Nhập nhận xét về ứng viên..."
              />
            </div>

            <div className={styles.evaluationSelectGrid}>
              <div className={styles.evaluationField}>
                <label htmlFor="fit-level" className={styles.evaluationFieldLabel}>
                  Mức độ phù hợp
                </label>
                <select
                  id="fit-level"
                  value={fitLevel}
                  onChange={(event) => setFitLevel(event.target.value)}
                  className={styles.evaluationSelect}
                >
                  <option value="Rat phu hop">Rất phù hợp</option>
                  <option value="Phu hop">Phù hợp</option>
                  <option value="Can can nhac">Cần cân nhắc</option>
                  <option value="Chua phu hop">Chưa phù hợp</option>
                </select>
              </div>

              <div className={styles.evaluationField}>
                <label htmlFor="interview-result" className={styles.evaluationFieldLabel}>
                  Kết quả phỏng vấn
                </label>
                <select
                  id="interview-result"
                  value={decision}
                  onChange={(event) => setDecision(event.target.value)}
                  className={styles.evaluationSelect}
                >
                  <option value="Approved">Sẵn sàng</option>
                  <option value="Final Rejected">Bị loại</option>
                </select>
              </div>
            </div>

            {candidate.decisionAt ? (
              <div className={styles.evaluationHintBox}>
                <p className={styles.evaluationHintTitle}>Lần lưu gần nhất</p>
                <p className={styles.evaluationHintText}>{formatDate(candidate.decisionAt)}</p>
              </div>
            ) : null}

            {feedback ? (
              <p className={`${styles.feedbackText} ${feedbackTone === 'success' ? styles.feedbackSuccess : styles.feedbackError}`}>
                {feedback}
              </p>
            ) : null}

            <div className={styles.evaluationActions}>
              <Link href={ADMIN_ROUTES.candidates} className={styles.evaluationSecondaryButton}>
                Quay lại
              </Link>
              <button
                type="button"
                className={styles.evaluationPrimaryButton}
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu kết quả'}
              </button>
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

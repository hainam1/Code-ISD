'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ActionButton from '@/shared/components/admin/ActionButton';
import AdminHeader from '@/shared/components/admin/AdminHeader';
import CandidateHeader from '@/features/candidates/components/admin/CandidateHeader';
import DocumentSection from '@/features/candidates/components/admin/DocumentSection';
import InfoCard from '@/shared/components/admin/InfoCard';
import StatusBadge from '@/features/candidates/components/admin/StatusBadge';
import StatusDropdown from '@/features/candidates/components/admin/StatusDropdown';
import styles from '@/shared/components/admin/AdminDashboard.module.css';
import { ADMIN_ROUTES } from '@/lib/constants/routes';
import { getSession } from '@/features/auth/api/authApi';
import { CANDIDATE_STATUS } from '@/features/candidates/constants/statusOptions';

const STATUS_OPTIONS = [
  CANDIDATE_STATUS.review,
  CANDIDATE_STATUS.shortlisted,
  CANDIDATE_STATUS.interview,
  CANDIDATE_STATUS.rejected,
];

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [statusValue, setStatusValue] = useState(CANDIDATE_STATUS.review);
  const [feedback, setFeedback] = useState('');

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
        const response = await fetch(`/api/admin/candidates/${params.candidateId}`);
        if (!response.ok) {
          router.replace(ADMIN_ROUTES.candidates);
          return;
        }

        const payload = await response.json();
        setCandidate(payload.candidate || null);
        setStatusValue(
          payload.candidate?.hasApplication
            ? payload.candidate?.status || CANDIDATE_STATUS.review
            : CANDIDATE_STATUS.review,
        );
      } finally {
        setIsLoading(false);
      }
    }

    if (params?.candidateId) {
      loadCandidate();
    }
  }, [params, router]);

  async function patchCandidate(updates, successMessage) {
    if (!candidate?.hasApplication) {
      setFeedback('Ứng viên này chưa nộp hồ sơ, không có trạng thái để cập nhật.');
      return;
    }

    const response = await fetch(`/api/admin/candidates/${candidate.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      setFeedback('Không thể cập nhật ứng viên.');
      return;
    }

    const payload = await response.json();
    setCandidate(payload.candidate);
    setStatusValue(payload.candidate?.status || statusValue);
    setFeedback(successMessage);
  }

  async function handleStatusUpdate() {
    await patchCandidate({ status: statusValue }, 'Cập nhật trạng thái thành công.');
  }

  if (!isAuthorized || isLoading) {
    return <div className={styles.loadingState}>Đang tải màn hình chi tiết ứng viên...</div>;
  }

  if (!candidate) {
    return <div className={styles.loadingState}>Không tìm thấy ứng viên.</div>;
  }

  const interviewHref =
    `${ADMIN_ROUTES.interviews}?candidateId=${candidate.id}` +
    `&candidateName=${encodeURIComponent(candidate.fullName)}` +
    `&position=${encodeURIComponent(candidate.position || 'Nhân viên bảo vệ ca đêm')}` +
    `&interviewId=${encodeURIComponent(candidate.interview?.id || '')}` +
    `&rawDate=${encodeURIComponent(candidate.interview?.rawDate || '')}` +
    `&date=${encodeURIComponent(candidate.interview?.interviewDate || '')}` +
    `&time=${encodeURIComponent(candidate.interview?.interviewTime || '')}` +
    `&location=${encodeURIComponent(candidate.interview?.location || '')}`;

  return (
    <div className={styles.screen}>
      <AdminHeader />
      <main className={styles.detailLayout}>
        <Link href={ADMIN_ROUTES.candidates} className={styles.backLink}>
          Quay lại danh sách ứng viên
        </Link>

        <div className={styles.detailStack}>
          <CandidateHeader
            fullName={candidate.fullName}
            position={candidate.position}
            avatarUrl={candidate.avatarUrl}
            action={(
              <Link href={ADMIN_ROUTES.candidates} className={styles.secondaryButton}>
                Quay lại trang
              </Link>
            )}
          />

          <InfoCard
            title="Thông tin ứng viên"
            items={[
              { label: 'Họ và tên', value: candidate.fullName },
              { label: 'Email', value: candidate.email || '' },
              { label: 'Số điện thoại', value: candidate.phone || '' },
              { label: 'Ngày sinh', value: candidate.dob || 'Chưa cập nhật' },
              { label: 'CCCD / CMND', value: candidate.idCard || 'Chưa cập nhật' },
              { label: 'Địa chỉ', value: candidate.address || 'Chưa cập nhật' },
              { label: 'Vị trí ứng tuyển', value: candidate.position || 'Chưa cập nhật' },
            ]}
          />

          <DocumentSection
            title="Hồ sơ CV"
            description="CV được ứng viên tải lên trong quá trình nộp hồ sơ."
            fileName={candidate.cvFileName}
            emptyText="Ứng viên chưa tải CV."
          >
            {candidate.cvFileName ? (
              <a href={`/api/admin/candidates/${candidate.id}/cv?download=1`} className={styles.detailButton}>
                Tải CV
              </a>
            ) : null}
          </DocumentSection>

          <DocumentSection
            title="Hồ sơ sức khỏe"
            description="Thông tin hồ sơ sức khỏe của ứng viên."
            fileName={candidate.healthCertificateFileName}
            emptyText="Chưa tải lên hồ sơ sức khỏe."
          >
            {candidate.healthCertificateFileName ? (
              <a
                href={`/api/admin/candidates/${candidate.id}/health?download=1`}
                className={styles.detailButton}
              >
                Tải hồ sơ sức khỏe
              </a>
            ) : null}
          </DocumentSection>

          <section className={styles.detailCard}>
            <h2 className={styles.sectionTitle}>Cập nhật trạng thái ứng viên</h2>
            <div className={styles.statusSectionTop}>
              <StatusBadge status={candidate.status} />
            </div>
            <div className={styles.statusForm}>
              <StatusDropdown
                value={statusValue}
                onChange={setStatusValue}
                options={STATUS_OPTIONS}
              />
              <ActionButton
                type="button"
                className={styles.detailButton}
                onClick={handleStatusUpdate}
                disabled={!candidate.hasApplication}
              >
                Cập nhật trạng thái
              </ActionButton>
            </div>
            {!candidate.hasApplication ? (
              <p className={styles.feedbackText}>Ứng viên này đã có tài khoản nhưng chưa nộp hồ sơ ứng tuyển.</p>
            ) : null}
            {feedback ? (
              <p className={`${styles.feedbackText} ${feedback.includes('Không thể') ? styles.feedbackError : styles.feedbackSuccess}`}>
                {feedback}
              </p>
            ) : null}
          </section>

          {candidate.hasApplication ? (
            <Link href={interviewHref} className={`${styles.detailButton} ${styles.fullWidthButton}`}>
              {candidate.interview ? 'Chỉnh sửa lịch phỏng vấn' : 'Lên lịch phỏng vấn'}
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  );
}

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

const STATUS_OPTIONS = [CANDIDATE_STATUS.review, CANDIDATE_STATUS.shortlisted, CANDIDATE_STATUS.rejected];

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
      setFeedback('Ung vien nay chua nop ho so, khong co trang thai de cap nhat.');
      return;
    }

    const response = await fetch(`/api/admin/candidates/${candidate.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      setFeedback('Khong the cap nhat ung vien.');
      return;
    }

    const payload = await response.json();
    setCandidate(payload.candidate);
    setStatusValue(payload.candidate?.status || statusValue);
    setFeedback(successMessage);
  }

  async function handleStatusUpdate() {
    await patchCandidate({ status: statusValue }, 'Cap nhat trang thai thanh cong.');
  }

  if (!isAuthorized || isLoading) {
    return <div className={styles.loadingState}>Dang tai man hinh chi tiet ung vien...</div>;
  }

  if (!candidate) {
    return <div className={styles.loadingState}>Khong tim thay ung vien.</div>;
  }

  const interviewHref =
    `${ADMIN_ROUTES.interviews}?candidateId=${candidate.id}` +
    `&candidateName=${encodeURIComponent(candidate.fullName)}` +
    `&position=${encodeURIComponent(candidate.position || 'Nhan vien bao ve ca dem')}` +
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
          Quay lai danh sach ung vien
        </Link>

        <div className={styles.detailStack}>
          <CandidateHeader
            fullName={candidate.fullName}
            position={candidate.position}
            avatarUrl={candidate.avatarUrl}
            action={(
              <Link href={ADMIN_ROUTES.candidates} className={styles.secondaryButton}>
                Quay lai trang
              </Link>
            )}
          />

          <InfoCard
            title="Thong tin ung vien"
            items={[
              { label: 'Ho va ten', value: candidate.fullName },
              { label: 'Email', value: candidate.email || '' },
              { label: 'So dien thoai', value: candidate.phone || '' },
              { label: 'Ngay sinh', value: candidate.dob || 'Chua cap nhat' },
              { label: 'CCCD / CMND', value: candidate.idCard || 'Chua cap nhat' },
              { label: 'Dia chi', value: candidate.address || 'Chua cap nhat' },
              { label: 'Vi tri ung tuyen', value: candidate.position || 'Chua cap nhat' },
            ]}
          />

          <DocumentSection
            title="Ho so CV"
            description="CV duoc ung vien tai len trong qua trinh nop ho so."
            fileName={candidate.cvFileName}
            emptyText="Ung vien chua tai CV."
          >
            {candidate.cvFileName ? (
              <a href={`/api/admin/candidates/${candidate.id}/cv?download=1`} className={styles.detailButton}>
                Tai CV
              </a>
            ) : null}
          </DocumentSection>

          <DocumentSection
            title="Ho so suc khoe"
            description="Thong tin ho so suc khoe cua ung vien."
            fileName={candidate.healthCertificateFileName}
            emptyText="Chua tai len ho so suc khoe."
          >
            {candidate.healthCertificateFileName ? (
              <a
                href={`/api/admin/candidates/${candidate.id}/health?download=1`}
                className={styles.detailButton}
              >
                Tai ho so suc khoe
              </a>
            ) : null}
          </DocumentSection>

          <section className={styles.detailCard}>
            <h2 className={styles.sectionTitle}>Cap nhat trang thai ung vien</h2>
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
                Cap nhat trang thai
              </ActionButton>
            </div>
            {!candidate.hasApplication ? (
              <p className={styles.feedbackText}>Ung vien nay da co tai khoan nhung chua nop ho so ung tuyen.</p>
            ) : null}
            {feedback ? (
              <p className={`${styles.feedbackText} ${feedback.includes('Khong the') ? styles.feedbackError : styles.feedbackSuccess}`}>
                {feedback}
              </p>
            ) : null}
          </section>

          {candidate.hasApplication ? (
            <Link href={interviewHref} className={`${styles.detailButton} ${styles.fullWidthButton}`}>
              {candidate.interview ? 'Chinh sua lich phong van' : 'Len lich phong van'}
            </Link>
          ) : null}
        </div>
      </main>
    </div>
  );
}

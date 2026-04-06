'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/shared/components/admin/AdminHeader';
import styles from '@/shared/components/admin/AdminDashboard.module.css';
import { ADMIN_ROUTES } from '@/lib/constants/routes';
import { getSession } from '@/features/auth/api/authApi.jsx';

const ITEMS_PER_PAGE = 9;

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 20s6-4.8 6-10a6 6 0 1 0-12 0c0 5.2 6 10 6 10Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function SalaryIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="6.5" width="18" height="11" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7 10h.01M17 14h.01" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7h14M10 10.5v6M14 10.5v6M9 5h6l1 2H8l1-2Zm-2 2h10v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ direction = 'left' }) {
  const path = direction === 'left' ? 'm14 6-6 6 6 6' : 'm10 6 6 6-6 6';
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function repairText(value) {
  if (!value || typeof value !== 'string') {
    return value || '';
  }

  try {
    return decodeURIComponent(escape(value));
  } catch {
    return value;
  }
}

function toCardDescription(job) {
  const description = repairText(job.description);
  if (description) {
    return description;
  }

  const requirements = Array.isArray(job.requirements) ? job.requirements.map(repairText).filter(Boolean) : [];
  return requirements.slice(0, 1).join(' ');
}

function Badge({ value }) {
  if (!value) {
    return null;
  }

  const normalized = String(value).trim().toUpperCase();
  const badgeClassName =
    normalized === 'HOT'
      ? `${styles.jobBadge} ${styles.jobBadgeHot}`
      : `${styles.jobBadge} ${styles.jobBadgeNew}`;

  return <span className={badgeClassName}>{normalized}</span>;
}

function JobCard({ job, onDelete, isDeleting }) {
  return (
    <article className={styles.jobCard}>
      <div className={styles.jobCardTop}>
        <h2 className={styles.jobCardTitle}>{repairText(job.title)}</h2>
        <Badge value={job.badge} />
      </div>

      <div className={styles.jobMetaLine}>
        <span className={styles.jobMetaIcon}>
          <LocationIcon />
        </span>
        <span>{repairText(job.location)}</span>
      </div>

      <p className={styles.jobCardDescription}>{toCardDescription(job)}</p>

      <div className={styles.jobSalaryRow}>
        <span className={styles.jobMetaIcon}>
          <SalaryIcon />
        </span>
        <strong>{repairText(job.salary)}</strong>
      </div>

      <div className={styles.jobCardActions}>
        <Link href={ADMIN_ROUTES.jobEdit(job.id)} className={styles.jobPrimaryButton}>
          <span>Chỉnh sửa công việc</span>
          <span className={styles.jobPrimaryButtonIcon}>
            <ArrowRightIcon />
          </span>
        </Link>
        <button
          type="button"
          className={styles.jobDeleteButton}
          aria-label={`Xóa ${repairText(job.title)}`}
          onClick={() => onDelete(job)}
          disabled={isDeleting}
        >
          <TrashIcon />
        </button>
      </div>
    </article>
  );
}

function JobsPagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className={styles.jobsPagination}>
      <button
        type="button"
        className={styles.jobsPageButton}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Trang trước"
      >
        <ChevronIcon direction="left" />
      </button>
      {pageNumbers.map((pageNumber) => (
        <button
          key={pageNumber}
          type="button"
          className={pageNumber === currentPage ? styles.jobsPageButtonActive : styles.jobsPageButton}
          onClick={() => onPageChange(pageNumber)}
        >
          {pageNumber}
        </button>
      ))}
      <button
        type="button"
        className={styles.jobsPageButton}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Trang sau"
      >
        <ChevronIcon direction="right" />
      </button>
    </div>
  );
}

export default function AdminJobsPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [deletingJobId, setDeletingJobId] = useState('');
  const [pageMessage, setPageMessage] = useState('');
  const [pageMessageType, setPageMessageType] = useState('');

  useEffect(() => {
    const session = getSession();
    const role = session?.user?.role || '';

    if (role !== 'ADMIN') {
      router.replace('/login');
      return;
    }

    setIsAuthorized(true);

    async function loadJobs() {
      try {
        const response = await fetch('/api/jobs', { cache: 'no-store' });
        const payload = await response.json();
        setJobs(Array.isArray(payload.jobs) ? payload.jobs : []);
      } finally {
        setIsLoading(false);
      }
    }

    loadJobs();
  }, [router]);

  const totalPages = Math.max(1, Math.ceil(jobs.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visibleJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return jobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, jobs]);

  async function handleDelete(job) {
    setPageMessage('');
    setPageMessageType('');

    setDeletingJobId(job.id);

    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json();

      if (!response.ok) {
        setPageMessage(payload.message || 'Không thể xóa công việc.');
        setPageMessageType('error');
        return;
      }

      setJobs((current) => current.filter((item) => item.id !== job.id));
      setPageMessage(`Đã xóa công việc "${repairText(job.title)}".`);
      setPageMessageType('success');
    } catch (error) {
      setPageMessage(`Không thể xóa công việc. ${String(error)}`);
      setPageMessageType('error');
    } finally {
      setDeletingJobId('');
    }
  }

  if (!isAuthorized || isLoading) {
    return <div className={styles.loadingState}>Đang tải trang công việc...</div>;
  }

  return (
    <div className={styles.screen}>
      <AdminHeader />

      <main className={styles.jobsPage}>
        <section className={styles.jobsHero}>
          <div className={styles.jobsHeroCopy}>
            <p className={styles.jobsEyebrow}>Tuyen dung bao ve</p>
            <h1 className={styles.jobsHeading}>Cong viec</h1>
          </div>

          <div className={styles.jobsHeroActions}>
            <Link href={ADMIN_ROUTES.jobCreate} className={styles.jobsAddButton}>
              <span className={styles.jobsAddButtonIcon}>
                <PlusIcon />
              </span>
              <span>Thêm công việc</span>
            </Link>
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Danh sach xet duyet</p>
              <h2 className={styles.sectionTitleLarge}>Cong viec</h2>
            </div>
            <p className={styles.sectionMeta}>{jobs.length} cong viec</p>
          </div>

          {pageMessage ? (
            <div className={styles.emptyState} style={{ paddingTop: 18, paddingBottom: 0, textAlign: 'left' }}>
              <p className={`${styles.feedbackText} ${pageMessageType === 'error' ? styles.feedbackError : styles.feedbackSuccess}`}>
                {pageMessage}
              </p>
            </div>
          ) : null}

          {visibleJobs.length > 0 ? (
            <section className={styles.jobsGrid}>
              {visibleJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onDelete={handleDelete}
                  isDeleting={deletingJobId === job.id}
                />
              ))}
            </section>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>Chưa có công việc nào</p>
              <p className={styles.emptyStateText}>Thêm bài đăng mới để đội xét duyệt có thể tiếp nhận ứng viên ngay.</p>
            </div>
          )}
        </section>

        <JobsPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </main>
    </div>
  );
}


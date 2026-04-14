'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/shared/components/admin/AdminHeader';
import StatusBadge from '@/features/candidates/components/admin/StatusBadge';
import styles from '@/shared/components/admin/AdminDashboard.module.css';
import { ADMIN_ROUTES } from '@/lib/constants/routes';
import { getSession } from '@/features/auth/api/authApi';

const ITEMS_PER_PAGE = 6;
const STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'Approved', label: 'Sẵn sàng' },
  { value: 'Final Rejected', label: 'Bị loại' },
];

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m14.5 6.5-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9.5 6.5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getInitials(fullName) {
  return String(fullName || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function formatInterviewDate(value) {
  if (!value) {
    return 'Chưa cập nhật';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function normalizeSearchValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function buildCandidateSearchIndex(candidate) {
  return normalizeSearchValue([
    candidate.fullName,
    candidate.email,
    candidate.position,
    candidate.phone,
  ].join(' '));
}

export default function AdminHistoryPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const session = getSession();
    const role = session?.user?.role || '';

    if (role !== 'ADMIN') {
      router.replace('/login');
      return;
    }

    setIsAuthorized(true);

    async function loadHistory() {
      try {
        const response = await fetch('/api/admin/history', { cache: 'no-store' });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.message || 'Không thể tải lịch sử phỏng vấn.');
        }

        setCandidates(Array.isArray(payload.candidates) ? payload.candidates : []);
        setLoadError('');
      } catch (error) {
        setCandidates([]);
        setLoadError(error?.message || 'Không thể tải lịch sử phỏng vấn.');
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [router]);

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(searchTerm);

    return candidates.filter((candidate) => {
      const matchesSearch = !normalizedQuery || buildCandidateSearchIndex(candidate).includes(normalizedQuery);
      const matchesStatus = statusFilter === 'ALL' || candidate.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [candidates, searchTerm, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredCandidates.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visibleCandidates = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCandidates.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredCandidates]);

  if (!isAuthorized || isLoading) {
    return <div className={styles.loadingState}>Đang tải lịch sử phỏng vấn...</div>;
  }

  if (loadError) {
    return <div className={styles.loadingState}>{loadError}</div>;
  }

  return (
    <div className={styles.screen}>
      <AdminHeader />
      <main className={styles.content}>
        <section className={styles.evaluationHero}>
          <div className={styles.titleBlock}>
            <p className={styles.pageEyebrow}>Lịch sử phỏng vấn</p>
            <h1 className={styles.title}>Lịch sử phỏng vấn</h1>
            <p className={styles.subtitle}>
              Xem kết quả và đánh giá các ứng viên đã tham gia phỏng vấn.
            </p>
          </div>
        </section>

        <section className={styles.historyToolbar}>
          <div className={styles.historySearchWrap}>
            <span className={styles.historySearchIcon}>
              <SearchIcon />
            </span>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className={styles.historySearchInput}
              placeholder="Tìm kiếm ứng viên..."
              aria-label="Tìm kiếm ứng viên"
            />
          </div>

          <div className={styles.historyFilterGroup}>
            <label htmlFor="history-status-filter" className={styles.historyFilterLabel}>
              Lọc theo trạng thái
            </label>
            <select
              id="history-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={styles.historyFilterSelect}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className={styles.historyPanel}>
          <div className={styles.historyListHeader}>
            <span>Họ và tên</span>
            <span>Email</span>
            <span>Vị trí ứng tuyển</span>
            <span>Ngày phỏng vấn</span>
            <span>Trạng thái</span>
            <span>Hành động</span>
          </div>

          {visibleCandidates.length ? (
            visibleCandidates.map((candidate) => (
              <article key={candidate.id} className={styles.historyListRow}>
                <div className={styles.historyCandidateCell}>
                  <span
                    className={styles.historyAvatar}
                    style={candidate.avatarUrl ? { backgroundImage: `url(${candidate.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                  >
                    {candidate.avatarUrl ? null : getInitials(candidate.fullName)}
                  </span>
                  <div>
                    <p className={styles.historyCandidateName}>{candidate.fullName}</p>
                  </div>
                </div>

                <p className={styles.historyCellText}>{candidate.email || 'Chưa cập nhật'}</p>
                <p className={styles.historyCellText}>{candidate.position || 'Chưa cập nhật'}</p>
                <p className={styles.historyCellText}>
                  {formatInterviewDate(candidate.interview?.interviewDate || candidate.decisionAt || candidate.updatedAt)}
                </p>
                <div className={styles.historyStatusCell}>
                  <StatusBadge status={candidate.status} />
                </div>
                <div className={styles.historyActionCell}>
                  <Link href={ADMIN_ROUTES.candidateEvaluation(candidate.id)} className={styles.historyDetailButton}>
                    Xem đánh giá
                  </Link>
                </div>
              </article>
            ))
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>Chưa có ứng viên phù hợp</p>
              <p className={styles.emptyStateText}>
                Hãy thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.
              </p>
            </div>
          )}

          {totalPages > 1 ? (
            <div className={styles.historyPagination}>
              <button
                type="button"
                className={styles.historyPageButton}
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Trang trước"
              >
                <ChevronLeftIcon />
              </button>
              <button type="button" className={styles.historyPageButtonActive}>
                {currentPage}
              </button>
              <button
                type="button"
                className={styles.historyPageButton}
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Trang sau"
              >
                <ChevronRightIcon />
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

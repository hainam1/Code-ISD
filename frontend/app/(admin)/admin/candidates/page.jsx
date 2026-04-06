'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminHeader from '@/shared/components/admin/AdminHeader';
import CandidateItem from '@/features/candidates/components/admin/CandidateItem';
import FilterDropdown from '@/shared/components/admin/FilterDropdown';
import Pagination from '@/shared/components/admin/Pagination';
import SearchBar from '@/shared/components/admin/SearchBar';
import styles from '@/shared/components/admin/AdminDashboard.module.css';
import { getSession } from '@/features/auth/api/authApi';
import { CANDIDATE_STATUS, STATUS_LABELS } from '@/features/candidates/constants/statusOptions';

const STATUS_OPTIONS = [
  { value: CANDIDATE_STATUS.all, label: 'Loc theo trang thai' },
  { value: CANDIDATE_STATUS.review, label: STATUS_LABELS[CANDIDATE_STATUS.review] },
  { value: CANDIDATE_STATUS.shortlisted, label: STATUS_LABELS[CANDIDATE_STATUS.shortlisted] },
  { value: CANDIDATE_STATUS.rejected, label: STATUS_LABELS[CANDIDATE_STATUS.rejected] },
];

const ITEMS_PER_PAGE = 10;

function countByStatus(candidates, status) {
  return candidates.filter((candidate) => candidate.status === status).length;
}

function formatAppliedDate(dateString) {
  if (!dateString) {
    return 'Chua cap nhat';
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString));
}

export default function CandidateManagementPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(CANDIDATE_STATUS.all);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const session = getSession();
    const role = session?.user?.role || '';

    if (role !== 'ADMIN') {
      router.replace('/login');
      return;
    }

    setIsAuthorized(true);

    async function loadCandidates() {
      try {
        const response = await fetch('/api/admin/candidates');
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.message || 'Khong the tai danh sach ung vien.');
        }

        setCandidates(Array.isArray(payload.candidates) ? payload.candidates : []);
        setLoadError('');
      } catch (error) {
        setCandidates([]);
        setLoadError(error?.message || 'Khong the tai danh sach ung vien.');
      } finally {
        setIsLoading(false);
      }
    }

    loadCandidates();
  }, [router]);

  const filteredCandidates = useMemo(() => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    return candidates.filter((candidate) => {
      const matchesSearch =
        !normalizedQuery ||
        candidate.fullName.toLowerCase().includes(normalizedQuery) ||
        candidate.email.toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === CANDIDATE_STATUS.all || candidate.status === statusFilter;

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

  const summaryItems = useMemo(
    () => [
      {
        label: 'Tong so ung vien',
        value: String(candidates.length).padStart(2, '0'),
        tone: 'Neutral',
      },
      {
        label: 'Chua duyet',
        value: String(
          countByStatus(candidates, CANDIDATE_STATUS.review) + countByStatus(candidates, CANDIDATE_STATUS.noApplication),
        ).padStart(2, '0'),
        tone: 'Review',
      },
      {
        label: 'Da duyet',
        value: String(countByStatus(candidates, CANDIDATE_STATUS.shortlisted)).padStart(2, '0'),
        tone: 'Shortlisted',
      },
      {
        label: 'Bi loai',
        value: String(countByStatus(candidates, CANDIDATE_STATUS.rejected)).padStart(2, '0'),
        tone: 'Rejected',
      },
    ],
    [candidates],
  );

  if (!isAuthorized || isLoading) {
    return <div className={styles.loadingState}>Dang tai man hinh quan ly ung vien...</div>;
  }

  if (loadError) {
    return <div className={styles.loadingState}>{loadError}</div>;
  }

  return (
    <div className={styles.screen}>
      <AdminHeader />
      <main className={styles.content}>
        <section className={styles.dashboardHero}>
          <div className={styles.titleBlock}>
            <p className={styles.pageEyebrow}>Tuyen dung bao ve</p>
            <h1 className={styles.title}>Bang dieu phoi xet duyet</h1>
          </div>
        </section>

        <section className={styles.summaryGrid}>
          {summaryItems.map((item) => (
            <article key={item.label} className={`${styles.summaryCard} ${styles[`summaryCard${item.tone}`]}`}>
              <p className={styles.summaryLabel}>{item.label}</p>
              <p className={styles.summaryValue}>{item.value}</p>
            </article>
          ))}
        </section>

        <section className={styles.toolbarShell}>
          <div className={styles.toolbarCopy}>
            <p className={styles.toolbarEyebrow}>Bo loc thao tac</p>
            <h2 className={styles.toolbarTitle}>Tim nhanh va thu hep danh sach</h2>
          </div>
          <div className={styles.toolbar}>
            <SearchBar value={searchTerm} onChange={setSearchTerm} />
            <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Danh sach xet duyet</p>
              <h2 className={styles.sectionTitleLarge}>Danh sach theo doi</h2>
            </div>
            <p className={styles.sectionMeta}>
              Trang {currentPage}/{totalPages} • {filteredCandidates.length} ung vien
            </p>
          </div>

          <div className={styles.tableHeader}>
            <span>Ho va ten</span>
            <span>Email</span>
            <span>So dien thoai</span>
            <span>Vi tri ung tuyen</span>
            <span>Ngay cap nhat</span>
            <span>Trang thai</span>
            <span>Hanh dong</span>
          </div>

          {visibleCandidates.length > 0 ? (
            visibleCandidates.map((candidate) => (
              <CandidateItem
                key={candidate.id}
                candidate={candidate}
                appliedDate={formatAppliedDate(candidate.appliedAt)}
              />
            ))
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>Khong co ung vien phu hop</p>
              <p className={styles.emptyStateText}>Thu doi tu khoa tim kiem hoac bo loc trang thai de mo rong ket qua.</p>
            </div>
          )}

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </section>
      </main>
    </div>
  );
}

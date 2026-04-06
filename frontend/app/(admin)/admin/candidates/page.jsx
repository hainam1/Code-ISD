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
  { value: CANDIDATE_STATUS.all, label: 'Lọc theo trạng thái' },
  { value: CANDIDATE_STATUS.noApplication, label: STATUS_LABELS[CANDIDATE_STATUS.noApplication] },
  { value: CANDIDATE_STATUS.review, label: STATUS_LABELS[CANDIDATE_STATUS.review] },
  { value: CANDIDATE_STATUS.shortlisted, label: STATUS_LABELS[CANDIDATE_STATUS.shortlisted] },
  { value: CANDIDATE_STATUS.interview, label: STATUS_LABELS[CANDIDATE_STATUS.interview] },
  { value: CANDIDATE_STATUS.rejected, label: STATUS_LABELS[CANDIDATE_STATUS.rejected] },
];

const ITEMS_PER_PAGE = 10;

function countByStatus(candidates, status) {
  return candidates.filter((candidate) => candidate.status === status).length;
}

function formatAppliedDate(dateString) {
  if (!dateString) {
    return 'Chưa cập nhật';
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
          throw new Error(payload.message || 'Không thể tải danh sách ứng viên.');
        }

        setCandidates(Array.isArray(payload.candidates) ? payload.candidates : []);
        setLoadError('');
      } catch (error) {
        setCandidates([]);
        setLoadError(error?.message || 'Không thể tải danh sách ứng viên.');
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
        label: 'Chưa ứng tuyển',
        value: String(countByStatus(candidates, CANDIDATE_STATUS.noApplication)).padStart(2, '0'),
        tone: 'NoApplication',
      },
      {
        label: 'Cần đánh giá',
        value: String(countByStatus(candidates, CANDIDATE_STATUS.review)).padStart(2, '0'),
        tone: 'Review',
      },
      {
        label: 'Sẵn sàng',
        value: String(countByStatus(candidates, CANDIDATE_STATUS.shortlisted)).padStart(2, '0'),
        tone: 'Shortlisted',
      },
      {
        label: 'Phỏng vấn',
        value: String(countByStatus(candidates, CANDIDATE_STATUS.interview)).padStart(2, '0'),
        tone: 'Interview',
      },
      {
        label: 'Bị loại',
        value: String(countByStatus(candidates, CANDIDATE_STATUS.rejected)).padStart(2, '0'),
        tone: 'Rejected',
      },
    ],
    [candidates],
  );

  if (!isAuthorized || isLoading) {
    return <div className={styles.loadingState}>Đang tải màn hình quản lý ứng viên...</div>;
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
            <p className={styles.pageEyebrow}>Tuyển dụng bảo vệ</p>
            <h1 className={styles.title}>Bảng điều phối xét duyệt</h1>
          </div>
          <div className={`${styles.heroPanel} ${styles.candidateHeroPanel}`}>
            <p className={styles.heroPanelLabel}>Tổng số ứng viên</p>
            <p className={`${styles.heroPanelValue} ${styles.candidateHeroValue}`}>
              {String(candidates.length).padStart(2, '0')}
            </p>
            <p className={styles.heroPanelText}>Số lượng hồ sơ hiện đang có trong hệ thống xét duyệt.</p>
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
            <p className={styles.toolbarEyebrow}>Bộ lọc thao tác</p>
            <h2 className={styles.toolbarTitle}>Tìm nhanh và thu hẹp danh sách</h2>
          </div>
          <div className={styles.toolbar}>
            <SearchBar value={searchTerm} onChange={setSearchTerm} />
            <FilterDropdown value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          </div>
        </section>

        <section className={styles.card}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionEyebrow}>Danh sách xét duyệt</p>
              <h2 className={styles.sectionTitleLarge}>Danh sách theo dõi</h2>
            </div>
            <p className={styles.sectionMeta}>
              Trang {currentPage}/{totalPages} • {filteredCandidates.length} ứng viên
            </p>
          </div>

          <div className={styles.tableHeader}>
            <span>Họ và tên</span>
            <span>Email</span>
            <span>Số điện thoại</span>
            <span>Vị trí ứng tuyển</span>
            <span>Ngày cập nhật</span>
            <span>Trạng thái</span>
            <span>Hành động</span>
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
              <p className={styles.emptyStateTitle}>Không có ứng viên phù hợp</p>
              <p className={styles.emptyStateText}>Thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái để mở rộng kết quả.</p>
            </div>
          )}

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </section>
      </main>
    </div>
  );
}

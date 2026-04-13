'use client';

import { useEffect, useMemo, useState } from 'react';
import JobCard from '@/features/jobs/components/JobCard';
import JobsToolbar from '@/features/jobs/components/JobsToolbar';
import styles from './JobsListView.module.css';

const ITEMS_PER_PAGE = 9;
const ALL_OPTION = 'all';

function normalizeSearchValue(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function buildOptionList(jobs, key) {
  const values = Array.from(
    new Set(
      jobs
        .map((job) => String(job[key] || '').trim())
        .filter(Boolean),
    ),
  );

  return values.sort((left, right) => left.localeCompare(right, 'vi'));
}

function buildSearchIndex(job) {
  return normalizeSearchValue([
    job.title,
    job.location,
    job.company,
    job.address,
    job.description,
    job.salary,
    job.experience,
    job.status,
    job.summary?.mode,
  ].join(' '));
}

export default function JobsListView({ jobs }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState(ALL_OPTION);
  const [modeFilter, setModeFilter] = useState(ALL_OPTION);
  const [currentPage, setCurrentPage] = useState(1);

  const locationOptions = useMemo(() => buildOptionList(jobs, 'location'), [jobs]);
  const modeOptions = useMemo(
    () => Array.from(new Set(jobs.map((job) => String(job.summary?.mode || '').trim()).filter(Boolean))).sort((left, right) => left.localeCompare(right, 'vi')),
    [jobs],
  );

  const filteredJobs = useMemo(() => {
    const normalizedQuery = normalizeSearchValue(searchTerm);

    return jobs.filter((job) => {
      const matchesSearch = !normalizedQuery || buildSearchIndex(job).includes(normalizedQuery);
      const matchesLocation = locationFilter === ALL_OPTION || String(job.location || '').trim() === locationFilter;
      const matchesMode = modeFilter === ALL_OPTION || String(job.summary?.mode || '').trim() === modeFilter;

      return matchesSearch && matchesLocation && matchesMode;
    });
  }, [jobs, locationFilter, modeFilter, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / ITEMS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, locationFilter, modeFilter]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const visibleJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredJobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [currentPage, filteredJobs]);

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  function clearFilters() {
    setSearchTerm('');
    setLocationFilter(ALL_OPTION);
    setModeFilter(ALL_OPTION);
  }

  return (
    <main className={styles.page}>
      <JobsToolbar
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        locationFilter={locationFilter}
        onLocationFilterChange={setLocationFilter}
        locationOptions={locationOptions}
        modeFilter={modeFilter}
        onModeFilterChange={setModeFilter}
        modeOptions={modeOptions}
        onClearFilters={clearFilters}
        resultCount={filteredJobs.length}
      />

      {visibleJobs.length > 0 ? (
        <section className={styles.grid}>
          {visibleJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </section>
      ) : (
        <section className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>Không tìm thấy công việc phù hợp</h2>
          <p className={styles.emptyText}>Thử đổi từ khóa tìm kiếm hoặc đặt lại bộ lọc để xem thêm vị trí tuyển dụng.</p>
        </section>
      )}

      {totalPages > 1 ? (
        <div className={styles.pagination}>
          <button type="button" onClick={() => setCurrentPage(currentPage - 1)} disabled={currentPage === 1}>
            ‹
          </button>
          {pageNumbers.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              className={pageNumber === currentPage ? styles.active : ''}
              onClick={() => setCurrentPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}
          <button type="button" onClick={() => setCurrentPage(currentPage + 1)} disabled={currentPage === totalPages}>
            ›
          </button>
        </div>
      ) : null}
    </main>
  );
}

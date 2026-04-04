'use client';

import { useEffect, useMemo, useState } from 'react';
import JobCard from '@/features/jobs/components/JobCard';
import JobsToolbar from '@/features/jobs/components/JobsToolbar';
import styles from './JobsListView.module.css';

const ITEMS_PER_PAGE = 9;

export default function JobsListView({ jobs }) {
  const [currentPage, setCurrentPage] = useState(1);
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

  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <main className={styles.page}>
      <JobsToolbar />
      <section className={styles.grid}>
        {visibleJobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </section>

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

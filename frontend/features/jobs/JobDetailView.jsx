import Link from 'next/link';
import JobSummaryCard from '@/features/jobs/components/JobSummaryCard';
import styles from './JobDetailView.module.css';

function Icon({ children }) {
  return (
    <span className={styles.iconWrap} aria-hidden="true">
      <svg viewBox="0 0 24 24">{children}</svg>
    </span>
  );
}

export default function JobDetailView({ job }) {
  if (!job) {
    return (
      <main className={styles.page}>
        <p className={styles.notFound}>Không tìm thấy thông tin vị trí.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumb}>Tổng quan &gt; Vị trí tuyển dụng &gt; Chi tiết</div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarRight}>
          <div className={styles.searchBox}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="m17.5 17.5 3 3M10.7 18a7.3 7.3 0 1 0 0-14.6 7.3 7.3 0 0 0 0 14.6Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
            <input type="text" placeholder="Tìm kiếm công việc..." />
          </div>

          <button type="button" className={styles.filterButton} aria-label="Bộ lọc">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M7 12h10M10 17h4" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>

          <Link className={styles.backButton} href="/jobs">
            Quay lại danh sách
          </Link>
        </div>
      </div>

      <section className={styles.heading}>
        <div className={styles.titleRow}>
          <p className={styles.badge}>{job.badge || 'ĐANG TUYỂN'}</p>
          <h1 className={styles.title}>{job.title}</h1>
        </div>

        <div className={styles.metaRow}>
          <p className={styles.metaItem}>
            <Icon>
              <path d="M4 6h16v12H4zM8 6V4m8 2V4M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </Icon>
            {job.company}
          </p>

          <p className={styles.metaItem}>
            <Icon>
              <path
                d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <circle cx="12" cy="10" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </Icon>
            {job.address}
          </p>
        </div>
      </section>

      <section className={styles.stats}>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>
            <Icon>
              <path d="M4 8h16v8H4zM8 8V6m8 2V6M8 12h3" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </Icon>
            Mức lương
          </div>
          <p className={styles.statValue}>{job.salary || 'Thỏa thuận'}</p>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statLabel}>
            <Icon>
              <path d="M4 18h16V9l-4-3H8L4 9v9Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M9 12h6" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </Icon>
            Kinh nghiệm
          </div>
          <p className={styles.statValue}>{job.experience || 'Không yêu cầu'}</p>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statLabel}>
            <Icon>
              <path
                d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 19a4.5 4.5 0 0 1 9 0M13 19a4 4 0 0 1 7.5 0"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </Icon>
            Ứng viên
          </div>
          <p className={styles.statValue}>{job.candidates}</p>
        </article>
      </section>

      <section className={styles.contentGrid}>
        <div className={styles.contentCol}>
          <section className={styles.block}>
            <h2 className={styles.sectionTitle}>Mô tả công việc</h2>
            <p className={styles.bodyText}>{job.description || 'Chưa có mô tả công việc.'}</p>
          </section>

          <section className={styles.block}>
            <h2 className={styles.sectionTitle}>Yêu cầu công việc</h2>

            <ul className={styles.requirements}>
              {(job.requirements || []).map((item) => (
                <li key={item}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 4h14v16H5zM8 12l2.2 2.2L16 8.7" fill="none" stroke="currentColor" strokeWidth="1.7" />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.block}>
            <h2 className={styles.sectionTitle}>Lịch làm việc</h2>

            <div className={styles.schedule}>
              {(job.schedule || []).map((item) => (
                <article key={item.label} className={styles.scheduleCard}>
                  <p>{item.label}</p>
                  <h4>{item.value}</h4>
                </article>
              ))}
            </div>
          </section>
        </div>

        <JobSummaryCard summary={job.summary} jobId={job.id} />
      </section>

      <section className={styles.cta}>
        <h3>Sẵn sàng đồng hành cùng chúng tôi?</h3>
        <p>Quá trình ứng tuyển diễn ra nhanh và đồng bộ với thông tin mới nhất của vị trí.</p>
      </section>
    </main>
  );
}

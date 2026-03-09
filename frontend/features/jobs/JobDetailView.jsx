import Link from 'next/link';
import JobSummaryCard from '../../components/jobs/JobSummaryCard';
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
        <p className={styles.notFound}>Khong tim thay thong tin vi tri.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumb}>Tong quan &gt; Vi tri tuyen dung &gt; Chi tiet vi tri Bao ve</div>

      <div className={styles.toolbar}>
        <div className={styles.toolbarRight}>
          <div className={styles.searchBox}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m17.5 17.5 3 3M10.7 18a7.3 7.3 0 1 0 0-14.6 7.3 7.3 0 0 0 0 14.6Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            <input type="text" placeholder="Tim kiem cong viec..." />
          </div>
          <button type="button" className={styles.filterButton} aria-label="Bo loc">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M7 12h10M10 17h4" fill="none" stroke="currentColor" strokeWidth="1.8" />
            </svg>
          </button>
          <Link className={styles.backButton} href="/jobs">
            Quay lai danh sach
          </Link>
        </div>
      </div>

      <section className={styles.heading}>
        <div className={styles.titleRow}>
          <p className={styles.badge}>DANG TUYEN</p>
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
              <path d="M12 21s6-5.4 6-11a6 6 0 1 0-12 0c0 5.6 6 11 6 11Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
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
            Muc luong
          </div>
          <p className={styles.statValue}>8.000.000 - 12.000.000 VND / thang</p>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>
            <Icon>
              <path d="M4 18h16V9l-4-3H8L4 9v9Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M9 12h6" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </Icon>
            Kinh nghiem
          </div>
          <p className={styles.statValue}>{job.experience}</p>
        </article>
        <article className={styles.statCard}>
          <div className={styles.statLabel}>
            <Icon>
              <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.5 19a4.5 4.5 0 0 1 9 0M13 19a4 4 0 0 1 7.5 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
            </Icon>
            Ung vien
          </div>
          <p className={styles.statValue}>{job.candidates}</p>
        </article>
      </section>

      <section className={styles.contentGrid}>
        <div className={styles.contentCol}>
          <section className={styles.block}>
            <h2 className={styles.sectionTitle}>Mo ta cong viec</h2>
            <p className={styles.bodyText}>
              Chung toi dang tim kiem mot Nhan vien Bao ve chuyen nghiep va canh giac cao cho Khoi Cao cap tai
              Thanh Hoa. Trong vai tro nay, ban se chiu trach nhiem duy tri moi truong an toan va an ninh cho
              cac khach hang VIP cung nhu tai san cua ho.
            </p>
            <p className={styles.bodyText}>
              Ban se dai dien cho thuong hieu uy tin cua Bao ve Long Hai, cung cap dich vu xuat sac trong khi
              thuc thi cac quy dinh an ninh voi thai do cuong quyet nhung nha nhan.
            </p>
          </section>

          <section className={styles.block}>
            <h2 className={styles.sectionTitle}>Yeu cau cong viec</h2>
            <ul className={styles.requirements}>
              {job.requirements.map((item) => (
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
            <h2 className={styles.sectionTitle}>Lich lam viec</h2>
            <div className={styles.schedule}>
              {job.schedule.map((item) => (
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
        <h3>San sang dong hanh cung chung toi?</h3>
        <p>Qua trinh ung tuyen dien ra chua day 5 phut.</p>
      </section>
    </main>
  );
}

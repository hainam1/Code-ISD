import Link from 'next/link';
import styles from './JobCard.module.css';

export default function JobCard({ job }) {
  const normalizedBadge = (job.badge || '').trim().toUpperCase();

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <h3 className={styles.title}>{job.title}</h3>

        {job.badge ? (
          <span
            className={`${styles.badge} ${
              normalizedBadge === 'HOT' ? styles.badgeHot : ''
            }`}
          >
            {job.badge}
          </span>
        ) : null}
      </div>

      <p className={styles.meta}>Dia diem: {job.location}</p>

      <p className={styles.description}>
        {job.description || 'Xem chi tiet cong viec de biet them thong tin.'}
      </p>

      <p className={styles.salary}>Luong: {job.salary || 'Thoa thuan'}</p>

      <Link href={`/jobs/${job.id}`} className={styles.button}>
        Chi tiet cong viec
      </Link>
    </article>
  );
}

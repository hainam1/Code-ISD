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

      <p className={styles.meta}>📍 {job.location}</p>

      <p className={styles.description}>
        Tuần tra và giám sát khu vực theo ca để đảm bảo an ninh và an toàn tại site.
      </p>

      <p className={styles.salary}>💵 {job.salary}</p>

      <Link href={`/jobs/${job.id}`} className={styles.button}>
        Chi tiết công việc
      </Link>
    </article>
  );
}

import Link from 'next/link';
import styles from './JobCard.module.css';

function truncateWords(value, maxWords = 15) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) {
    return String(value || '').trim();
  }

  return `${words.slice(0, maxWords).join(' ')} ...`;
}

export default function JobCard({ job }) {
  const normalizedBadge = (job.badge || '').trim().toUpperCase();
  const badgeClassName = [
    styles.badge,
    normalizedBadge === 'NEW' ? styles.badgeNew : '',
    normalizedBadge === 'HOT' ? styles.badgeHot : '',
  ].filter(Boolean).join(' ');

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <h3 className={styles.title}>{job.title}</h3>

        {job.badge ? (
          <span className={badgeClassName}>
            {job.badge}
          </span>
        ) : null}
      </div>

      <p className={styles.meta}>Dia diem: {job.location}</p>

      <p className={styles.description}>
        {truncateWords(job.description || 'Xem chi tiet cong viec de biet them thong tin.')}
      </p>

      <p className={styles.salary}>Luong: {job.salary || 'Thoa thuan'}</p>

      <Link href={`/jobs/${job.id}`} className={styles.button}>
        Chi tiet cong viec
      </Link>
    </article>
  );
}

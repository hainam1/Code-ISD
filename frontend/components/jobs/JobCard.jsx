import Link from 'next/link';
import styles from './JobCard.module.css';

export default function JobCard({ job }) {
  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <h3 className={styles.title}>{job.title}</h3>
        {job.badge ? <span className={styles.badge}>{job.badge}</span> : null}
      </div>
      <p className={styles.meta}>📍 {job.location}</p>
      <p className={styles.description}>
        Tuan tra va giam sat khu vuc theo ca de dam bao an ninh va an toan tai site.
      </p>
      <p className={styles.salary}>💵 {job.salary}</p>
      <Link href={`/jobs/${job.id}`} className={styles.button}>
        Chi tiet cong viec
      </Link>
    </article>
  );
}

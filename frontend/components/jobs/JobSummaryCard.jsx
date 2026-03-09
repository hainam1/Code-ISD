import Link from 'next/link';
import styles from './JobSummaryCard.module.css';

export default function JobSummaryCard({ summary, jobId }) {
  return (
    <aside className={styles.card}>
      <h3 className={styles.title}>Tom tat cong viec</h3>
      <ul className={styles.list}>
        <li>
          <span>Dia diem</span>
          <strong>{summary.place}</strong>
        </li>
        <li>
          <span>Hinh thuc lam viec</span>
          <strong>{summary.mode}</strong>
        </li>
        <li>
          <span>Ngay dang</span>
          <strong>{summary.postedAt}</strong>
        </li>
      </ul>
      <Link className={styles.button} href={`/apply?jobId=${jobId}`}>
        Ung tuyen ngay
      </Link>
    </aside>
  );
}

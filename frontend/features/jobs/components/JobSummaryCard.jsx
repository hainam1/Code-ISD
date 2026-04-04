import Link from 'next/link';
import styles from './JobSummaryCard.module.css';

export default function JobSummaryCard({ summary, jobId }) {
  return (
    <aside className={styles.card}>
      <h3 className={styles.title}>Tóm tắt công việc</h3>

      <ul className={styles.list}>
        <li>
          <span>Địa điểm</span>
          <strong>{summary.place}</strong>
        </li>

        <li>
          <span>Hình thức làm việc</span>
          <strong>{summary.mode}</strong>
        </li>

        <li>
          <span>Ngày đăng</span>
          <strong>{summary.postedAt}</strong>
        </li>
      </ul>

      <Link className={styles.button} href={`/apply?jobId=${jobId}`}>
        Ứng tuyển ngay
      </Link>
    </aside>
  );
}

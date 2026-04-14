import Link from 'next/link';
import { repairText } from '@/shared/utils/text';
import styles from './JobSummaryCard.module.css';

export default function JobSummaryCard({ summary, jobId }) {
  const place = repairText(summary?.place || '');
  const mode = repairText(summary?.mode || '');
  const postedAt = repairText(summary?.postedAt || '');

  return (
    <aside className={styles.card}>
      <h3 className={styles.title}>Tóm tắt công việc</h3>

      <ul className={styles.list}>
        <li>
          <span>Địa điểm</span>
          <strong>{place}</strong>
        </li>

        <li>
          <span>Hình thức làm việc</span>
          <strong>{mode}</strong>
        </li>

        <li>
          <span>Ngày đăng</span>
          <strong>{postedAt}</strong>
        </li>
      </ul>

      <Link className={styles.button} href={`/apply?jobId=${jobId}`}>
        Ứng tuyển ngay
      </Link>
    </aside>
  );
}

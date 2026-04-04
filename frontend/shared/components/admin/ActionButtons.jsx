import Link from 'next/link';
import ActionButton from './ActionButton';
import styles from './AdminDashboard.module.css';

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 20 4.2-.8L19 8.4 15.6 5 4.8 15.8 4 20Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m13.8 6.8 3.4 3.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function CancelIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function ActionButtons({ editHref, onCancel }) {
  return (
    <div className={styles.interviewActionGroup}>
      <Link href={editHref} className={styles.detailButton}>
        <span className={styles.buttonIcon}><EditIcon /></span>
        Chỉnh sửa lịch phỏng vấn
      </Link>
      <ActionButton type="button" className={styles.secondaryButton} onClick={onCancel}>
        <span className={styles.buttonIcon}><CancelIcon /></span>
        Hủy lịch phỏng vấn
      </ActionButton>
    </div>
  );
}

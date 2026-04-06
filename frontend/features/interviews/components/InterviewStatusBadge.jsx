import styles from '@/shared/components/admin/AdminDashboard.module.css';

export default function InterviewStatusBadge({ children = 'Phỏng vấn' }) {
  return <span className={styles.interviewStatusBadge}>{children}</span>;
}

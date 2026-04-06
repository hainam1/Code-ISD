import styles from '@/shared/components/admin/AdminDashboard.module.css';
import { getStatusLabel } from '@/features/candidates/constants/statusOptions';

const STATUS_CLASS_MAP = {
  'No Application': styles.statusNoApplication,
  'Under Review': styles.statusReview,
  Shortlisted: styles.statusShortlisted,
  'Interview Scheduled': styles.statusInterview,
  Interviewed: styles.statusInterview,
  Approved: styles.statusShortlisted,
  Rejected: styles.statusRejected,
  'Final Rejected': styles.statusRejected,
};

export default function StatusBadge({ status }) {
  return <span className={`${styles.status} ${STATUS_CLASS_MAP[status] || styles.statusReview}`}>{getStatusLabel(status)}</span>;
}

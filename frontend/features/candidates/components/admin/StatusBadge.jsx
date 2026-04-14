import styles from '@/shared/components/admin/AdminDashboard.module.css';
import { getStatusLabel } from '@/features/candidates/constants/statusOptions';

const STATUS_CLASS_MAP = {
  'No Application': styles.statusNoApplication,
  'Needs Review': styles.statusReview,
  'Under Review': styles.statusReview,
  Shortlisted: styles.statusReview,
  'Interview Scheduled': styles.statusInterview,
  Interviewed: styles.statusInterview,
  Approved: styles.statusShortlisted,
  Rejected: styles.statusRejected,
  'Final Rejected': styles.statusRejected,
};

export default function StatusBadge({ status }) {
  return <span className={`${styles.status} ${STATUS_CLASS_MAP[status] || styles.statusReview}`}>{getStatusLabel(status)}</span>;
}

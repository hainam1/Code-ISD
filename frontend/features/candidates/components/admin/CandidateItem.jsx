import Link from 'next/link';
import { ADMIN_ROUTES } from '@/lib/constants/routes';
import StatusBadge from './StatusBadge';
import styles from '@/shared/components/admin/AdminDashboard.module.css';

function getInitials(fullName) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export default function CandidateItem({ candidate, appliedDate }) {
  return (
    <article className={styles.row}>
      <div className={styles.candidateMeta}>
        <div
          className={styles.avatar}
          style={candidate.avatarUrl ? { backgroundImage: `url(${candidate.avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          {candidate.avatarUrl ? null : getInitials(candidate.fullName)}
        </div>
        <div>
          <p className={styles.candidateName}>{candidate.fullName}</p>
        </div>
      </div>
      <p className={`${styles.muted} ${styles.truncateText}`} title={candidate.email}>
        {candidate.email || ''}
      </p>
      <p className={styles.muted}>{candidate.phone || ''}</p>
      <p className={`${styles.muted} ${styles.truncateText}`} title={candidate.position}>
        {candidate.position}
      </p>
      <p className={styles.muted}>{appliedDate}</p>
      <StatusBadge status={candidate.status} />
      <Link href={ADMIN_ROUTES.candidateDetail(candidate.id)} className={styles.detailButton}>
        Xem thêm
      </Link>
    </article>
  );
}

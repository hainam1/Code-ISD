import styles from '@/shared/components/admin/AdminDashboard.module.css';

function getInitials(fullName) {
  return (
    fullName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'UV'
  );
}

export default function CandidateHeader({ fullName, position, avatarUrl, action }) {
  return (
    <div className={styles.candidateHeader}>
      <div className={styles.candidateMeta}>
        <div
          className={styles.avatar}
          style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
        >
          {avatarUrl ? null : getInitials(fullName)}
        </div>
        <div>
          <h1 className={styles.title}>{fullName}</h1>
          <p className={styles.subtitle}>Ứng tuyển: {position}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

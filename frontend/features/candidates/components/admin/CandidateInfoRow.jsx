import styles from '@/shared/components/admin/AdminDashboard.module.css';

function CandidateAvatar({ fullName }) {
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase() || '')
    .join('');

  return <div className={styles.interviewAvatar}>{initials || 'UV'}</div>;
}

export default function CandidateInfoRow({ icon, label, value, emphasizeAvatar = false }) {
  return (
    <div className={styles.interviewInfoRow}>
      <div className={styles.interviewInfoLabelWrap}>
        <span className={styles.interviewInfoIcon}>{icon}</span>
        <span className={styles.interviewInfoLabel}>{label}</span>
      </div>
      <div className={styles.interviewInfoValueWrap}>
        {emphasizeAvatar ? <CandidateAvatar fullName={value} /> : null}
        <span className={styles.interviewInfoValue}>{value}</span>
      </div>
    </div>
  );
}

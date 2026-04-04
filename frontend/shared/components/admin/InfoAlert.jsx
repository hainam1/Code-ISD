import styles from './AdminDashboard.module.css';

export default function InfoAlert({ children }) {
  return (
    <div className={styles.infoAlert}>
      <p className={styles.infoAlertText}>{children}</p>
    </div>
  );
}

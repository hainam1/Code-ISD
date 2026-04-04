import styles from './AdminDashboard.module.css';

export default function SuccessCard({ header, title, description, children }) {
  return (
    <section className={styles.successCard}>
      {header}
      <div className={styles.successCardBody}>
        <h1 className={styles.successTitle}>{title}</h1>
        <p className={styles.successDescription}>{description}</p>
        {children}
      </div>
    </section>
  );
}

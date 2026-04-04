import styles from '@/shared/components/admin/AdminDashboard.module.css';

export default function DocumentSection({ title, description, fileName, emptyText, children }) {
  return (
    <section className={styles.detailCard}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {description ? <p className={styles.sectionSubtitle}>{description}</p> : null}
      <div className={styles.documentRow}>
        <p className={fileName ? styles.documentName : styles.documentPlaceholder}>{fileName || emptyText}</p>
        {children}
      </div>
    </section>
  );
}

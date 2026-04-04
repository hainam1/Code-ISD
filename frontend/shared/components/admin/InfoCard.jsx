import styles from './AdminDashboard.module.css';

export default function InfoCard({ title, items }) {
  return (
    <section className={styles.detailCard}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.detailGrid}>
        {items.map((item) => (
          <div key={item.label} className={styles.detailBlock}>
            <p className={styles.detailLabel}>{item.label}</p>
            <p className={styles.detailValue}>{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

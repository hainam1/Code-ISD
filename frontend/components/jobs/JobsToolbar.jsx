import styles from './JobsToolbar.module.css';

export default function JobsToolbar() {
  return (
    <div className={styles.toolbar}>
      <div>
        <p className={styles.kicker}>LONG HAI SECURITY COMPANY</p>
        <h1 className={styles.title}>Cac vi tri bao ve dang tuyen</h1>
      </div>

      <div className={styles.searchWrap}>
        <input type="text" placeholder="Tim kiem cong viec..." className={styles.searchInput} />
        <button type="button" className={styles.filterButton}>
          ⌘
        </button>
      </div>
    </div>
  );
}

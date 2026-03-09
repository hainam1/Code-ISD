import Link from 'next/link';
import styles from './AppHeader.module.css';

export default function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/jobs" className={styles.brand}>
          <span className={styles.brandDot}>◈</span>
          Smart Guard
        </Link>

        <nav className={styles.actions}>
          <button type="button" className={styles.ghostButton} aria-label="Thong bao">
            🔔
          </button>
          <Link href="/jobs" className={styles.tabButton}>
            Cong viec
          </Link>
          <button type="button" className={styles.ghostButton}>
            Ho so
          </button>
          <Link href="/login" className={styles.tabButton}>
            Dang xuat
          </Link>
        </nav>
      </div>
    </header>
  );
}

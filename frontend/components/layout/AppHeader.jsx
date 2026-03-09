import Link from 'next/link';
import styles from './AppHeader.module.css';

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2 4 5v6.5c0 5.1 3.4 9.6 8 10.8 4.6-1.2 8-5.7 8-10.8V5l-8-3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M9 12.2 11 14l4-4.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M15 17H9m9-1V11a6 6 0 1 0-12 0v5l-1.2 1.8A1 1 0 0 0 5.6 19h12.8a1 1 0 0 0 .8-1.2L18 16Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="M10.6 19a1.7 1.7 0 0 0 2.8 0" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 6H6.5A2.5 2.5 0 0 0 4 8.5v7A2.5 2.5 0 0 0 6.5 18H9" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M13 8l4 4-4 4M17 12H9" fill="none" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export default function AppHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link href="/jobs" className={styles.brand}>
          <span className={styles.brandIcon}>
            <ShieldIcon />
          </span>
          Smart Guard
        </Link>

        <nav className={styles.actions}>
          <button type="button" className={styles.iconButton} aria-label="Thong bao">
            <BellIcon />
          </button>
          <Link href="/jobs" className={styles.menuButton}>
            Cong viec
          </Link>
          <button type="button" className={styles.menuButton}>
            Ho so
          </button>
          <Link href="/login" className={styles.logoutButton}>
            Dang xuat
            <span className={styles.logoutIcon}>
              <LogoutIcon />
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ADMIN_ROUTES } from '@/lib/constants/routes';
import { logout } from '@/features/auth/api/authApi.jsx';
import styles from './AdminDashboard.module.css';

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

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 7h4v10h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M10 8 6 12l4 4M6 12h10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CandidateIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5 19a7 7 0 0 1 14 0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function JobIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M5.5 7h13A1.5 1.5 0 0 1 20 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5v-9A1.5 1.5 0 0 1 5.5 7Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 12h16" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

const NAV_ITEMS = [
  {
    href: ADMIN_ROUTES.candidates,
    label: 'Ứng viên',
    match: ADMIN_ROUTES.candidates,
    icon: CandidateIcon,
  },
  {
    href: ADMIN_ROUTES.jobs,
    label: 'Công việc',
    match: ADMIN_ROUTES.jobs,
    icon: JobIcon,
  },
];

export default function AdminHeader() {
  const router = useRouter();
  const pathname = usePathname();

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <aside className={styles.header}>
      <div className={styles.headerInner}>
        <Link href={ADMIN_ROUTES.candidates} className={styles.brand}>
          <span className={styles.brandIcon}>
            <ShieldIcon />
          </span>
          <span className={styles.brandTextWrap}>
            <strong className={styles.brandTitle}>Smart Guard</strong>
            <span className={styles.brandSubtitle}>Tuyen dung bao ve</span>
          </span>
        </Link>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.match);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
              >
                <span className={styles.navIcon}>
                  <Icon />
                </span>
                <span className={styles.navText}><strong>{item.label}</strong></span>
              </Link>
            );
          })}
        </nav>

        <button type="button" onClick={handleLogout} className={styles.logoutLinkButton}>
          <span className={styles.logoutIcon}>
            <LogoutIcon />
          </span>
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}


import styles from './AdminDashboard.module.css';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="6.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m16 16 4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function SearchBar({ value, onChange }) {
  return (
    <div className={styles.searchWrap}>
      <span className={styles.searchIcon}>
        <SearchIcon />
      </span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={styles.searchInput}
        placeholder="Tìm kiếm ứng viên theo tên, email, số điện thoại..."
        aria-label="Tìm kiếm ứng viên"
      />
    </div>
  );
}

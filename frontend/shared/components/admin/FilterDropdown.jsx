import styles from './AdminDashboard.module.css';

export default function FilterDropdown({ value, onChange, options }) {
  return (
    <div className={styles.filterWrap}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={styles.filterSelect}
        aria-label="Lọc theo trạng thái"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

import styles from '@/shared/components/admin/AdminDashboard.module.css';
import { getStatusLabel } from '@/features/candidates/constants/statusOptions';

export default function StatusDropdown({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className={styles.statusSelect}
      aria-label="Cập nhật trạng thái ứng viên"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {getStatusLabel(option)}
        </option>
      ))}
    </select>
  );
}

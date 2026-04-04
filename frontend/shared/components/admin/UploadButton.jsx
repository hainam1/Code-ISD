'use client';

import { useId } from 'react';
import styles from './AdminDashboard.module.css';

export default function UploadButton({ label, onFileSelect, accept }) {
  const inputId = useId();

  function handleChange(event) {
    const file = event.target.files?.[0] || null;
    onFileSelect(file);
    event.target.value = '';
  }

  return (
    <>
      <input id={inputId} type="file" accept={accept} className={styles.hiddenInput} onChange={handleChange} />
      <label htmlFor={inputId} className={styles.secondaryButton}>
        {label}
      </label>
    </>
  );
}

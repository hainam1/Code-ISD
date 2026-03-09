'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { register } from '../../../services/authApi';
import styles from './register.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [registerType, setRegisterType] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!fullName.trim() || !identifier.trim() || !password.trim()) {
      setError('Vui long nhap day du thong tin bat buoc.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Xac nhan mat khau khong khop.');
      return;
    }

    setIsLoading(true);
    try {
      await register({ fullName, identifier, registerType, password });
      router.push('/login');
    } catch (err) {
      setError(err?.message || 'Dang ky that bai.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.logoText}>Smart Guard</h1>
        <p className={styles.subtitle}>Long Hai Security Recruitment</p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Tao tai khoan</h2>
        <p className={styles.cardSubtitle}>Tao tai khoan Smart Guard cua ban</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.formFields}>
            <label className={styles.label}>
              Ho va ten *
              <input
                className={styles.input}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nguyen Van A"
              />
            </label>
            <label className={styles.label}>
              Email hoac so dien thoai *
              <div className={styles.typeSwitch}>
                <button
                  type="button"
                  className={registerType === 'email' ? styles.typeButtonActive : styles.typeButton}
                  onClick={() => setRegisterType('email')}
                >
                  Gmail
                </button>
                <button
                  type="button"
                  className={registerType === 'phone' ? styles.typeButtonActive : styles.typeButton}
                  onClick={() => setRegisterType('phone')}
                >
                  So dien thoai
                </button>
              </div>
              <input
                className={styles.input}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={registerType === 'email' ? 'tenban@email.com' : '0123456789'}
              />
            </label>
            <label className={styles.label}>
              Mat khau *
              <input
                type="password"
                className={styles.input}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
              />
            </label>
            <label className={styles.label}>
              Xac nhan mat khau *
              <input
                type="password"
                className={styles.input}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="********"
              />
            </label>
          </div>

          {error ? <p className={styles.errorText}>{error}</p> : null}

          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? 'Dang xu ly...' : 'Dang ky'}
          </button>
        </form>

        <Link href="/login" className={styles.footerLink}>
          Da co tai khoan? <span>Dang nhap</span>
        </Link>
      </div>
    </div>
  );
}

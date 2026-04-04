'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './login.module.css';
import { ADMIN_ROUTES } from '@/lib/constants/routes';
import { login } from '@/features/auth/api/authApi';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;

export default function LoginPage() {
  const router = useRouter();
  const [loginType, setLoginType] = useState('user');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!identifier.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ Email hoặc Password.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    const normalizedIdentifier = identifier.trim().toLowerCase();
    const isEmailLogin = normalizedIdentifier.includes('@');

    if (isEmailLogin && !EMAIL_REGEX.test(normalizedIdentifier)) {
      setError('Email không hợp lệ (ví dụ: abc@gmail.com).');
      return;
    }

    if (!isEmailLogin && !PHONE_REGEX.test(normalizedIdentifier)) {
      setError('Email, số điện thoại, password hoặc loại tài khoản chưa chính xác');
      return;
    }

    setIsLoading(true);

    try {
      const response = await login({ identifier: normalizedIdentifier, password, loginType });
      router.push(response?.user?.role === 'ADMIN' ? ADMIN_ROUTES.candidates : '/dashboard');
    } catch (err) {
      setError(err?.message || 'Email, số điện thoại, password hoặc loại tài khoản chưa chính xác');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.logoIcon}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
            color="#1f2937"
          >
            <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm0 11.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
          </svg>
        </div>
        <h1 className={styles.logoText}>Smart Guard</h1>
        <p className={styles.subtitle}>Tuyển dụng bảo vệ Long Hải</p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Đăng nhập</h2>
        <p className={styles.cardSubtitle}>Đăng nhập vào tài khoản Smart Guard của bạn</p>

        <div className={styles.tabSwitch}>
          <button
            type="button"
            className={loginType === 'user' ? styles.tabButtonActive : styles.tabButton}
            onClick={() => setLoginType('user')}
          >
            Người dùng
          </button>

          <button
            type="button"
            className={loginType === 'admin' ? styles.tabButtonActive : styles.tabButton}
            onClick={() => setLoginType('admin')}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.formFields}>
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="identifier">
                Địa chỉ email hoặc số điện thoại
              </label>

              <input
                type="text"
                id="identifier"
                className={styles.input}
                placeholder={loginType === 'admin' ? 'admin@gmail.com' : 'abc@gmail.com hoặc 0123456789'}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                autoComplete="username"
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="password">
                Mật khẩu
              </label>

              <input
                type="password"
                id="password"
                className={styles.input}
                placeholder="********"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>

          {error ? <p className={styles.errorText}>{error}</p> : null}

          <button type="submit" className={styles.button} disabled={isLoading}>
            {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <Link href="/register" className={styles.footerLink}>
          Chưa có tài khoản? <span>Đăng ký</span>
        </Link>
      </div>

      <div className={styles.pageFooter}>© 2026 Công ty Bảo vệ Long Hải</div>
    </div>
  );
}

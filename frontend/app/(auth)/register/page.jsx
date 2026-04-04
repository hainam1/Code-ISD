'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { register } from '@/features/auth/api/authApi';
import styles from './register.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0[3-9][0-9]{8}$/;

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
      setError('Vui lòng nhập đầy đủ thông tin.');
      return;
    }

    const normalizedIdentifier = identifier.trim();

    if (registerType === 'email' && !EMAIL_REGEX.test(normalizedIdentifier.toLowerCase())) {
      setError('Email không hợp lệ (ví dụ: abc@gmail.com).');
      return;
    }

    if (registerType === 'phone' && !PHONE_REGEX.test(normalizedIdentifier)) {
      setError('Số điện thoại phải gồm 10 chữ số và bắt đầu từ 03 đến 09.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await register({
        fullName,
        identifier: registerType === 'email' ? normalizedIdentifier.toLowerCase() : normalizedIdentifier,
        registerType,
        password,
      });

      router.push('/login');
    } catch (err) {
      setError(err?.message || 'Đăng ký thất bại. Vui lòng nhập lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.logoText}>Smart Guard</h1>
        <p className={styles.subtitle}>Tuyển dụng bảo vệ Long Hải</p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.cardTitle}>Tạo tài khoản</h2>
        <p className={styles.cardSubtitle}>Tạo tài khoản Smart Guard của bạn</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.formFields}>
            <label className={styles.label}>
              Họ và tên *
              <input
                className={styles.input}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Nguyễn Văn A"
              />
            </label>

            <label className={styles.label}>
              Email hoặc số điện thoại *
              <div className={styles.typeSwitch}>
                <button
                  type="button"
                  className={`${styles.typeButton} ${registerType === 'email' ? styles.typeButtonSelected : ''}`}
                  onClick={() => setRegisterType('email')}
                  aria-pressed={registerType === 'email'}
                >
                  Gmail
                </button>

                <button
                  type="button"
                  className={`${styles.typeButton} ${registerType === 'phone' ? styles.typeButtonSelected : ''}`}
                  onClick={() => setRegisterType('phone')}
                  aria-pressed={registerType === 'phone'}
                >
                  Số điện thoại
                </button>
              </div>

              <input
                className={styles.input}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder={registerType === 'email' ? 'abc@gmail.com' : '03xxxxxxxx'}
              />
            </label>

            <label className={styles.label}>
              Mật khẩu *
              <input
                type="password"
                className={styles.input}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
              />
            </label>

            <label className={styles.label}>
              Xác nhận mật khẩu *
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
            {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>

        <Link href="/login" className={styles.footerLink}>
          Đã có tài khoản? <span>Đăng nhập</span>
        </Link>
      </div>
    </div>
  );
}

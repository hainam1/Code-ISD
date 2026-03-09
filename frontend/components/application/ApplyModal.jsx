'use client';

import { useState } from 'react';
import { submitApplication } from '../../services/api/applicationApi';
import styles from './ApplyModal.module.css';

export default function ApplyModal({ jobId }) {
  const [fullName, setFullName] = useState('Nguyen Van A');
  const [email, setEmail] = useState('nguyen.a@example.com');
  const [phone, setPhone] = useState('0123456789');
  const [cvUrl, setCvUrl] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!jobId) {
      setError('Thieu jobId. Hay ung tuyen tu trang chi tiet cong viec.');
      return;
    }

    setIsLoading(true);
    try {
      await submitApplication({ jobId, fullName, email, phone, cvUrl, resumeUrl, note });
      setSuccess('Gui don thanh cong. Chung toi se lien he voi ban som.');
      setNote('');
      setCvUrl('');
      setResumeUrl('');
    } catch (err) {
      setError(err?.message || 'Gui don that bai.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className={styles.overlay}>
      <section className={styles.modal}>
        <header className={styles.header}>
          <h1>Vi Tri Tuyen Dung</h1>
        </header>
        <p className={styles.sub}>Long Hai Security - Tuyen Dung</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Ho va Ten
            <input type="text" value={fullName} onChange={(event) => setFullName(event.target.value)} />
          </label>
          <label>
            Dia Chi Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            So Dien Thoai
            <input type="text" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </label>
          <label>
            Link CV
            <input
              type="url"
              value={cvUrl}
              onChange={(event) => setCvUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>
          <label>
            Link Ho so xin viec
            <input
              type="url"
              value={resumeUrl}
              onChange={(event) => setResumeUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>
          <label>
            Ghi chu
            <textarea
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Hay mo ta them ve kinh nghiem cua ban..."
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}
          {success ? <p className={styles.success}>{success}</p> : null}

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? 'Dang gui...' : 'Gui Don'}
          </button>
        </form>
      </section>
    </div>
  );
}

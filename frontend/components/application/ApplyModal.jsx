'use client';

import { useEffect, useState } from 'react';
import { submitApplication } from '../../services/api/applicationApi';
import styles from './ApplyModal.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;

export default function ApplyModal({ jobId }) {
  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(jobId || '');
  const [fullName, setFullName] = useState('');
  const [contactType, setContactType] = useState('email');
  const [identifier, setIdentifier] = useState('');
  const [note, setNote] = useState('');
  const [cvFile, setCvFile] = useState(null);
  const [healthFile, setHealthFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [candidateId, setCandidateId] = useState('');

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const response = await fetch('/api/jobs');
      const payload = await response.json();
      if (mounted && Array.isArray(payload.jobs)) {
        setJobs(payload.jobs);
      }

      if (typeof window !== 'undefined') {
        const raw = localStorage.getItem('smart_guard_session');
        if (raw) {
          try {
            const session = JSON.parse(raw);
            const user = session?.user || {};
            if (mounted) {
              setCandidateId(user.id || '');
            }
          } catch {
            // ignore malformed local storage payload
          }
        }
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (jobId) {
      setSelectedJobId(jobId);
    }
  }, [jobId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedJobId) {
      setError('Vui long chon vi tri tuyen dung truoc khi nop ho so.');
      return;
    }

    if (!fullName.trim() || !identifier.trim()) {
      setError('Vui long nhap day du thong tin ung vien.');
      return;
    }

    if (contactType === 'email' && !EMAIL_REGEX.test(identifier.trim().toLowerCase())) {
      setError('Email khong hop le.');
      return;
    }

    if (contactType === 'phone' && !PHONE_REGEX.test(identifier.trim())) {
      setError('So dien thoai khong hop le (10 chu so).');
      return;
    }

    if (!cvFile) {
      setError('Chua tai len CV');
      return;
    }
    if (!healthFile) {
      setError('Chua tai len ho so suc khoe');
      return;
    }

    if (!candidateId) {
      setError('Vui long dang nhap truoc khi nop ho so.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await submitApplication({
        jobId: selectedJobId,
        fullName,
        identifier: contactType === 'email' ? identifier.trim().toLowerCase() : identifier.trim(),
        contactType,
        note,
        cvFile,
        healthFile,
        candidateId,
      });
      setSuccess(response?.message || 'Application submitted successfully');
      setNote('');
      setCvFile(null);
      setHealthFile(null);
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
          <h1>Nop ho so ung tuyen</h1>
        </header>
        <p className={styles.sub}>Vui long dien thong tin ca nhan va tai len CV</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label>
            Vi tri tuyen dung *
            <select value={selectedJobId} onChange={(event) => setSelectedJobId(event.target.value)}>
              <option value="">-- Chon vi tri --</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ho va ten *
            <input
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Nhap ho va ten"
            />
          </label>

          <label>
            Email hoac so dien thoai *
            <div className={styles.typeSwitch}>
              <button
                type="button"
                className={`${styles.typeButton} ${contactType === 'email' ? styles.typeButtonSelected : ''}`}
                onClick={() => setContactType('email')}
              >
                Gmail
              </button>
              <button
                type="button"
                className={`${styles.typeButton} ${contactType === 'phone' ? styles.typeButtonSelected : ''}`}
                onClick={() => setContactType('phone')}
              >
                So dien thoai
              </button>
            </div>
            <input
              type={contactType === 'email' ? 'email' : 'text'}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder={contactType === 'email' ? 'abc@gmail.com' : '0123456789'}
            />
          </label>

          <div className={styles.uploadGroup}>
            <div className={styles.uploadLabelRow}>
              <span>Tai len CV *</span>
              <small>Toi da 5MB</small>
            </div>
            <label className={styles.uploadBox}>
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(event) => setCvFile(event.target.files?.[0] || null)}
              />
              <strong>Tai len CV</strong>
              <small>Ho tro dinh dang PDF, DOC, DOCX</small>
              {cvFile ? <em>{cvFile.name}</em> : null}
            </label>
          </div>

          <div className={styles.uploadGroup}>
            <div className={styles.uploadLabelRow}>
              <span>Tai len ho so suc khoe *</span>
              <small>Toi da 5MB</small>
            </div>
            <label className={styles.uploadBox}>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png"
                onChange={(event) => setHealthFile(event.target.files?.[0] || null)}
              />
              <strong>Tai len ho so</strong>
              <small>Ho tro dinh dang PDF, DOC, DOCX, PNG</small>
              {healthFile ? <em>{healthFile.name}</em> : null}
            </label>
          </div>

          <label>
            Ghi chu
            <textarea
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Mo ta them ve kinh nghiem cua ban..."
            />
          </label>

          {error ? <p className={styles.error}>{error}</p> : null}
          {success ? <p className={styles.success}>{success}</p> : null}

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? 'Dang gui...' : 'Submit Application'}
          </button>
        </form>
      </section>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitApplication } from '@/features/applications/api/applicationApi';
import { getSession } from '@/features/auth/api/authApi';
import styles from './ApplyModal.module.css';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0[3-9][0-9]{8}$/;

export default function ApplyModal({ jobId }) {
  const router = useRouter();

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
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      const response = await fetch('/api/jobs');
      const payload = await response.json();
      if (mounted && Array.isArray(payload.jobs)) {
        setJobs(payload.jobs);
      }

      const session = getSession();
      const user = session?.user || {};
      if (!mounted) {
        return;
      }

      setCandidateId(user.id || '');
      if (user.fullName) {
        setFullName(user.fullName);
      }
      if (user.email) {
        setContactType('email');
        setIdentifier(user.email);
      } else if (user.phone) {
        setContactType('phone');
        setIdentifier(user.phone);
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

  function handleCancel() {
    router.back();
  }

  function validateForm() {
    if (!selectedJobId) {
      setError('Vui lòng chọn vị trí tuyển dụng trước khi nộp hồ sơ.');
      return false;
    }

    if (!fullName.trim() || !identifier.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin ứng viên.');
      return false;
    }

    if (contactType === 'email' && !EMAIL_REGEX.test(identifier.trim().toLowerCase())) {
      setError('Email không hợp lệ.');
      return false;
    }

    if (contactType === 'phone' && !PHONE_REGEX.test(identifier.trim())) {
      setError('Số điện thoại phải gồm 10 chữ số và bắt đầu từ 03 đến 09.');
      return false;
    }

    if (!cvFile) {
      setError('Chưa tải lên CV.');
      return false;
    }

    if (!healthFile) {
      setError('Chưa tải lên hồ sơ sức khỏe.');
      return false;
    }

    if (!candidateId) {
      setError('Vui lòng đăng nhập trước khi nộp hồ sơ.');
      return false;
    }

    return true;
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setIsConfirmOpen(true);
  }

  async function handleConfirmSubmit() {
    if (!validateForm()) {
      setIsConfirmOpen(false);
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

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

      setSuccess(response?.message || 'Nộp hồ sơ thành công.');
      setIsConfirmOpen(false);
      router.replace('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err?.message || 'Gửi đơn thất bại.');
      setIsConfirmOpen(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <div className={styles.overlay}>
        <section className={styles.modal}>
          <header className={styles.header}>
            <h1>Nộp hồ sơ ứng tuyển</h1>
          </header>
          <p className={styles.sub}>Vui lòng điền thông tin cá nhân và tải lên CV</p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <label>
              Vị trí tuyển dụng *
              <div className={styles.readOnlyText}>
                {jobs.find((job) => job.id === selectedJobId)?.title || '--'}
              </div>
            </label>

            <label>
              Họ và tên *
              <div className={styles.readOnlyText}>{fullName}</div>
            </label>

            <label>
              {contactType === 'email' ? 'Email' : 'Số điện thoại'} *
              <div className={styles.readOnlyText}>{identifier}</div>
            </label>

            <div className={styles.uploadGroup}>
              <div className={styles.uploadLabelRow}>
                <span>Tải lên CV *</span>
                <small>Tối đa 5MB</small>
              </div>
              <label className={styles.uploadBox}>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(event) => setCvFile(event.target.files?.[0] || null)}
                />
                <strong>Tải lên CV</strong>
                <small>Hỗ trợ định dạng PDF, DOC, DOCX</small>
                {cvFile ? <em>{cvFile.name}</em> : null}
              </label>
            </div>

            <div className={styles.uploadGroup}>
              <div className={styles.uploadLabelRow}>
                <span>Tải lên hồ sơ sức khỏe *</span>
                <small>Tối đa 5MB</small>
              </div>
              <label className={styles.uploadBox}>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png"
                  onChange={(event) => setHealthFile(event.target.files?.[0] || null)}
                />
                <strong>Tải lên hồ sơ</strong>
                <small>Hỗ trợ định dạng PDF, DOC, DOCX, PNG</small>
                {healthFile ? <em>{healthFile.name}</em> : null}
              </label>
            </div>

            <label>
              Ghi chú
              <textarea
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Mô tả thêm về kinh nghiệm của bạn..."
              />
            </label>

            {error ? <p className={styles.error}>{error}</p> : null}
            {success ? <p className={styles.success}>{success}</p> : null}

            <button type="submit" className={styles.submitButton} disabled={isLoading}>
              {isLoading ? 'Đang gửi...' : 'Nộp hồ sơ'}
            </button>
            <button type="button" className={styles.cancelButton} onClick={handleCancel} disabled={isLoading}>
              Hủy
            </button>
          </form>
        </section>
      </div>

      {isConfirmOpen ? (
        <div className={styles.confirmOverlay}>
          <div className={styles.confirmModal}>
            <div className={styles.confirmIcon}>
              <span>i</span>
            </div>
            <h2 className={styles.confirmTitle}>Xác nhận gửi đơn</h2>
            <p className={styles.confirmText}>
              Bạn có chắc chắn muốn gửi đơn ứng tuyển cho vị trí này không?
            </p>
            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmBackButton}
                onClick={() => setIsConfirmOpen(false)}
                disabled={isLoading}
              >
                Quay lại chỉnh sửa
              </button>
              <button
                type="button"
                className={styles.confirmSubmitButton}
                onClick={handleConfirmSubmit}
                disabled={isLoading}
              >
                {isLoading ? 'Đang gửi...' : 'Gửi đơn'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

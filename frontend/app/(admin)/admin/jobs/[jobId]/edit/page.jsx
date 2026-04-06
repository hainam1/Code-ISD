'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminHeader from '@/shared/components/admin/AdminHeader';
import styles from '@/shared/components/admin/AdminDashboard.module.css';
import {
  EXPERIENCE_OPTIONS,
  JOB_SCHEDULE_LABELS,
  SCHEDULE_OPTIONS,
  STATUS_OPTIONS,
  WORK_MODE_OPTIONS,
} from '@/lib/constants/jobFormOptions';
import { ADMIN_ROUTES } from '@/lib/constants/routes';
import { repairText } from '@/shared/utils/text';
import { getSession } from '@/features/auth/api/authApi.jsx';

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="m15 6-6 6 6 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5 7h14M10 10.5v6M14 10.5v6M9 5h6l1 2H8l1-2Zm-2 2h10v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DotIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}

function EditorToolbar() {
  const items = ['B', 'I', 'T', '=', '*', '<'];

  return (
    <div className={styles.jobEditorToolbar}>
      {items.map((item) => (
        <button key={item} type="button" className={styles.jobEditorToolButton}>
          {item}
        </button>
      ))}
    </div>
  );
}

function RequirementItem({ title, onDelete }) {
  return (
    <div className={styles.jobRequirementItem}>
      <div className={styles.jobRequirementMain}>
        <span className={styles.jobRequirementBullet}>
          <DotIcon />
        </span>
        <p className={styles.jobRequirementTitle}>{title}</p>
      </div>
      <button
        type="button"
        className={styles.jobRequirementDelete}
        aria-label={`Xoa yeu cau ${title}`}
        onClick={onDelete}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

function parseSalaryRange(value) {
  const normalized = repairText(value || '');
  const cleaned = normalized.replace(/\s*\/\s*thang$/i, '').trim();
  const parts = cleaned.split('-').map((item) => item.trim());

  if (parts.length >= 2) {
    return {
      minSalary: parts[0].replace(/\s*VND.*$/i, '').trim(),
      maxSalary: parts[1].replace(/\s*VND.*$/i, '').trim(),
    };
  }

  return {
    minSalary: cleaned.replace(/\s*VND.*$/i, '').trim(),
    maxSalary: '',
  };
}

function getScheduleValue(schedule, label, fallback = '') {
  return repairText(schedule?.find((item) => item.label === label)?.value || fallback);
}

export default function AdminJobEditPage() {
  const router = useRouter();
  const params = useParams();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [newRequirement, setNewRequirement] = useState('');
  const [form, setForm] = useState({
    title: '',
    company: '',
    location: '',
    address: '',
    status: STATUS_OPTIONS[0],
    minSalary: '',
    maxSalary: '',
    quantity: '',
    experience: EXPERIENCE_OPTIONS[0],
    description: '',
    requirements: [],
    scheduleType: SCHEDULE_OPTIONS[0],
    workHours: '',
    dayOff: '',
    workMode: WORK_MODE_OPTIONS[0],
  });

  useEffect(() => {
    const session = getSession();

    if (session?.user?.role !== 'ADMIN') {
      router.replace('/login');
      return;
    }

    setIsAuthorized(true);

    async function loadJob() {
      try {
        const response = await fetch(`/api/jobs/${params.jobId}`, { cache: 'no-store' });
        const payload = await response.json();

        if (!response.ok || !payload.job) {
          setErrorMessage(payload.message || 'Khong tim thay cong viec.');
          setIsLoading(false);
          return;
        }

        const job = payload.job;
        const salaryRange = parseSalaryRange(job.salary);
        setForm({
          title: repairText(job.title),
          company: repairText(job.company || 'Smart Guard'),
          location: repairText(job.location),
          address: repairText(job.address || job.location || ''),
          status: repairText(job.status || STATUS_OPTIONS[0]),
          minSalary: salaryRange.minSalary,
          maxSalary: salaryRange.maxSalary,
          quantity: repairText(job.quantity || ''),
          experience: repairText(job.experience || EXPERIENCE_OPTIONS[0]),
          description: repairText(job.description || ''),
          requirements: Array.isArray(job.requirements)
            ? job.requirements.map((item) => repairText(String(item).replace(/\.$/, '').trim())).filter(Boolean)
            : [],
          scheduleType: getScheduleValue(job.schedule, JOB_SCHEDULE_LABELS.rotation, SCHEDULE_OPTIONS[0]),
          workHours: getScheduleValue(job.schedule, JOB_SCHEDULE_LABELS.time, ''),
          dayOff: getScheduleValue(job.schedule, JOB_SCHEDULE_LABELS.dayOff, ''),
          workMode: getScheduleValue(job.schedule, JOB_SCHEDULE_LABELS.mode, WORK_MODE_OPTIONS[0]),
        });
      } catch (error) {
        setErrorMessage(`Khong the tai cong viec. ${String(error)}`);
      } finally {
        setIsLoading(false);
      }
    }

    if (params?.jobId) {
      loadJob();
    }
  }, [params, router]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleRequirementDelete(indexToDelete) {
    setForm((current) => ({
      ...current,
      requirements: current.requirements.filter((_, index) => index !== indexToDelete),
    }));
  }

  function handleAddRequirement() {
    const nextRequirement = newRequirement.trim();
    if (!nextRequirement) {
      return;
    }

    setForm((current) => ({
      ...current,
      requirements: [...current.requirements, nextRequirement],
    }));
    setNewRequirement('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErrorMessage('');
    setIsSaving(true);

    try {
      const response = await fetch(`/api/jobs/${params.jobId}`, {
        method: 'PATCH',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.message || 'Khong the luu thay doi.');
        return;
      }

      router.push(ADMIN_ROUTES.jobs);
    } catch (error) {
      setErrorMessage(`Khong the luu thay doi. ${String(error)}`);
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAuthorized || isLoading) {
    return <div className={styles.loadingState}>Dang tai bieu mau chinh sua...</div>;
  }

  return (
    <div className={styles.screen}>
      <AdminHeader />

      <main className={styles.jobFormPage}>
        <form onSubmit={handleSubmit}>
          <div className={styles.jobFormTop}>
            <nav className={styles.jobFormBreadcrumb}>
              <Link href={ADMIN_ROUTES.jobs} className={styles.jobFormBreadcrumbLink}>
                Cong viec
              </Link>
              <span className={styles.jobFormBreadcrumbDivider}>{'>'}</span>
              <span className={styles.jobFormBreadcrumbCurrent}>Chinh sua</span>
            </nav>

            <div className={styles.jobFormActions}>
              <Link href={ADMIN_ROUTES.jobs} className={styles.jobFormBackButton}>
                <span className={styles.jobFormBackIcon}>
                  <BackIcon />
                </span>
                <span>Quay lai danh sach</span>
              </Link>
              <button type="submit" className={styles.jobFormPublishButton} disabled={isSaving}>
                {isSaving ? 'Dang luu...' : 'Luu thay doi'}
              </button>
            </div>
          </div>

          <h1 className={styles.jobFormTitle}>Chinh sua cong viec</h1>
          {errorMessage ? <p className={styles.jobFormError}>{errorMessage}</p> : null}

          <section className={styles.jobFormSection}>
            <h2 className={styles.jobFormSectionTitle}>Thong tin co ban</h2>
            <div className={styles.jobFormGrid}>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Ten cong viec <strong>*</strong></span>
                <input className={styles.jobFieldInput} value={form.title} onChange={(event) => updateField('title', event.target.value)} />
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Ten cong ty <strong>*</strong></span>
                <input className={styles.jobFieldInput} value={form.company} onChange={(event) => updateField('company', event.target.value)} />
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Dia diem lam viec <strong>*</strong></span>
                <input className={styles.jobFieldInput} value={form.location} onChange={(event) => updateField('location', event.target.value)} />
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Dia chi chi tiet <strong>*</strong></span>
                <input className={styles.jobFieldInput} value={form.address} onChange={(event) => updateField('address', event.target.value)} />
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Trang thai</span>
                <select className={styles.jobFieldInput} value={form.status} onChange={(event) => updateField('status', event.target.value)}>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className={styles.jobFormSection}>
            <h2 className={styles.jobFormSectionTitle}>Thong tin chinh</h2>
            <div className={styles.jobFormGrid}>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Muc luong toi thieu <strong>*</strong></span>
                <div className={styles.jobFieldInputWrap}>
                  <input className={styles.jobFieldInput} value={form.minSalary} onChange={(event) => updateField('minSalary', event.target.value)} />
                  <span className={styles.jobFieldSuffix}>VND</span>
                </div>
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Muc luong toi da <strong>*</strong></span>
                <div className={styles.jobFieldInputWrap}>
                  <input className={styles.jobFieldInput} value={form.maxSalary} onChange={(event) => updateField('maxSalary', event.target.value)} />
                  <span className={styles.jobFieldSuffix}>VND</span>
                </div>
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>So luong tuyen</span>
                <input className={styles.jobFieldInput} value={form.quantity} onChange={(event) => updateField('quantity', event.target.value)} />
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Kinh nghiem <strong>*</strong></span>
                <select className={styles.jobFieldInput} value={form.experience} onChange={(event) => updateField('experience', event.target.value)}>
                  {EXPERIENCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className={styles.jobFormSection}>
            <h2 className={styles.jobFormSectionTitle}>Mo ta cong viec <strong>*</strong></h2>
            <div className={styles.jobEditor}>
              <EditorToolbar />
              <textarea className={styles.jobEditorTextarea} value={form.description} onChange={(event) => updateField('description', event.target.value)} />
            </div>
          </section>

          <section className={styles.jobFormSection}>
            <div className={styles.jobRequirementsHeader}>
              <h2 className={styles.jobFormSectionTitle}>Yeu cau cong viec <strong>*</strong></h2>
              <button type="button" className={styles.jobRequirementAddButton} onClick={handleAddRequirement}>
                Them yeu cau
              </button>
            </div>
            <div className={styles.jobRequirementInputRow}>
              <input
                className={styles.jobFieldInput}
                value={newRequirement}
                onChange={(event) => setNewRequirement(event.target.value)}
                placeholder="Nhap yeu cau moi"
              />
            </div>
            <div className={styles.jobRequirementsGrid}>
              {form.requirements.map((item, index) => (
                <RequirementItem key={`${item}-${index}`} title={item} onDelete={() => handleRequirementDelete(index)} />
              ))}
            </div>
          </section>

          <section className={styles.jobFormSection}>
            <h2 className={styles.jobFormSectionTitle}>Thong tin cong viec / Lich lam</h2>
            <div className={styles.jobFormGrid}>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Loai lich</span>
                <select className={styles.jobFieldInput} value={form.scheduleType} onChange={(event) => updateField('scheduleType', event.target.value)}>
                  {SCHEDULE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>So gio lam / ngay <strong>*</strong></span>
                <input className={styles.jobFieldInput} value={form.workHours} onChange={(event) => updateField('workHours', event.target.value)} />
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Ngay nghi</span>
                <input className={styles.jobFieldInput} value={form.dayOff} onChange={(event) => updateField('dayOff', event.target.value)} />
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Hinh thuc lam viec <strong>*</strong></span>
                <select className={styles.jobFieldInput} value={form.workMode} onChange={(event) => updateField('workMode', event.target.value)}>
                  {WORK_MODE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}

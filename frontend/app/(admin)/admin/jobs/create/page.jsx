'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminHeader from '@/shared/components/admin/AdminHeader';
import styles from '@/shared/components/admin/AdminDashboard.module.css';
import {
  EXPERIENCE_OPTIONS,
  SCHEDULE_OPTIONS,
  STATUS_OPTIONS,
  WORK_MODE_OPTIONS,
} from '@/lib/constants/jobFormOptions';
import { ADMIN_ROUTES } from '@/lib/constants/routes';
import { getSession } from '@/features/auth/api/authApi.jsx';

const DEFAULT_FORM = {
  title: 'Nhan vien bao ve ca dem',
  company: 'Smart Guard',
  location: 'Quan 1, TP HCM',
  address: 'Toa nha van phong, Quan 1, TP HCM',
  status: STATUS_OPTIONS[0],
  minSalary: '8000000',
  maxSalary: '12000000',
  quantity: '10',
  experience: EXPERIENCE_OPTIONS[0],
  description: `Tuan tra, canh gac tai muc tieu.
Dam bao an ninh trat tu va an toan tai san.
Kiem soat nguoi va phuong tien ra vao.
Xu ly tinh huong khan cap va bao cao ca truc.`,
  requirements: [
    'Hoc van THPT tro len',
    'Suc khoe tot',
    'Ly lich ro rang',
    'Ky nang giao tiep tot',
  ],
  scheduleType: SCHEDULE_OPTIONS[0],
  workHours: '12 tieng',
  dayOff: '4 ngay/thang',
  workMode: WORK_MODE_OPTIONS[0],
};

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

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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

export default function AdminJobCreatePage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [newRequirement, setNewRequirement] = useState('');
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    const session = getSession();

    if (session?.user?.role !== 'ADMIN') {
      router.replace('/login');
      return;
    }

    setIsAuthorized(true);
    setIsLoading(false);
  }, [router]);

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
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload.message || 'Khong the dang tuyen cong viec.');
        return;
      }

      router.push(ADMIN_ROUTES.jobs);
    } catch (error) {
      setErrorMessage(`Khong the dang tuyen cong viec. ${String(error)}`);
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAuthorized || isLoading) {
    return <div className={styles.loadingState}>Dang tai bieu mau cong viec...</div>;
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
              <span className={styles.jobFormBreadcrumbCurrent}>Them cong viec</span>
            </nav>

            <div className={styles.jobFormActions}>
              <Link href={ADMIN_ROUTES.jobs} className={styles.jobFormCancelButton}>
                Huy
              </Link>
              <button type="submit" className={styles.jobFormPublishButton} disabled={isSaving}>
                <span className={styles.jobFormPublishIcon}>
                  <PlusIcon />
                </span>
                <span>{isSaving ? 'Dang dang...' : 'Dang tuyen'}</span>
              </button>
            </div>
          </div>

          <h1 className={styles.jobFormTitle}>Them cong viec</h1>
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
                <span className={styles.jobRequirementAddIcon}>
                  <PlusIcon />
                </span>
                <span>Them yeu cau</span>
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

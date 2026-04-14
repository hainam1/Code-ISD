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
  title: 'Nhân viên bảo vệ ca đêm',
  company: 'Smart Guard',
  location: 'Quận 1, TP HCM',
  address: 'Tòa nhà văn phòng, Quận 1, TP HCM',
  status: STATUS_OPTIONS[0],
  minSalary: '8000000',
  maxSalary: '12000000',
  quantity: '10',
  experience: EXPERIENCE_OPTIONS[0],
  description: `Tuần tra, canh gác tại mục tiêu.
Đảm bảo an ninh trật tự và an toàn tài sản.
Kiểm soát người và phương tiện ra vào.
Xử lý tình huống khẩn cấp và báo cáo ca trực.`,
  requirements: [
    'Học vấn THPT trở lên',
    'Sức khỏe tốt',
    'Lý lịch rõ ràng',
    'Kỹ năng giao tiếp tốt',
  ],
  scheduleType: SCHEDULE_OPTIONS[0],
  workHours: '12 tiếng',
  dayOff: '4 ngày/tháng',
  workMode: WORK_MODE_OPTIONS[0],
};

const SALARY_MIN_LIMIT = 5000000;
const SALARY_MAX_LIMIT = 20000000;
const SALARY_STEP = 100000;

function parseSalaryValue(value, fallback) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) {
    return fallback;
  }

  const parsed = Number(digits);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.min(SALARY_MAX_LIMIT, Math.max(SALARY_MIN_LIMIT, parsed));
}

function formatSalaryLabel(value) {
  return Number(value || 0).toLocaleString('vi-VN');
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
        title="Delete requirement"
        aria-label={`Xóa yêu cầu ${title}`}
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

  function handleMinSalaryChange(value) {
    const nextMinSalary = parseSalaryValue(value, SALARY_MIN_LIMIT);

    setForm((current) => {
      const currentMaxSalary = parseSalaryValue(current.maxSalary, SALARY_MAX_LIMIT);
      return {
        ...current,
        minSalary: String(Math.min(nextMinSalary, currentMaxSalary)),
      };
    });
  }

  function handleMaxSalaryChange(value) {
    const nextMaxSalary = parseSalaryValue(value, SALARY_MAX_LIMIT);

    setForm((current) => {
      const currentMinSalary = parseSalaryValue(current.minSalary, SALARY_MIN_LIMIT);
      return {
        ...current,
        maxSalary: String(Math.max(nextMaxSalary, currentMinSalary)),
      };
    });
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
        setErrorMessage(payload.message || 'Không thể đăng tuyển công việc.');
        return;
      }

      router.push(ADMIN_ROUTES.jobs);
    } catch (error) {
      setErrorMessage(`Không thể đăng tuyển công việc. ${String(error)}`);
    } finally {
      setIsSaving(false);
    }
  }

  if (!isAuthorized || isLoading) {
    return <div className={styles.loadingState}>Đang tải biểu mẫu công việc...</div>;
  }

  return (
    <div className={styles.screen}>
      <AdminHeader />

      <main className={styles.jobFormPage}>
        <form onSubmit={handleSubmit}>
          <div className={styles.jobFormTop}>
            <nav className={styles.jobFormBreadcrumb}>
              <Link href={ADMIN_ROUTES.jobs} className={styles.jobFormBreadcrumbLink}>
                Công việc
              </Link>
              <span className={styles.jobFormBreadcrumbDivider}>{'>'}</span>
              <span className={styles.jobFormBreadcrumbCurrent}>Thêm công việc</span>
            </nav>

            <div className={styles.jobFormActions}>
              <Link href={ADMIN_ROUTES.jobs} className={styles.jobFormCancelButton}>
                Hủy
              </Link>
              <button type="submit" className={styles.jobFormPublishButton} disabled={isSaving}>
                <span className={styles.jobFormPublishIcon}>
                  <PlusIcon />
                </span>
                <span>{isSaving ? 'Đang đăng...' : 'Đăng tuyển'}</span>
              </button>
            </div>
          </div>

          <h1 className={styles.jobFormTitle}>Thêm công việc</h1>
          {errorMessage ? <p className={styles.jobFormError}>{errorMessage}</p> : null}

          <section className={styles.jobFormSection}>
            <h2 className={styles.jobFormSectionTitle}>Thông tin cơ bản</h2>
            <div className={styles.jobFormGrid}>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Tên công việc <strong>*</strong></span>
                <input className={styles.jobFieldInput} value={form.title} onChange={(event) => updateField('title', event.target.value)} />
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Tên công ty <strong>*</strong></span>
                <input className={styles.jobFieldInput} value={form.company} onChange={(event) => updateField('company', event.target.value)} />
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Địa điểm làm việc <strong>*</strong></span>
                <input className={styles.jobFieldInput} value={form.location} onChange={(event) => updateField('location', event.target.value)} />
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Địa chỉ chi tiết <strong>*</strong></span>
                <input className={styles.jobFieldInput} value={form.address} onChange={(event) => updateField('address', event.target.value)} />
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Trạng thái</span>
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
            <h2 className={styles.jobFormSectionTitle}>Thông tin chính</h2>
            <div className={styles.jobFormGrid}>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Mức lương tối thiểu <strong>*</strong></span>
                <div className={styles.salarySliderCard}>
                  <div className={styles.salarySliderValue}>{formatSalaryLabel(form.minSalary)} VND</div>
                  <input
                    type="range"
                    min={SALARY_MIN_LIMIT}
                    max={SALARY_MAX_LIMIT}
                    step={SALARY_STEP}
                    className={styles.salarySlider}
                    value={parseSalaryValue(form.minSalary, SALARY_MIN_LIMIT)}
                    onChange={(event) => handleMinSalaryChange(event.target.value)}
                  />
                  <div className={styles.salarySliderScale}>
                    <span>{formatSalaryLabel(SALARY_MIN_LIMIT)}</span>
                    <span>{formatSalaryLabel(SALARY_MAX_LIMIT)}</span>
                  </div>
                </div>
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Mức lương tối đa <strong>*</strong></span>
                <div className={styles.salarySliderCard}>
                  <div className={styles.salarySliderValue}>{formatSalaryLabel(form.maxSalary)} VND</div>
                  <input
                    type="range"
                    min={SALARY_MIN_LIMIT}
                    max={SALARY_MAX_LIMIT}
                    step={SALARY_STEP}
                    className={styles.salarySlider}
                    value={parseSalaryValue(form.maxSalary, SALARY_MAX_LIMIT)}
                    onChange={(event) => handleMaxSalaryChange(event.target.value)}
                  />
                  <div className={styles.salarySliderScale}>
                    <span>{formatSalaryLabel(SALARY_MIN_LIMIT)}</span>
                    <span>{formatSalaryLabel(SALARY_MAX_LIMIT)}</span>
                  </div>
                </div>
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Số lượng tuyển</span>
                <input className={styles.jobFieldInput} value={form.quantity} onChange={(event) => updateField('quantity', event.target.value)} />
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Kinh nghiệm <strong>*</strong></span>
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
            <h2 className={styles.jobFormSectionTitle}>Mô tả công việc <strong>*</strong></h2>
            <div className={styles.jobEditor}>
              <EditorToolbar />
              <textarea className={styles.jobEditorTextarea} value={form.description} onChange={(event) => updateField('description', event.target.value)} />
            </div>
          </section>

          <section className={styles.jobFormSection}>
            <div className={styles.jobRequirementsHeader}>
              <h2 className={styles.jobFormSectionTitle}>Yêu cầu công việc <strong>*</strong></h2>
              <button type="button" className={styles.jobRequirementAddButton} onClick={handleAddRequirement}>
                <span className={styles.jobRequirementAddIcon}>
                  <PlusIcon />
                </span>
                <span>Thêm yêu cầu</span>
              </button>
            </div>
            <div className={styles.jobRequirementInputRow}>
              <input
                className={styles.jobFieldInput}
                value={newRequirement}
                onChange={(event) => setNewRequirement(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddRequirement();
                  }
                }}
                placeholder="Nhập yêu cầu mới"
              />
            </div>
            <div className={styles.jobRequirementsGrid}>
              {form.requirements.map((item, index) => (
                <RequirementItem key={`${item}-${index}`} title={item} onDelete={() => handleRequirementDelete(index)} />
              ))}
            </div>
          </section>

          <section className={styles.jobFormSection}>
            <h2 className={styles.jobFormSectionTitle}>Thông tin công việc / Lịch làm</h2>
            <div className={styles.jobFormGrid}>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Loại lịch</span>
                <select className={styles.jobFieldInput} value={form.scheduleType} onChange={(event) => updateField('scheduleType', event.target.value)}>
                  {SCHEDULE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Số giờ làm / ngày <strong>*</strong></span>
                <input className={styles.jobFieldInput} value={form.workHours} onChange={(event) => updateField('workHours', event.target.value)} />
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Ngày nghỉ</span>
                <input className={styles.jobFieldInput} value={form.dayOff} onChange={(event) => updateField('dayOff', event.target.value)} />
              </label>
              <label className={styles.jobField}>
                <span className={styles.jobFieldLabel}>Hình thức làm việc <strong>*</strong></span>
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

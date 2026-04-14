import { randomUUID } from 'node:crypto';
import { getSupabase } from '../config/supabase.js';

function normalizeJobStatus(status) {
  const rawStatus = String(status || '').trim().toUpperCase();

  if (rawStatus.includes('CLOSED') || rawStatus.includes('ĐÃ ĐÓNG') || rawStatus.includes('DA DONG')) {
    return 'CLOSED';
  }

  if (rawStatus.includes('DRAFT') || rawStatus.includes('NHÁP') || rawStatus.includes('NHAP')) {
    return 'DRAFT';
  }

  return 'OPEN';
}

function normalizeRequirements(requirements) {
  if (!Array.isArray(requirements)) {
    return [];
  }

  return requirements
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function toNumberOrNull(value) {
  const normalized = String(value ?? '').replace(/[^\d.-]/g, '');
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildJobPayload(input) {
  return {
    title: String(input.title || '').trim(),
    company_name: String(input.company || '').trim() || 'Smart Guard',
    location: String(input.location || '').trim(),
    address: String(input.address || '').trim() || String(input.location || '').trim(),
    description: String(input.description || '').trim(),
    requirements: normalizeRequirements(input.requirements),
    experience: String(input.experience || '').trim() || null,
    schedule_type: String(input.scheduleType || '').trim() || null,
    work_hours: String(input.workHours || '').trim() || null,
    day_off: String(input.dayOff || '').trim() || null,
    employment_type: String(input.workMode || '').trim() || 'Full-time',
    status: normalizeJobStatus(input.status),
    salary_min: toNumberOrNull(input.minSalary),
    salary_max: toNumberOrNull(input.maxSalary),
    salary_currency: 'VND',
    slots_total: Number(String(input.quantity || '').replace(/[^\d]/g, '')) || 0,
  };
}

export async function listJobs() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data || [];
}

export async function getJobById(jobId) {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('jobs').select('*').eq('id', jobId).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data || null;
}

function formatCurrencyValue(value) {
  if (value == null || !Number.isFinite(Number(value))) {
    return '';
  }

  return new Intl.NumberFormat('vi-VN').format(Number(value));
}

function formatSalaryRange(min, max, currency = 'VND') {
  if (min == null && max == null) {
    return '';
  }

  const resolvedMin = min == null ? max : min;
  const resolvedMax = max == null ? min : max;
  const suffix = currency || 'VND';

  if (resolvedMin === resolvedMax) {
    return `${formatCurrencyValue(resolvedMin)} ${suffix} / tháng`;
  }

  return `${formatCurrencyValue(resolvedMin)} - ${formatCurrencyValue(resolvedMax)} ${suffix} / tháng`;
}

function mapStatusToLegacy(status) {
  switch (String(status || '').toUpperCase()) {
    case 'CLOSED':
      return 'Đã đóng';
    case 'DRAFT':
      return 'Nháp';
    default:
      return 'Đang tuyển dụng';
  }
}

function toJobViewModel(jobRow, applicationCount = 0) {
  const requirements = Array.isArray(jobRow.requirements)
    ? jobRow.requirements.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  return {
    id: jobRow.id,
    title: jobRow.title,
    badge: String(jobRow.status || '').toUpperCase() === 'OPEN' ? 'NEW' : '',
    company: jobRow.company_name || 'Smart Guard',
    location: jobRow.location,
    address: jobRow.address || jobRow.location,
    salary: formatSalaryRange(jobRow.salary_min, jobRow.salary_max, jobRow.salary_currency),
    description: jobRow.description || '',
    requirements,
    experience: String(jobRow.experience || '').trim(),
    candidates: `${applicationCount} Ứng viên`,
    quantity: jobRow.slots_total ? String(jobRow.slots_total) : '',
    status: mapStatusToLegacy(jobRow.status),
    summary: {
      place: jobRow.location,
      mode: jobRow.employment_type || 'Toàn thời gian',
      postedAt: 'Vừa đăng',
    },
    schedule: [
      { label: 'LUÂN PHIÊN', value: String(jobRow.schedule_type || '').trim() || 'Làm theo ca' },
      { label: 'THỜI GIAN', value: String(jobRow.work_hours || '').trim() || '8h' },
      { label: 'NGÀY NGHỈ', value: String(jobRow.day_off || '').trim() || 'Theo quy định' },
      { label: 'HÌNH THỨC', value: String(jobRow.employment_type || '').trim() || 'Toàn thời gian' },
    ],
  };
}

export async function listJobsView() {
  const supabase = getSupabase();
  const [jobs, applications] = await Promise.all([
    listJobs(),
    supabase.from('applications').select('job_id'),
  ]);

  if (applications.error) {
    throw new Error(applications.error.message);
  }

  const applicationCountByJobId = new Map();
  for (const application of applications.data || []) {
    applicationCountByJobId.set(
      application.job_id,
      (applicationCountByJobId.get(application.job_id) || 0) + 1,
    );
  }

  return jobs.map((job) => toJobViewModel(job, applicationCountByJobId.get(job.id) || 0));
}

export async function getJobViewById(jobId) {
  const supabase = getSupabase();
  const [job, applicationCountResult] = await Promise.all([
    getJobById(jobId),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('job_id', jobId),
  ]);

  if (applicationCountResult.error) {
    throw new Error(applicationCountResult.error.message);
  }
  if (!job) {
    return null;
  }

  return toJobViewModel(job, applicationCountResult.count || 0);
}

export async function createJob(input) {
  const supabase = getSupabase();
  const payload = {
    id: randomUUID(),
    ...buildJobPayload(input),
  };

  const { data, error } = await supabase.from('jobs').insert([payload]).select().single();
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function updateJob(jobId, input) {
  const supabase = getSupabase();
  const payload = {
    ...buildJobPayload(input),
    updated_at: new Date().toISOString(),
  };

  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

  const { data, error } = await supabase
    .from('jobs')
    .update(payload)
    .eq('id', jobId)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  return data || null;
}

export async function deleteJob(jobId) {
  const supabase = getSupabase();
  const { error } = await supabase.from('jobs').delete().eq('id', jobId);
  if (error) {
    throw new Error(error.message);
  }
}

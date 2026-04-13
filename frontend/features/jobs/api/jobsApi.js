import 'server-only';
import { unstable_noStore as noStore } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { JOB_SCHEDULE_LABELS } from '@/lib/constants/jobFormOptions';

const NEW_JOB_WINDOW_DAYS = 7;

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

function buildPostedAtLabel(value) {
  if (!value) {
    return 'Vừa đăng';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Vừa đăng';
  }

  return new Intl.DateTimeFormat('vi-VN').format(date);
}

function isNewJob(createdAt) {
  if (!createdAt) {
    return false;
  }

  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) {
    return false;
  }

  const ageInMs = Date.now() - createdDate.getTime();
  return ageInMs >= 0 && ageInMs <= NEW_JOB_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

function resolveBadge(jobRow, applicationCount, hottestApplicationCount) {
  if (applicationCount > 0 && applicationCount === hottestApplicationCount) {
    return 'HOT';
  }

  if (isNewJob(jobRow.created_at)) {
    return 'NEW';
  }

  return '';
}

function buildJobViewModel(jobRow, applicationCount, hottestApplicationCount = 0) {
  const requirements = Array.isArray(jobRow.requirements)
    ? jobRow.requirements.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  const schedule = [
    { label: JOB_SCHEDULE_LABELS.rotation, value: String(jobRow.schedule_type || '').trim() || 'Làm theo ca' },
    { label: JOB_SCHEDULE_LABELS.time, value: String(jobRow.work_hours || '').trim() || '8h' },
    { label: JOB_SCHEDULE_LABELS.dayOff, value: String(jobRow.day_off || '').trim() || 'Theo quy định' },
    { label: JOB_SCHEDULE_LABELS.mode, value: String(jobRow.employment_type || '').trim() || 'Toàn thời gian' },
  ];
  const location = String(jobRow.location || '').trim();
  const address = String(jobRow.address || '').trim() || location;

  return {
    id: jobRow.id,
    title: String(jobRow.title || '').trim(),
    location,
    salary: formatSalaryRange(jobRow.salary_min, jobRow.salary_max, jobRow.salary_currency),
    badge: resolveBadge(jobRow, applicationCount, hottestApplicationCount),
    company: String(jobRow.company_name || '').trim() || 'Smart Guard',
    address,
    description: String(jobRow.description || '').trim(),
    requirements,
    experience: String(jobRow.experience || '').trim(),
    candidates: `${applicationCount} ứng viên`,
    quantity: jobRow.slots_total ? String(jobRow.slots_total) : '',
    status: mapStatusToLegacy(jobRow.status),
    summary: {
      place: address,
      mode: String(jobRow.employment_type || '').trim() || 'Toàn thời gian',
      postedAt: buildPostedAtLabel(jobRow.created_at),
    },
    schedule,
  };
}

export async function getJobs() {
  noStore();
  const supabase = createClient();
  const [{ data: jobs, error }, { data: applications, error: applicationsError }] = await Promise.all([
    supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('applications')
      .select('job_id'),
  ]);

  if (error || !jobs) return [];
  if (applicationsError) return [];

  const applicationCountByJobId = new Map();
  for (const application of applications || []) {
    applicationCountByJobId.set(
      application.job_id,
      (applicationCountByJobId.get(application.job_id) || 0) + 1,
    );
  }

  const hottestApplicationCount = Math.max(0, ...applicationCountByJobId.values());

  return jobs.map((job) => buildJobViewModel(job, applicationCountByJobId.get(job.id) || 0, hottestApplicationCount));
}

export async function getJobById(jobId) {
  noStore();
  const supabase = createClient();
  const [{ data: job, error }, { count, error: countError }, { data: allApplications, error: allApplicationsError }] = await Promise.all([
    supabase
      .from('jobs')
      .select('*')
      .eq('id', jobId)
      .single(),
    supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', jobId),
    supabase
      .from('applications')
      .select('job_id'),
  ]);

  if (error || !job) return null;
  if (countError || allApplicationsError) return buildJobViewModel(job, 0, 0);

  const applicationCountByJobId = new Map();
  for (const application of allApplications || []) {
    applicationCountByJobId.set(
      application.job_id,
      (applicationCountByJobId.get(application.job_id) || 0) + 1,
    );
  }

  const hottestApplicationCount = Math.max(0, ...applicationCountByJobId.values());

  return buildJobViewModel(job, count || 0, hottestApplicationCount);
}

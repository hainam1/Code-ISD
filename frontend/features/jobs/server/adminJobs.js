import { createClient } from '@/lib/supabase/server';

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

export async function getAdminJobById(jobId) {
  const supabase = createClient();
  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .single();
    
  if (error || !job) return null;
  return job;
}

export async function createAdminJob(input) {
  const supabase = createClient();
  const payload = buildJobPayload(input);

  const { data: job, error } = await supabase
    .from('jobs')
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(error.message);
  
  return job;
}

export async function updateAdminJobById(jobId, updates) {
  const supabase = createClient();
  const payload = {
    ...buildJobPayload(updates),
    updated_at: new Date().toISOString(),
  };

  // Remove undefined fields
  Object.keys(payload).forEach((key) => payload[key] === undefined && delete payload[key]);

  const { data: nextJob, error } = await supabase
    .from('jobs')
    .update(payload)
    .eq('id', jobId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return nextJob;
}

export async function deleteAdminJobById(jobId) {
  const supabase = createClient();
  
  const { error } = await supabase
    .from('jobs')
    .delete()
    .eq('id', jobId);

  return !error;
}

import { JOB_STATUS } from '@/lib/constants/jobFormOptions';
import { getDb } from '@/lib/db/database';

export async function getAdminJobById(jobId) {
  const db = await getDb();
  return db.data.jobs.find((job) => job.id === jobId) || null;
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

export async function createAdminJob(input) {
  const db = await getDb();
  const baseId = slugify(input.title) || 'job-moi';
  let nextId = baseId;
  let counter = 1;

  while (db.data.jobs.some((job) => job.id === nextId)) {
    counter += 1;
    nextId = `${baseId}-${counter}`;
  }

  const job = {
    id: nextId,
    title: input.title,
    location: input.location,
    salary: input.salary,
    badge: input.badge || 'NEW',
    company: input.company,
    address: input.address || input.location,
    description: input.description,
    requirements: input.requirements,
    experience: input.experience,
    candidates: input.candidates || '0 ứng viên',
    quantity: input.quantity || '',
    status: input.status || JOB_STATUS.recruiting,
    summary: input.summary,
    schedule: input.schedule,
  };

  db.data.jobs.push(job);
  await db.write();
  return job;
}

export async function updateAdminJobById(jobId, updates) {
  const db = await getDb();
  const index = db.data.jobs.findIndex((job) => job.id === jobId);

  if (index === -1) {
    return null;
  }

  const currentJob = db.data.jobs[index];
  const nextJob = {
    ...currentJob,
    ...updates,
    summary: {
      ...(currentJob.summary || {}),
      ...(updates.summary || {}),
    },
    schedule: Array.isArray(updates.schedule) ? updates.schedule : currentJob.schedule,
    requirements: Array.isArray(updates.requirements) ? updates.requirements : currentJob.requirements,
  };

  db.data.jobs[index] = nextJob;
  await db.write();
  return nextJob;
}

export async function deleteAdminJobById(jobId) {
  const db = await getDb();
  const existingJob = db.data.jobs.find((job) => job.id === jobId);

  if (!existingJob) {
    return false;
  }

  db.data.jobs = db.data.jobs.filter((job) => job.id !== jobId);

  if (!db.data.deletedJobIds.includes(jobId)) {
    db.data.deletedJobIds.push(jobId);
  }

  await db.write();
  return true;
}

import 'server-only';
import { getDb } from '../../lib/db/database';

export async function getJobs() {
  const db = await getDb();
  return db.data.jobs;
}

export async function getJobById(jobId) {
  const db = await getDb();
  return db.data.jobs.find((job) => job.id === jobId) || null;
}

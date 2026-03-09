import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { jobsSeed } from '../constants/jobsSeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbFile = join(__dirname, '../../data/db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { users: [], jobs: [], applications: [] });

let initialized = false;

function mergeSeedJobs(currentJobs) {
  if (!Array.isArray(currentJobs) || currentJobs.length === 0) {
    return [...jobsSeed];
  }

  const existingJobIds = new Set(currentJobs.map((job) => job.id));
  for (const seedJob of jobsSeed) {
    if (!existingJobIds.has(seedJob.id)) {
      currentJobs.push(seedJob);
    }
  }
  return currentJobs;
}

export async function getDb() {
  if (!initialized) {
    await mkdir(dirname(dbFile), { recursive: true });
    initialized = true;
  }

  await db.read();

  if (!db.data) {
    db.data = { users: [], jobs: [], applications: [] };
  }

  if (!Array.isArray(db.data.users)) db.data.users = [];
  if (!Array.isArray(db.data.jobs)) db.data.jobs = [];
  if (!Array.isArray(db.data.applications)) db.data.applications = [];

  db.data.jobs = mergeSeedJobs(db.data.jobs);

  const adminExists = db.data.users.some((user) => user.email === 'admin@gmail.com');
  if (!adminExists) {
    db.data.users.push({
      id: randomUUID(),
      fullName: 'Admin',
      email: 'admin@gmail.com',
      phone: '0900000000',
      role: 'ADMIN',
      passwordHash: bcrypt.hashSync('admin', 10),
      createdAt: new Date().toISOString(),
    });
  }

  await db.write();
  return db;
}

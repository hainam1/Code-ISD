import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { jobsSeed } from '../constants/jobsSeed.js';

const dbFile = join(process.cwd(), 'data', 'db.json');
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { users: [], jobs: [], applications: [] });

let initialized = false;

export async function getDb() {
  if (!initialized) {
    await mkdir(dirname(dbFile), { recursive: true });
    await db.read();

    if (!db.data) {
      db.data = { users: [], jobs: [], applications: [] };
    }

    if (!Array.isArray(db.data.users)) db.data.users = [];
    if (!Array.isArray(db.data.jobs)) db.data.jobs = [];
    if (!Array.isArray(db.data.applications)) db.data.applications = [];

    if (db.data.jobs.length === 0) {
      db.data.jobs = jobsSeed;
    }

    const adminExists = db.data.users.some((user) => user.email === 'admin@longhai.com');
    if (!adminExists) {
      db.data.users.push({
        id: randomUUID(),
        fullName: 'Admin',
        email: 'admin@longhai.com',
        phone: '0900000000',
        passwordHash: bcrypt.hashSync('123456', 10),
        createdAt: new Date().toISOString(),
      });
    }

    await db.write();
    initialized = true;
  } else {
    await db.read();
  }

  return db;
}

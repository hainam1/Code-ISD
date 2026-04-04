import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { jobsSeed } from '@/features/jobs/data/jobsSeed.js';
import { repairDeep } from '@/shared/utils/text.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, '../../data');
const legacyDbFile = join(dataDir, 'db.json');
const usersFile = join(dataDir, 'users.json');
const jobsFile = join(dataDir, 'jobs.json');
const appDataFile = join(dataDir, 'app-data.json');

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin12345';

let initialized = false;
let currentDb = null;

function createUsersData() {
  return { users: [] };
}

function createJobsData() {
  return { jobs: [], deletedJobIds: [] };
}

function createAppData() {
  return { applications: [], notifications: [], chatThreads: [] };
}

function createCompositeData() {
  return {
    ...createUsersData(),
    ...createJobsData(),
    ...createAppData(),
  };
}

function mergeSeedJobs(currentJobs, deletedJobIds) {
  const safeCurrentJobs = Array.isArray(currentJobs) ? currentJobs : [];
  const removedIds = new Set(Array.isArray(deletedJobIds) ? deletedJobIds : []);
  const persistedJobsById = new Map(
    safeCurrentJobs.filter((job) => job?.id).map((job) => [job.id, job]),
  );

  const mergedSeedJobs = jobsSeed.filter((job) => !removedIds.has(job.id)).map((job) => {
    const persistedJob = persistedJobsById.get(job.id);
    return persistedJob ? { ...job, ...persistedJob } : job;
  });

  const seedIds = new Set(jobsSeed.map((job) => job.id));
  const customJobs = safeCurrentJobs.filter((job) => job?.id && !seedIds.has(job.id));

  return [...mergedSeedJobs, ...customJobs];
}

async function readJsonFile(filePath) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
}

async function writeJsonFile(filePath, data) {
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

async function ensureDataDirectory() {
  if (!initialized) {
    await mkdir(dataDir, { recursive: true });
    initialized = true;
  }
}

async function loadPersistedData() {
  await ensureDataDirectory();

  const [usersData, jobsData, appData, legacyData] = await Promise.all([
    readJsonFile(usersFile),
    readJsonFile(jobsFile),
    readJsonFile(appDataFile),
    readJsonFile(legacyDbFile),
  ]);

  const composite = createCompositeData();

  if (legacyData && typeof legacyData === 'object') {
    Object.assign(composite, repairDeep(legacyData));
  }
  if (usersData && typeof usersData === 'object') {
    composite.users = repairDeep(usersData.users);
  }
  if (jobsData && typeof jobsData === 'object') {
    composite.jobs = repairDeep(jobsData.jobs);
    composite.deletedJobIds = repairDeep(jobsData.deletedJobIds);
  }
  if (appData && typeof appData === 'object') {
    composite.applications = repairDeep(appData.applications);
    composite.notifications = repairDeep(appData.notifications);
    composite.chatThreads = repairDeep(appData.chatThreads);
  }

  return repairDeep(composite);
}

function normalizeData(data) {
  const nextData = repairDeep(data || createCompositeData());

  if (!Array.isArray(nextData.users)) {
    nextData.users = [];
  }
  if (!Array.isArray(nextData.jobs)) {
    nextData.jobs = [];
  }
  if (!Array.isArray(nextData.deletedJobIds)) {
    nextData.deletedJobIds = [];
  }
  if (!Array.isArray(nextData.applications)) {
    nextData.applications = [];
  }
  if (!Array.isArray(nextData.notifications)) {
    nextData.notifications = [];
  }
  if (!Array.isArray(nextData.chatThreads)) {
    nextData.chatThreads = [];
  }

  nextData.jobs = repairDeep(mergeSeedJobs(nextData.jobs, nextData.deletedJobIds));

  const adminUser = nextData.users.find((user) => user.email === ADMIN_EMAIL);
  if (!adminUser) {
    nextData.users.push({
      id: randomUUID(),
      fullName: 'Admin',
      email: ADMIN_EMAIL,
      phone: '0900000000',
      role: 'ADMIN',
      passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10),
      createdAt: new Date().toISOString(),
    });
  } else if (!bcrypt.compareSync(ADMIN_PASSWORD, adminUser.passwordHash)) {
    adminUser.passwordHash = bcrypt.hashSync(ADMIN_PASSWORD, 10);
    adminUser.role = 'ADMIN';
  }

  return nextData;
}

async function persistData(data) {
  const normalized = normalizeData(data);

  await Promise.all([
    writeJsonFile(usersFile, { users: normalized.users }),
    writeJsonFile(jobsFile, {
      jobs: normalized.jobs,
      deletedJobIds: normalized.deletedJobIds,
    }),
    writeJsonFile(appDataFile, {
      applications: normalized.applications,
      notifications: normalized.notifications,
      chatThreads: normalized.chatThreads,
    }),
  ]);
}

export async function getDb() {
  if (currentDb) {
    return currentDb;
  }

  const data = normalizeData(await loadPersistedData());

  currentDb = {
    data,
    async read() {
      this.data = normalizeData(await loadPersistedData());
      return this.data;
    },
    async write() {
      this.data = normalizeData(this.data);
      await persistData(this.data);
    },
  };

  await currentDb.write();
  return currentDb;
}

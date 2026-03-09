import bcrypt from 'bcryptjs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import { jobsSeed } from '../data/jobsSeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config();
const databaseDir = path.join(__dirname, '../../database');
const schemaFile = path.join(databaseDir, 'schema.sql');

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = Number(process.env.DB_PORT || 3306);
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'smart_guard';

const SEED_USERS = [
  {
    id: '0f6f26f7-d4f9-4f14-95b9-e6b4fa2cf201',
    fullName: 'HR Manager',
    email: 'hr@smartguard.com',
    phone: '0900000001',
    role: 'HR',
    password: '123456'
  },
  {
    id: '6f145ff5-41ec-4f8e-a2b6-cd427f5ec202',
    fullName: 'Management User',
    email: 'management@smartguard.com',
    phone: '0900000002',
    role: 'MANAGEMENT',
    password: '123456'
  }
];

let pool;
let initPromise;

function assertDatabaseName(dbName) {
  if (!/^[a-zA-Z0-9_]+$/.test(dbName)) {
    throw new Error('DB_NAME can only contain letters, numbers, and underscores.');
  }
}

async function ensureDatabaseExists() {
  assertDatabaseName(DB_NAME);
  const connection = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await connection.end();
}

async function runSchema() {
  const schemaSql = await readFile(schemaFile, 'utf8');
  await pool.query(schemaSql);
}

async function seedData() {
  for (const job of jobsSeed) {
    await pool.query(
      `INSERT INTO jobs (id, title, description, location, slots_filled, slots_total)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         description = VALUES(description),
         location = VALUES(location),
         slots_filled = VALUES(slots_filled),
         slots_total = VALUES(slots_total)`,
      [job.id, job.title, job.description, job.location, job.availableSlots.filled, job.availableSlots.total]
    );
  }

  for (const seedUser of SEED_USERS) {
    const passwordHash = await bcrypt.hash(seedUser.password, 10);
    await pool.query(
      `INSERT INTO users (id, full_name, email, phone, role, password_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [
        seedUser.id,
        seedUser.fullName,
        seedUser.email,
        seedUser.phone,
        seedUser.role,
        passwordHash,
        new Date().toISOString()
      ]
    );
  }
}

async function initialize() {
  await ensureDatabaseExists();
  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
  });

  await runSchema();
  await seedData();
}

export async function getDb() {
  if (!initPromise) {
    initPromise = initialize();
  }
  try {
    await initPromise;
  } catch (error) {
    initPromise = null;
    throw error;
  }
  return pool;
}

export async function query(sql, params = []) {
  const db = await getDb();
  return db.query(sql, params);
}

export async function withTransaction(handler) {
  const db = await getDb();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

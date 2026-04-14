import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRootDir = path.join(__dirname, '..');
const frontendRootDir = path.join(backendRootDir, '../frontend');

function loadEnvFile(filePath) {
  try {
    process.loadEnvFile(filePath);
  } catch {
    // Missing env files are allowed.
  }
}

loadEnvFile(path.join(frontendRootDir, '.env.local'));
loadEnvFile(path.join(frontendRootDir, '.env'));
loadEnvFile(path.join(backendRootDir, '.env.local'));
loadEnvFile(path.join(backendRootDir, '.env'));

function readEnv(name) {
  const value = process.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

function getProjectRef(supabaseUrl) {
  try {
    const hostname = new URL(supabaseUrl).hostname;
    return hostname.split('.')[0] || '';
  } catch {
    return '';
  }
}

async function verifyInterviewHistoryTable({ supabaseUrl, serviceRoleKey }) {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await supabase
    .from('interview_history')
    .select('id')
    .limit(1);

  return {
    ok: !error,
    error,
  };
}

async function runMigrationViaManagementApi({ accessToken, projectRef, sql }) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: sql,
    }),
  });

  const responseText = await response.text();
  let payload = null;

  try {
    payload = responseText ? JSON.parse(responseText) : null;
  } catch {
    payload = responseText;
  }

  if (!response.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload?.message || payload?.error || `Management API returned ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

async function main() {
  const inputPath = process.argv[2] || 'database/migrations/2026-04-14-create-interview-history.sql';
  const absoluteMigrationPath = path.resolve(backendRootDir, inputPath);
  const sql = await fs.readFile(absoluteMigrationPath, 'utf8');

  const supabaseUrl = readEnv('SUPABASE_URL') || readEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');
  const accessToken = readEnv('SUPABASE_ACCESS_TOKEN');
  const projectRef = readEnv('SUPABASE_PROJECT_REF') || getProjectRef(supabaseUrl);

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL.');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.');
  }

  console.log(`Migration file: ${absoluteMigrationPath}`);
  console.log(`Supabase project: ${projectRef || '(unknown)'}`);

  const before = await verifyInterviewHistoryTable({ supabaseUrl, serviceRoleKey });

  if (before.ok) {
    console.log('`interview_history` already exists and is reachable via PostgREST.');
  } else {
    console.log(`Pre-check: ${before.error?.message || 'table not reachable yet'}`);
  }

  if (!accessToken) {
    throw new Error(
      'Cannot apply SQL with SUPABASE_SERVICE_ROLE_KEY alone. Set SUPABASE_ACCESS_TOKEN to run this migration through the Supabase Management API.'
    );
  }

  if (!projectRef) {
    throw new Error('Missing SUPABASE_PROJECT_REF and could not infer project ref from SUPABASE_URL.');
  }

  await runMigrationViaManagementApi({ accessToken, projectRef, sql });
  console.log('Management API accepted the migration query.');

  const after = await verifyInterviewHistoryTable({ supabaseUrl, serviceRoleKey });

  if (!after.ok) {
    throw new Error(
      `Migration request was sent, but table verification still failed: ${after.error?.message || 'unknown error'}`
    );
  }

  console.log('Verified: `interview_history` is now reachable.');
}

main().catch((error) => {
  console.error(`Migration failed: ${error.message}`);
  process.exitCode = 1;
});

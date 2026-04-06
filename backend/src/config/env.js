import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRootDir = path.join(__dirname, '../..');
const frontendRootDir = path.join(__dirname, '../../../frontend');

function loadEnvFile(filePath) {
  try {
    process.loadEnvFile(filePath);
  } catch {
    // Missing env files are allowed in local development.
  }
}

loadEnvFile(path.join(frontendRootDir, '.env.local'));
loadEnvFile(path.join(frontendRootDir, '.env'));
loadEnvFile(path.join(backendRootDir, '.env.local'));
loadEnvFile(path.join(backendRootDir, '.env'));

function readEnv(name, fallback = '') {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function getEnv() {
  return {
    port: Number(readEnv('PORT', '5000')),
    frontendOrigin: readEnv('FRONTEND_ORIGIN', 'http://localhost:3000'),
    supabaseUrl: readEnv('NEXT_PUBLIC_SUPABASE_URL') || readEnv('SUPABASE_URL'),
    supabaseAnonKey:
      readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
      readEnv('SUPABASE_ANON_KEY') ||
      readEnv('SUPABASE_SERVICE_ROLE_KEY'),
    supabaseServiceRoleKey: readEnv('SUPABASE_SERVICE_ROLE_KEY'),
    adminEmail: readEnv('ADMIN_EMAIL', 'admin@gmail.com'),
    adminPassword: readEnv('ADMIN_PASSWORD', 'admin12345'),
  };
}

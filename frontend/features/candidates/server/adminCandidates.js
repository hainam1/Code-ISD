import { getDb } from '@/lib/db/database';

const candidateOverrides = new Map();

function getRole(user) {
  return (user?.role || 'USER').toUpperCase();
}

function getLatestApplication(applications, candidateId) {
  return applications
    .filter((application) => application.candidateId === candidateId)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] || null;
}

function mapUserToCandidate(user, application, job) {
  const overrides = candidateOverrides.get(user.id) || {};

  return {
    id: user.id,
    applicationId: application?.id || '',
    fullName: user.fullName || 'Ứng viên',
    email: user.email || application?.email || '',
    phone: user.phone || application?.phone || '',
    dob: user.dob || '',
    idCard: user.idCard || '',
    address: user.address || '',
    avatarUrl: user.avatarUrl || '',
    position: job?.title || 'Chưa ứng tuyển',
    appliedAt: application?.createdAt || user.createdAt,
    status: overrides.status || application?.status || 'Under Review',
    cvFileName: application?.cvFile?.fileName || '',
    healthCertificateFileName: overrides.healthCertificateFileName || application?.healthFile?.fileName || '',
    cvFile: application?.cvFile || null,
    healthFile: application?.healthFile || null,
  };
}

export async function listAdminCandidates() {
  const db = await getDb();
  const users = Array.isArray(db.data.users) ? db.data.users : [];
  const applications = Array.isArray(db.data.applications) ? db.data.applications : [];

  return users
    .filter((user) => getRole(user) !== 'ADMIN')
    .map((user) => {
      const latestApplication = getLatestApplication(applications, user.id);
      if (!latestApplication) {
        return null;
      }
      const job = db.data.jobs.find((item) => item.id === latestApplication.jobId) || null;
      return mapUserToCandidate(user, latestApplication, job);
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.appliedAt).getTime() - new Date(left.appliedAt).getTime());
}

export async function getAdminCandidateById(candidateId) {
  const candidates = await listAdminCandidates();
  return candidates.find((candidate) => candidate.id === candidateId) || null;
}

export async function updateAdminCandidateById(candidateId, updates) {
  const db = await getDb();
  const applications = Array.isArray(db.data.applications) ? db.data.applications : [];
  const latestApplication = getLatestApplication(applications, candidateId);

  if (latestApplication) {
    if (typeof updates.status === 'string' && updates.status) {
      latestApplication.status = updates.status;
    }
    if (typeof updates.healthCertificateFileName === 'string') {
      latestApplication.healthFile = {
        ...(latestApplication.healthFile || {}),
        fileName: updates.healthCertificateFileName,
      };
    }
    latestApplication.updatedAt = new Date().toISOString();
    await db.write();
    return getAdminCandidateById(candidateId);
  }

  const user = db.data.users.find((item) => item.id === candidateId && getRole(item) !== 'ADMIN');
  if (!user) {
    return null;
  }

  const nextOverride = {
    ...(candidateOverrides.get(candidateId) || {}),
  };

  if (typeof updates.status === 'string' && updates.status) {
    nextOverride.status = updates.status;
  }
  if (typeof updates.healthCertificateFileName === 'string') {
    nextOverride.healthCertificateFileName = updates.healthCertificateFileName;
  }

  candidateOverrides.set(candidateId, nextOverride);
  return getAdminCandidateById(candidateId);
}

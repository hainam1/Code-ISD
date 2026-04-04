import { randomUUID } from 'node:crypto';
import { APPLICATION_STATUSES } from '../../common/validators/index.js';
import {
  findApplicationByCandidateAndJob,
  findCandidateById,
  findJobById,
  getApplicationStatusById,
  insertApplication,
  listApplications,
  updateApplicationStatus,
} from './applications.repository.js';

function toIso(value) {
  return new Date(value).toISOString();
}

function parseStatusHistory(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function submitApplication({ actor, jobId, note = '', cvFile, healthFile = null }) {
  if (!jobId) {
    return { status: 400, body: { message: 'jobId is required.' } };
  }

  if (!cvFile) {
    return { status: 400, body: { message: 'CV file is required.' } };
  }

  if (!healthFile) {
    return { status: 400, body: { message: 'Health file is required.' } };
  }

  const [job, candidate, existingApplication] = await Promise.all([
    findJobById(jobId),
    findCandidateById(actor.id),
    findApplicationByCandidateAndJob(actor.id, jobId),
  ]);

  if (!job) {
    return { status: 404, body: { message: 'Job not found.' } };
  }

  if (!candidate || candidate.role !== 'CANDIDATE') {
    return { status: 401, body: { message: 'Candidate account not found.' } };
  }

  if (existingApplication) {
    return { status: 409, body: { message: 'You have already applied for this job.' } };
  }

  const now = new Date().toISOString();
  const application = {
    id: randomUUID(),
    candidateId: actor.id,
    jobId,
    candidateFullName: candidate.full_name || actor.fullName || '',
    candidateEmail: candidate.email || actor.email || '',
    candidatePhone: candidate.phone || '',
    note,
    cvFile,
    healthFile,
    status: APPLICATION_STATUSES.UNDER_REVIEW,
    statusHistory: [
      {
        status: APPLICATION_STATUSES.UNDER_REVIEW,
        updatedAt: now,
        updatedBy: actor.id,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  await insertApplication(application);

  return {
    status: 201,
    body: {
      message: 'Application submitted successfully.',
      application,
    },
  };
}

export async function getVisibleApplications(actor) {
  const rows = await listApplications({
    candidateId: actor.role === 'CANDIDATE' ? actor.id : null,
  });

  return rows.map((application) => ({
    id: application.id,
    status: application.status,
    createdAt: toIso(application.created_at),
    updatedAt: toIso(application.updated_at),
    candidate: {
      fullName: application.candidate_full_name || '',
      email: application.candidate_email || '',
      phone: application.candidate_phone || '',
    },
    appliedPosition: application.job_title || '',
    uploadedCv: application.cv_path || '',
    uploadedHealthFile: application.health_path || '',
    jobId: application.job_id,
    candidateId: application.candidate_id,
  }));
}

export async function changeApplicationStatus({ connection, actorId, applicationId, nextStatus }) {
  const applicationRow = await getApplicationStatusById(applicationId, connection);
  if (!applicationRow) {
    return { status: 404, body: { message: 'Application not found.' } };
  }

  if (
    applicationRow.status === APPLICATION_STATUSES.APPROVED ||
    applicationRow.status === APPLICATION_STATUSES.HIRED_REJECTED
  ) {
    return { status: 400, body: { message: 'Final hiring decision already completed.' } };
  }

  const updatedAt = new Date().toISOString();
  const statusHistory = parseStatusHistory(applicationRow.status_history);
  statusHistory.push({
    status: nextStatus,
    updatedAt,
    updatedBy: actorId,
  });

  await updateApplicationStatus(connection, applicationId, nextStatus, statusHistory, updatedAt);

  return {
    status: 200,
    body: {
      message: 'Application status updated.',
      application: {
        id: applicationRow.id,
        candidateId: applicationRow.candidate_id,
        jobId: applicationRow.job_id,
        status: nextStatus,
        statusHistory,
        createdAt: toIso(applicationRow.created_at),
        updatedAt,
      },
    },
  };
}

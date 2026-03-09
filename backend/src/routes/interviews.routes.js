import express from 'express';
import { randomUUID } from 'node:crypto';
import { query, withTransaction } from '../lib/db.js';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { APPLICATION_STATUSES } from '../lib/validators.js';

const router = express.Router();

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

router.get('/', authRequired, requireRoles('HR', 'MANAGEMENT'), async (_req, res) => {
  const [rows] = await query(
    `SELECT
      i.id,
      i.application_id,
      i.candidate_id,
      i.job_id,
      i.interview_date,
      i.interview_time,
      i.interview_location,
      i.result,
      i.comments,
      i.scheduled_by,
      i.evaluated_by,
      i.created_at,
      i.updated_at,
      a.status AS application_status,
      u.full_name AS candidate_full_name,
      u.email AS candidate_email,
      u.phone AS candidate_phone,
      j.title AS job_title
    FROM interviews i
    LEFT JOIN applications a ON a.id = i.application_id
    LEFT JOIN users u ON u.id = i.candidate_id
    LEFT JOIN jobs j ON j.id = i.job_id
    ORDER BY i.updated_at DESC`
  );

  const interviews = rows.map((interview) => ({
    id: interview.id,
    applicationId: interview.application_id,
    candidateId: interview.candidate_id,
    jobId: interview.job_id,
    interviewDate: interview.interview_date,
    interviewTime: interview.interview_time,
    interviewLocation: interview.interview_location,
    result: interview.result,
    comments: interview.comments,
    scheduledBy: interview.scheduled_by,
    evaluatedBy: interview.evaluated_by,
    createdAt: toIso(interview.created_at),
    updatedAt: toIso(interview.updated_at),
    applicationStatus: interview.application_status || null,
    candidate: interview.candidate_full_name
      ? {
          id: interview.candidate_id,
          fullName: interview.candidate_full_name,
          email: interview.candidate_email,
          phone: interview.candidate_phone
        }
      : null,
    job: interview.job_title
      ? {
          id: interview.job_id,
          title: interview.job_title
        }
      : null
  }));

  return res.json({ interviews });
});

router.post('/', authRequired, requireRoles('HR'), async (req, res) => {
  const applicationId = (req.body.applicationId || '').trim();
  const interviewDate = (req.body.interviewDate || '').trim();
  const interviewTime = (req.body.interviewTime || '').trim();
  const interviewLocation = (req.body.interviewLocation || '').trim();

  if (!applicationId || !interviewDate || !interviewTime || !interviewLocation) {
    return res.status(400).json({ message: 'applicationId, interviewDate, interviewTime, interviewLocation are required.' });
  }

  const result = await withTransaction(async (connection) => {
    const [applicationRows] = await connection.query(
      `SELECT id, candidate_id, job_id, status, status_history
       FROM applications
       WHERE id = ?
       LIMIT 1`,
      [applicationId]
    );
    const application = applicationRows[0];

    if (!application) {
      return { status: 404, body: { message: 'Application not found.' } };
    }

    if (application.status !== APPLICATION_STATUSES.SHORTLISTED) {
      return { status: 400, body: { message: 'Interview can only be scheduled for shortlisted applications.' } };
    }

    const [existingRows] = await connection.query(
      'SELECT id FROM interviews WHERE application_id = ? LIMIT 1',
      [applicationId]
    );
    if (existingRows.length > 0) {
      return { status: 409, body: { message: 'Interview already scheduled for this application.' } };
    }

    const now = new Date();
    const interview = {
      id: randomUUID(),
      applicationId,
      candidateId: application.candidate_id,
      jobId: application.job_id,
      interviewDate,
      interviewTime,
      interviewLocation,
      result: null,
      comments: null,
      scheduledBy: req.user.id,
      evaluatedBy: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    await connection.query(
      `INSERT INTO interviews
        (id, application_id, candidate_id, job_id, interview_date, interview_time, interview_location, result, comments, scheduled_by, evaluated_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        interview.id,
        interview.applicationId,
        interview.candidateId,
        interview.jobId,
        interview.interviewDate,
        interview.interviewTime,
        interview.interviewLocation,
        null,
        null,
        interview.scheduledBy,
        null,
        now,
        now
      ]
    );

    const statusHistory = parseStatusHistory(application.status_history);
    statusHistory.push({
      status: APPLICATION_STATUSES.INTERVIEW_SCHEDULED,
      updatedAt: now.toISOString(),
      updatedBy: req.user.id
    });

    await connection.query(
      `UPDATE applications
       SET status = ?, updated_at = ?, status_history = ?
       WHERE id = ?`,
      [APPLICATION_STATUSES.INTERVIEW_SCHEDULED, now, JSON.stringify(statusHistory), applicationId]
    );

    return {
      status: 201,
      body: {
        message: 'Interview scheduled successfully.',
        interview,
        applicationStatus: APPLICATION_STATUSES.INTERVIEW_SCHEDULED
      }
    };
  });

  return res.status(result.status).json(result.body);
});

router.put('/:applicationId/evaluation', authRequired, requireRoles('HR'), async (req, res) => {
  const resultValue = (req.body.result || '').trim();
  const comments = (req.body.comments || '').trim();
  const allowedResults = ['Pass', 'Fail', 'Pending'];

  if (!allowedResults.includes(resultValue)) {
    return res.status(400).json({ message: 'Invalid interview result. Use Pass, Fail, or Pending.' });
  }

  const result = await withTransaction(async (connection) => {
    const [interviewRows] = await connection.query(
      `SELECT id, application_id, candidate_id, job_id, interview_date, interview_time, interview_location, scheduled_by, created_at
       FROM interviews
       WHERE application_id = ?
       LIMIT 1`,
      [req.params.applicationId]
    );
    const interviewRow = interviewRows[0];
    if (!interviewRow) {
      return { status: 404, body: { message: 'Interview not found for this application.' } };
    }

    const [applicationRows] = await connection.query(
      'SELECT id, status_history, created_at FROM applications WHERE id = ? LIMIT 1',
      [req.params.applicationId]
    );
    const application = applicationRows[0];
    if (!application) {
      return { status: 404, body: { message: 'Application not found.' } };
    }

    const now = new Date();
    await connection.query(
      `UPDATE interviews
       SET result = ?, comments = ?, evaluated_by = ?, updated_at = ?
       WHERE application_id = ?`,
      [resultValue, comments, req.user.id, now, req.params.applicationId]
    );

    const statusHistory = parseStatusHistory(application.status_history);
    statusHistory.push({
      status: APPLICATION_STATUSES.INTERVIEWED,
      updatedAt: now.toISOString(),
      updatedBy: req.user.id
    });

    await connection.query(
      `UPDATE applications
       SET status = ?, updated_at = ?, status_history = ?
       WHERE id = ?`,
      [APPLICATION_STATUSES.INTERVIEWED, now, JSON.stringify(statusHistory), req.params.applicationId]
    );

    return {
      status: 200,
      body: {
        message: 'Interview evaluation saved.',
        interview: {
          id: interviewRow.id,
          applicationId: interviewRow.application_id,
          candidateId: interviewRow.candidate_id,
          jobId: interviewRow.job_id,
          interviewDate: interviewRow.interview_date,
          interviewTime: interviewRow.interview_time,
          interviewLocation: interviewRow.interview_location,
          result: resultValue,
          comments,
          scheduledBy: interviewRow.scheduled_by,
          evaluatedBy: req.user.id,
          createdAt: toIso(interviewRow.created_at),
          updatedAt: now.toISOString()
        },
        applicationStatus: APPLICATION_STATUSES.INTERVIEWED
      }
    };
  });

  return res.status(result.status).json(result.body);
});

export default router;

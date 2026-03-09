import express from 'express';
import { randomUUID } from 'node:crypto';
import { query, withTransaction } from '../lib/db.js';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { cvUpload } from '../middleware/upload.js';
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

router.post('/', authRequired, requireRoles('CANDIDATE'), cvUpload.single('cv'), async (req, res) => {
  const jobId = (req.body.jobId || '').trim();

  if (!jobId) {
    return res.status(400).json({ message: 'jobId is required.' });
  }

  if (!req.file) {
    return res.status(400).json({ message: 'CV file is required.' });
  }

  const [jobRows] = await query('SELECT id FROM jobs WHERE id = ? LIMIT 1', [jobId]);
  if (jobRows.length === 0) {
    return res.status(404).json({ message: 'Job not found.' });
  }

  const [candidateRows] = await query(
    'SELECT id FROM users WHERE id = ? AND role = ? LIMIT 1',
    [req.user.id, 'CANDIDATE']
  );
  if (candidateRows.length === 0) {
    return res.status(401).json({ message: 'Candidate account not found.' });
  }

  const [appliedRows] = await query(
    'SELECT id FROM applications WHERE candidate_id = ? AND job_id = ? LIMIT 1',
    [req.user.id, jobId]
  );
  if (appliedRows.length > 0) {
    return res.status(409).json({ message: 'You have already applied for this job.' });
  }

  const now = new Date();
  const application = {
    id: randomUUID(),
    candidateId: req.user.id,
    jobId,
    cvFile: {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: `/uploads/cv/${req.file.filename}`
    },
    status: APPLICATION_STATUSES.UNDER_REVIEW,
    statusHistory: [
      {
        status: APPLICATION_STATUSES.UNDER_REVIEW,
        updatedAt: now.toISOString(),
        updatedBy: req.user.id
      }
    ],
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };

  await query(
    `INSERT INTO applications
      (id, candidate_id, job_id, cv_original_name, cv_mime_type, cv_size, cv_path, status, status_history, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      application.id,
      application.candidateId,
      application.jobId,
      application.cvFile.originalName,
      application.cvFile.mimeType,
      application.cvFile.size,
      application.cvFile.path,
      application.status,
      JSON.stringify(application.statusHistory),
      now,
      now
    ]
  );

  return res.status(201).json({ message: 'Application submitted successfully.', application });
});

router.get('/', authRequired, requireRoles('HR', 'MANAGEMENT', 'CANDIDATE'), async (req, res) => {
  const params = [];
  let whereClause = '';
  if (req.user.role === 'CANDIDATE') {
    whereClause = 'WHERE a.candidate_id = ?';
    params.push(req.user.id);
  }

  const [rows] = await query(
    `SELECT
        a.id,
        a.status,
        a.created_at,
        a.updated_at,
        a.cv_path,
        a.job_id,
        a.candidate_id,
        u.full_name AS candidate_full_name,
        u.email AS candidate_email,
        u.phone AS candidate_phone,
        j.title AS job_title
      FROM applications a
      LEFT JOIN users u ON u.id = a.candidate_id
      LEFT JOIN jobs j ON j.id = a.job_id
      ${whereClause}
      ORDER BY a.updated_at DESC`,
    params
  );

  const applications = rows.map((application) => ({
    id: application.id,
    status: application.status,
    createdAt: toIso(application.created_at),
    updatedAt: toIso(application.updated_at),
    candidate: {
      fullName: application.candidate_full_name || '',
      email: application.candidate_email || '',
      phone: application.candidate_phone || ''
    },
    appliedPosition: application.job_title || '',
    uploadedCv: application.cv_path || '',
    jobId: application.job_id,
    candidateId: application.candidate_id
  }));

  return res.json({ applications });
});

router.put('/:id/status', authRequired, requireRoles('HR'), async (req, res) => {
  const nextStatus = (req.body.status || '').trim();
  const allowedStatuses = [
    APPLICATION_STATUSES.UNDER_REVIEW,
    APPLICATION_STATUSES.SHORTLISTED,
    APPLICATION_STATUSES.REJECTED
  ];

  if (!allowedStatuses.includes(nextStatus)) {
    return res.status(400).json({ message: 'Invalid application status.' });
  }

  const result = await withTransaction(async (connection) => {
    const [rows] = await connection.query(
      `SELECT id, candidate_id, job_id, status, status_history, created_at
       FROM applications
       WHERE id = ?
       LIMIT 1`,
      [req.params.id]
    );
    const applicationRow = rows[0];
    if (!applicationRow) {
      return { status: 404, body: { message: 'Application not found.' } };
    }

    if (
      applicationRow.status === APPLICATION_STATUSES.APPROVED ||
      applicationRow.status === APPLICATION_STATUSES.HIRED_REJECTED
    ) {
      return { status: 400, body: { message: 'Final hiring decision already completed.' } };
    }

    const updatedAt = new Date();
    const statusHistory = parseStatusHistory(applicationRow.status_history);
    statusHistory.push({
      status: nextStatus,
      updatedAt: updatedAt.toISOString(),
      updatedBy: req.user.id
    });

    await connection.query(
      `UPDATE applications
       SET status = ?, status_history = ?, updated_at = ?
       WHERE id = ?`,
      [nextStatus, JSON.stringify(statusHistory), updatedAt, req.params.id]
    );

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
          updatedAt: updatedAt.toISOString()
        }
      }
    };
  });

  return res.status(result.status).json(result.body);
});

export default router;

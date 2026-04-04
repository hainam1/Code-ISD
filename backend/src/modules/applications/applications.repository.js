import { query } from '../../config/db.js';

export async function findJobById(jobId) {
  const [rows] = await query('SELECT id FROM jobs WHERE id = ? LIMIT 1', [jobId]);
  return rows[0] || null;
}

export async function findCandidateById(candidateId) {
  const [rows] = await query(
    `SELECT
        id,
        full_name,
        email,
        phone,
        date_of_birth,
        id_card,
        address,
        avatar_url,
        role
      FROM users
      WHERE id = ?
      LIMIT 1`,
    [candidateId]
  );
  return rows[0] || null;
}

export async function findApplicationByCandidateAndJob(candidateId, jobId) {
  const [rows] = await query(
    'SELECT id FROM applications WHERE candidate_id = ? AND job_id = ? LIMIT 1',
    [candidateId, jobId]
  );
  return rows[0] || null;
}

export async function insertApplication(application) {
  await query(
    `INSERT INTO applications
      (
        id,
        candidate_id,
        job_id,
        candidate_full_name,
        candidate_email,
        candidate_phone,
        note,
        cv_original_name,
        cv_mime_type,
        cv_size,
        cv_path,
        health_original_name,
        health_mime_type,
        health_size,
        health_path,
        status,
        status_history,
        created_at,
        updated_at
      )
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      application.id,
      application.candidateId,
      application.jobId,
      application.candidateFullName,
      application.candidateEmail,
      application.candidatePhone,
      application.note,
      application.cvFile.originalName,
      application.cvFile.mimeType,
      application.cvFile.size,
      application.cvFile.path,
      application.healthFile?.originalName || null,
      application.healthFile?.mimeType || null,
      application.healthFile?.size || null,
      application.healthFile?.path || null,
      application.status,
      JSON.stringify(application.statusHistory),
      application.createdAt,
      application.updatedAt
    ]
  );
}

export async function listApplications({ candidateId = null } = {}) {
  const params = [];
  let whereClause = '';

  if (candidateId) {
    whereClause = 'WHERE a.candidate_id = ?';
    params.push(candidateId);
  }

  const [rows] = await query(
    `SELECT
        a.id,
        a.status,
        a.created_at,
        a.updated_at,
        a.cv_path,
        a.health_path,
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

  return rows;
}

export async function getApplicationStatusById(applicationId, connection = null) {
  const executor = connection || { query };
  const [rows] = await executor.query(
    `SELECT id, candidate_id, job_id, status, status_history, created_at
     FROM applications
     WHERE id = ?
     LIMIT 1`,
    [applicationId]
  );
  return rows[0] || null;
}

export async function updateApplicationStatus(connection, applicationId, status, statusHistory, updatedAt) {
  await connection.query(
    `UPDATE applications
     SET status = ?, status_history = ?, updated_at = ?
     WHERE id = ?`,
    [status, JSON.stringify(statusHistory), updatedAt, applicationId]
  );
}

import express from 'express';
import { withTransaction } from '../lib/db.js';
import { authRequired, requireRoles } from '../middleware/auth.js';
import { APPLICATION_STATUSES } from '../lib/validators.js';

const router = express.Router();

function parseStatusHistory(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

router.put('/:candidateId', authRequired, requireRoles('MANAGEMENT'), async (req, res) => {
  const decision = (req.body.decision || '').trim();
  if (!['Approve', 'Reject'].includes(decision)) {
    return res.status(400).json({ message: 'Invalid decision. Use Approve or Reject.' });
  }

  const result = await withTransaction(async (connection) => {
    const [rows] = await connection.query(
      `SELECT id, candidate_id, status, status_history, updated_at
       FROM applications
       WHERE candidate_id = ? AND status = ?
       ORDER BY updated_at DESC
       LIMIT 1`,
      [req.params.candidateId, APPLICATION_STATUSES.INTERVIEWED]
    );
    const targetApplication = rows[0];

    if (!targetApplication) {
      return { status: 404, body: { message: 'No interviewed application found for this candidate.' } };
    }

    const [interviewRows] = await connection.query(
      'SELECT id FROM interviews WHERE application_id = ? LIMIT 1',
      [targetApplication.id]
    );
    if (interviewRows.length === 0) {
      return { status: 400, body: { message: 'Interview result is required before hiring decision.' } };
    }

    const nextStatus =
      decision === 'Approve' ? APPLICATION_STATUSES.APPROVED : APPLICATION_STATUSES.HIRED_REJECTED;
    const updatedAt = new Date();
    const statusHistory = parseStatusHistory(targetApplication.status_history);
    statusHistory.push({
      status: nextStatus,
      updatedAt: updatedAt.toISOString(),
      updatedBy: req.user.id,
      note: `Final decision: ${decision}`
    });

    await connection.query(
      `UPDATE applications
       SET status = ?, updated_at = ?, status_history = ?
       WHERE id = ?`,
      [nextStatus, updatedAt, JSON.stringify(statusHistory), targetApplication.id]
    );

    return {
      status: 200,
      body: {
        message: 'Final hiring decision saved.',
        candidateId: req.params.candidateId,
        applicationId: targetApplication.id,
        decision,
        status: nextStatus
      }
    };
  });

  return res.status(result.status).json(result.body);
});

export default router;

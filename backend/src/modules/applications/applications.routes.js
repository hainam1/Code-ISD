import express from 'express';
import { withTransaction } from '../../config/db.js';
import { authRequired, requireRoles } from '../../common/middleware/auth.js';
import { applicationFilesUpload } from '../../common/middleware/upload.js';
import { APPLICATION_STATUSES } from '../../common/validators/index.js';
import { changeApplicationStatus, getVisibleApplications, submitApplication } from './applications.service.js';

const router = express.Router();

function mapUploadedFile(file, pathPrefix) {
  if (!file) {
    return null;
  }

  return {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: `${pathPrefix}/${file.filename}`,
  };
}

router.post(
  '/',
  authRequired,
  requireRoles('CANDIDATE'),
  applicationFilesUpload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'healthFile', maxCount: 1 },
  ]),
  async (req, res) => {
    const files = req.files || {};
    const result = await submitApplication({
      actor: req.user,
      jobId: (req.body.jobId || '').trim(),
      note: (req.body.note || '').trim(),
      cvFile: mapUploadedFile(files.cv?.[0], '/uploads/cv'),
      healthFile: mapUploadedFile(files.healthFile?.[0], '/uploads/health'),
    });

    return res.status(result.status).json(result.body);
  }
);

router.get('/', authRequired, requireRoles('HR', 'MANAGEMENT', 'CANDIDATE'), async (req, res) => {
  const applications = await getVisibleApplications(req.user);
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

  const result = await withTransaction(async (connection) =>
    changeApplicationStatus({
      connection,
      actorId: req.user.id,
      applicationId: req.params.id,
      nextStatus,
    })
  );

  return res.status(result.status).json(result.body);
});

export default router;

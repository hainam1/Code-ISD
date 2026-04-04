import express from 'express';
import { authRequired, requireRoles } from '../../common/middleware/auth.js';
import { updateProfile } from './profile.service.js';

const router = express.Router();

router.patch('/', authRequired, requireRoles('CANDIDATE', 'HR', 'MANAGEMENT'), async (req, res) => {
  const result = await updateProfile(req.user.id, req.body || {});
  return res.status(result.status).json(result.body);
});

export default router;

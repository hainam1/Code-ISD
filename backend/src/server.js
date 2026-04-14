import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import multer from 'multer';
import { getEnv } from './config/env.js';
import { getSupabase } from './config/supabase.js';
import { submitApplication, listApplications, login, register, updateProfile } from './services/applications.js';
import { listJobsView, getJobViewById, createJob, updateJob, deleteJob } from './services/jobs.js';
import { listCandidates, listHistory, getCandidateById, updateCandidate } from './services/candidates.js';
import { getCandidateInterview, upsertCandidateInterview } from './services/interviews.js';
import { listNotifications, createInterviewNotification, markNotificationAsRead } from './services/notifications.js';
import { getChatThread, listChatThreads, sendChatMessage } from './services/chat.js';
import { readApplicationFile } from './services/files.js';
import { asyncHandler, errorHandler } from './utils/response.js';

const env = getEnv();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors({ origin: [env.frontendOrigin, 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

app.get('/api/health', asyncHandler(async (_req, res) => {
  getSupabase();
  res.json({ status: 'ok' });
}));

app.post('/api/auth/login', asyncHandler(async (req, res) => {
  res.json(await login(req.body || {}));
}));

app.post('/api/auth/register', asyncHandler(async (req, res) => {
  res.status(201).json(await register(req.body || {}));
}));

app.get('/api/jobs', asyncHandler(async (_req, res) => {
  res.json({ jobs: await listJobsView() });
}));

app.post('/api/jobs', asyncHandler(async (req, res) => {
  const job = await createJob(req.body || {});
  res.status(201).json({ message: 'Đăng tuyển công việc thành công.', job });
}));

app.get('/api/jobs/:jobId', asyncHandler(async (req, res) => {
  const job = await getJobViewById(req.params.jobId);
  if (!job) {
    return res.status(404).json({ message: 'Không tìm thấy công việc.' });
  }
  res.json({ job });
}));

app.patch('/api/jobs/:jobId', asyncHandler(async (req, res) => {
  const job = await updateJob(req.params.jobId, req.body || {});
  if (!job) {
    return res.status(404).json({ message: 'Không tìm thấy công việc.' });
  }
  res.json({ message: 'Cập nhật công việc thành công.', job });
}));

app.delete('/api/jobs/:jobId', asyncHandler(async (req, res) => {
  await deleteJob(req.params.jobId);
  res.json({ message: 'Xóa công việc thành công.' });
}));

app.get('/api/applications', asyncHandler(async (req, res) => {
  const candidateId = String(req.query.candidateId || '').trim();
  if (!candidateId) {
    return res.status(400).json({ message: 'Thiếu mã ứng viên.' });
  }
  res.json({ applications: await listApplications(candidateId) });
}));

app.post(
  '/api/applications',
  upload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'healthFile', maxCount: 1 },
  ]),
  asyncHandler(async (req, res) => {
    const application = await submitApplication({ fields: req.body || {}, files: req.files || {} });
    res.status(201).json({ message: 'Nộp hồ sơ thành công.', application });
  }),
);

app.patch('/api/profile', asyncHandler(async (req, res) => {
  const user = await updateProfile(req.body || {});
  res.json({ message: 'Cập nhật thông tin thành công.', user });
}));

app.get('/api/notifications', asyncHandler(async (req, res) => {
  const userId = String(req.query.userId || '').trim();
  if (!userId) {
    return res.status(400).json({ message: 'Thiếu userId.' });
  }
  res.json({ notifications: await listNotifications(userId) });
}));

app.post('/api/notifications', asyncHandler(async (req, res) => {
  const result = await createInterviewNotification(req.body || {});
  res.status(result.created ? 201 : 200).json({
    message: result.created ? 'Gửi thông báo thành công.' : 'Thông báo lịch phỏng vấn đã tồn tại.',
    notification: result.notification,
  });
}));

app.patch('/api/notifications/:notificationId', asyncHandler(async (req, res) => {
  const notification = await markNotificationAsRead(req.params.notificationId, req.body?.userId);
  if (!notification) {
    return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
  }
  res.json({ notification });
}));

app.get('/api/chat', asyncHandler(async (req, res) => {
  const viewerId = String(req.query.viewerId || '').trim();
  const viewerRole = String(req.query.viewerRole || '').trim();
  const threadId = String(req.query.threadId || '').trim();
  if (!viewerId || !viewerRole) {
    return res.status(400).json({ message: 'Thiếu thông tin người dùng.' });
  }
  const activeThread = threadId ? await getChatThread({ threadId, viewerId, viewerRole }) : null;
  res.json({
    threads: await listChatThreads({ viewerId, viewerRole }),
    activeThread,
  });
}));

app.post('/api/chat', asyncHandler(async (req, res) => {
  res.status(201).json(await sendChatMessage(req.body || {}));
}));

app.get('/api/admin/candidates', asyncHandler(async (_req, res) => {
  res.json({ candidates: await listCandidates() });
}));

app.get('/api/admin/history', asyncHandler(async (_req, res) => {
  res.json({ candidates: await listHistory() });
}));

app.get('/api/admin/candidates/:candidateId', asyncHandler(async (req, res) => {
  const candidate = await getCandidateById(req.params.candidateId);
  if (!candidate) {
    return res.status(404).json({ message: 'Không tìm thấy ứng viên.' });
  }
  res.json({ candidate });
}));

app.patch('/api/admin/candidates/:candidateId', asyncHandler(async (req, res) => {
  const candidate = await updateCandidate(req.params.candidateId, req.body || {});
  if (!candidate) {
    return res.status(404).json({ message: 'Không tìm thấy ứng viên.' });
  }
  res.json({ message: 'Cập nhật ứng viên thành công.', candidate });
}));

app.get('/api/admin/candidates/:candidateId/interview', asyncHandler(async (req, res) => {
  res.json({ interview: await getCandidateInterview(req.params.candidateId) });
}));

app.post('/api/admin/candidates/:candidateId/interview', asyncHandler(async (req, res) => {
  const interview = await upsertCandidateInterview({
    candidateId: req.params.candidateId,
    interviewDate: req.body.interviewDate,
    interviewTime: req.body.interviewTime,
    location: req.body.location,
    scheduledBy: req.body.scheduledBy,
  });
  res.json({ message: 'Lưu lịch phỏng vấn thành công.', interview });
}));

async function streamCandidateFile(req, res, type) {
  const candidate = await getCandidateById(req.params.candidateId);
  const file = type === 'cv' ? candidate?.cvFile : candidate?.healthFile;
  const notFoundMessage = type === 'cv' ? 'Không tìm thấy CV.' : 'Không tìm thấy hồ sơ sức khỏe.';

  if (!file?.relativePath) {
    return res.status(404).send(notFoundMessage);
  }

  try {
    const buffer = await readApplicationFile(file.relativePath);
    const shouldDownload = String(req.query.download || '') === '1';
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', String(buffer.byteLength));
    res.setHeader('Content-Disposition', `${shouldDownload ? 'attachment' : 'inline'}; filename="${file.fileName}"`);
    return res.status(200).send(buffer);
  } catch {
    return res.status(404).send(notFoundMessage);
  }
}

app.get('/api/admin/candidates/:candidateId/cv', asyncHandler(async (req, res) => {
  await streamCandidateFile(req, res, 'cv');
}));

app.get('/api/admin/candidates/:candidateId/health', asyncHandler(async (req, res) => {
  await streamCandidateFile(req, res, 'health');
}));

app.use(errorHandler);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Smart Guard backend listening on port ${env.port}`);
});

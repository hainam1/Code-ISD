import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.routes.js';
import jobsRoutes from './routes/jobs.routes.js';
import applicationsRoutes from './routes/applications.routes.js';
import interviewsRoutes from './routes/interviews.routes.js';
import hiringRoutes from './routes/hiring.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { getDb } from './lib/db.js';

const app = express();
const PORT = Number(process.env.PORT || 5000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', async (_req, res) => {
  try {
    await getDb();
    return res.json({ status: 'ok' });
  } catch (error) {
    return res.status(503).json({
      status: 'degraded',
      message: 'Database unavailable.',
      error: error.code || error.message
    });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/api/interviews', interviewsRoutes);
app.use('/api/hiring', hiringRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Smart Guard backend listening on port ${PORT}`);
});

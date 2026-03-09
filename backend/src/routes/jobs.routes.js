import express from 'express';
import { query } from '../lib/db.js';
import { formatSlots } from '../lib/validators.js';

const router = express.Router();

router.get('/', async (_req, res) => {
  const [rows] = await query(
    'SELECT id, title, description, location, slots_filled, slots_total FROM jobs ORDER BY title ASC'
  );
  const jobs = rows.map((job) => ({
    id: job.id,
    title: job.title,
    description: job.description,
    location: job.location,
    availableSlots: formatSlots({
      availableSlots: {
        filled: job.slots_filled,
        total: job.slots_total
      }
    })
  }));

  return res.json({ jobs });
});

router.get('/:id', async (req, res) => {
  const [rows] = await query(
    'SELECT id, title, description, location, slots_filled, slots_total FROM jobs WHERE id = ? LIMIT 1',
    [req.params.id]
  );
  const job = rows[0];

  if (!job) {
    return res.status(404).json({ message: 'Job not found.' });
  }

  return res.json({
    job: {
      id: job.id,
      title: job.title,
      description: job.description,
      location: job.location,
      availableSlots: formatSlots({
        availableSlots: {
          filled: job.slots_filled,
          total: job.slots_total
        }
      })
    }
  });
});

export default router;

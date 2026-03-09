import express from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { query } from '../lib/db.js';
import { isValidEmail, isValidPhone, sanitizeUser } from '../lib/validators.js';
import { signAuthToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const fullName = (req.body.fullName || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const phone = (req.body.phone || '').trim();
  const password = (req.body.password || '').trim();

  if (!fullName || !email || !phone || !password) {
    return res.status(400).json({ message: 'Full Name, Email, Phone Number, and Password are required.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format.' });
  }

  if (!isValidPhone(phone)) {
    return res.status(400).json({ message: 'Invalid phone number format.' });
  }

  const [emailRows] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
  if (emailRows.length > 0) {
    return res.status(409).json({ message: 'Email already registered.' });
  }

  const [phoneRows] = await query('SELECT id FROM users WHERE phone = ? LIMIT 1', [phone]);
  if (phoneRows.length > 0) {
    return res.status(409).json({ message: 'Phone number already registered.' });
  }

  const createdAt = new Date();
  const newUser = {
    id: randomUUID(),
    fullName,
    email,
    phone,
    role: 'CANDIDATE',
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: createdAt.toISOString()
  };

  await query(
    `INSERT INTO users (id, full_name, email, phone, role, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [newUser.id, newUser.fullName, newUser.email, newUser.phone, newUser.role, newUser.passwordHash, createdAt]
  );

  return res.status(201).json({
    message: 'Registration successful.',
    user: sanitizeUser(newUser)
  });
});

router.post('/login', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = (req.body.password || '').trim();

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and Password are required.' });
  }

  const [rows] = await query(
    `SELECT id, full_name, email, phone, role, password_hash, created_at
     FROM users
     WHERE email = ?
     LIMIT 1`,
    [email]
  );
  const row = rows[0];

  if (!row) {
    return res.status(401).json({ message: 'Incorrect login information.' });
  }

  const user = {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    passwordHash: row.password_hash,
    createdAt: new Date(row.created_at).toISOString()
  };

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json({ message: 'Incorrect login information.' });
  }

  const token = signAuthToken(user);
  return res.json({
    token,
    user: sanitizeUser(user)
  });
});

export default router;

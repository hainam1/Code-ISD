import express from 'express';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { query } from '../../config/db.js';
import { isValidEmail, isValidPhone, sanitizeUser } from '../../common/validators/index.js';
import { signAuthToken } from '../../common/middleware/auth.js';

const router = express.Router();
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin12345';

function mapUserRow(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    dob: row.date_of_birth ? new Date(row.date_of_birth).toISOString().slice(0, 10) : '',
    idCard: row.id_card || '',
    address: row.address || '',
    avatarUrl: row.avatar_url || '',
    passwordHash: row.password_hash,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  };
}

function buildRegistrationFields(identifier, registerType) {
  if (registerType === 'phone') {
    return {
      email: `${randomUUID()}@smartguard.local`,
      phone: identifier,
    };
  }

  return {
    email: identifier,
    phone: `placeholder-${randomUUID().slice(0, 20)}`,
  };
}

router.post('/register', async (req, res) => {
  const fullName = (req.body.fullName || '').trim();
  const identifier = (req.body.identifier || req.body.email || req.body.phone || '').trim().toLowerCase();
  const registerType = req.body.registerType === 'phone' ? 'phone' : 'email';
  const password = (req.body.password || '').trim();
  const { email, phone } = buildRegistrationFields(identifier, registerType);

  if (!fullName || !identifier || !password) {
    return res.status(400).json({ message: 'Full name, identifier and password are required.' });
  }

  if (registerType === 'email' && !isValidEmail(email)) {
    return res.status(400).json({ message: 'Invalid email format.' });
  }

  if (registerType === 'phone' && !isValidPhone(phone)) {
    return res.status(400).json({ message: 'Invalid phone number format.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  if (registerType === 'email') {
    const [emailRows] = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (emailRows.length > 0) {
      return res.status(409).json({ message: 'Email already registered.' });
    }
  }

  if (registerType === 'phone') {
    const [phoneRows] = await query('SELECT id FROM users WHERE phone = ? LIMIT 1', [phone]);
    if (phoneRows.length > 0) {
      return res.status(409).json({ message: 'Phone number already registered.' });
    }
  }

  const createdAt = new Date();
  const newUser = {
    id: randomUUID(),
    fullName,
    email,
    phone,
    role: 'CANDIDATE',
    passwordHash: await bcrypt.hash(password, 10),
    dob: '',
    idCard: '',
    address: '',
    avatarUrl: '',
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
  const loginType = req.body.loginType === 'admin' ? 'admin' : 'user';
  const identifier = (req.body.identifier || req.body.email || '').trim().toLowerCase();
  const password = (req.body.password || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({ message: 'Identifier and password are required.' });
  }

  if (loginType === 'admin') {
    if (identifier !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Incorrect login information.' });
    }

    const adminUser = {
      id: 'admin-internal',
      fullName: 'Admin',
      email: ADMIN_EMAIL,
      phone: '',
      role: 'ADMIN',
      dob: '',
      idCard: '',
      address: '',
      avatarUrl: '',
      createdAt: new Date().toISOString(),
    };

    return res.json({
      token: signAuthToken(adminUser),
      user: sanitizeUser(adminUser)
    });
  }

  const [rows] = await query(
    `SELECT
        id,
        full_name,
        email,
        phone,
        role,
        password_hash,
        created_at,
        date_of_birth,
        id_card,
        address,
        avatar_url
     FROM users
     WHERE email = ? OR phone = ?
     LIMIT 1`,
    [identifier, identifier]
  );
  const row = rows[0];

  if (!row) {
    return res.status(401).json({ message: 'Incorrect login information.' });
  }

  const user = mapUserRow(row);
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

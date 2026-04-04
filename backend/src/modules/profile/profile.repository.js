import { query } from '../../config/db.js';

export async function findUserProfileById(userId) {
  const [rows] = await query(
    `SELECT
        id,
        full_name,
        email,
        phone,
        role,
        date_of_birth,
        id_card,
        address,
        avatar_url
      FROM users
      WHERE id = ?
      LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function emailExistsForOtherUser(userId, email) {
  const [rows] = await query('SELECT id FROM users WHERE id <> ? AND email = ? LIMIT 1', [userId, email]);
  return rows.length > 0;
}

export async function phoneExistsForOtherUser(userId, phone) {
  const [rows] = await query('SELECT id FROM users WHERE id <> ? AND phone = ? LIMIT 1', [userId, phone]);
  return rows.length > 0;
}

export async function idCardExistsForOtherUser(userId, idCard) {
  const [rows] = await query('SELECT id FROM users WHERE id <> ? AND id_card = ? LIMIT 1', [userId, idCard]);
  return rows.length > 0;
}

export async function updateUserProfile(userId, payload) {
  await query(
    `UPDATE users
     SET full_name = ?, email = ?, phone = ?, date_of_birth = ?, id_card = ?, address = ?, avatar_url = ?
     WHERE id = ?`,
    [
      payload.fullName,
      payload.email,
      payload.phone,
      payload.dob || null,
      payload.idCard || null,
      payload.address || null,
      payload.avatarUrl || null,
      userId,
    ]
  );
}

import { isValidEmail, isValidPhone } from '../../common/validators/index.js';
import {
  emailExistsForOtherUser,
  findUserProfileById,
  idCardExistsForOtherUser,
  phoneExistsForOtherUser,
  updateUserProfile,
} from './profile.repository.js';

function mapUser(row) {
  const email = row.email?.endsWith?.('@smartguard.local') ? '' : row.email || '';
  const phone = row.phone?.startsWith?.('placeholder-') ? '' : row.phone || '';

  return {
    id: row.id,
    fullName: row.full_name || '',
    name: row.full_name || '',
    email,
    phone,
    dob: row.date_of_birth ? new Date(row.date_of_birth).toISOString().slice(0, 10) : '',
    idCard: row.id_card || '',
    address: row.address || '',
    avatarUrl: row.avatar_url || '',
    role: row.role || 'CANDIDATE',
  };
}

export async function updateProfile(actorId, input) {
  const currentUser = await findUserProfileById(actorId);
  if (!currentUser) {
    return { status: 404, body: { message: 'Account not found.' } };
  }

  const fullName = String(input.fullName || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const phone = String(input.phone || '').trim();
  const dob = String(input.dob || '').trim();
  const idCard = String(input.idCard || '').trim();
  const address = String(input.address || '').trim();
  const avatarUrl = String(input.avatarUrl || '').trim();

  if (!fullName) {
    return { status: 400, body: { message: 'Full name is required.' } };
  }

  if (!email || !isValidEmail(email)) {
    return { status: 400, body: { message: 'Valid email is required.' } };
  }

  if (!phone || !isValidPhone(phone)) {
    return { status: 400, body: { message: 'Valid phone number is required.' } };
  }

  const [emailTaken, phoneTaken, idCardTaken] = await Promise.all([
    emailExistsForOtherUser(actorId, email),
    phoneExistsForOtherUser(actorId, phone),
    idCard ? idCardExistsForOtherUser(actorId, idCard) : false,
  ]);

  if (emailTaken) {
    return { status: 409, body: { message: 'Email already in use.' } };
  }

  if (phoneTaken) {
    return { status: 409, body: { message: 'Phone number already in use.' } };
  }

  if (idCardTaken) {
    return { status: 409, body: { message: 'ID card already in use.' } };
  }

  await updateUserProfile(actorId, { fullName, email, phone, dob, idCard, address, avatarUrl });
  const updatedUser = await findUserProfileById(actorId);

  return {
    status: 200,
    body: {
      message: 'Profile updated successfully.',
      user: mapUser(updatedUser),
    },
  };
}

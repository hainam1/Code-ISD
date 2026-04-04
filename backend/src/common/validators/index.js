export const APPLICATION_STATUSES = {
  UNDER_REVIEW: 'Under Review',
  SHORTLISTED: 'Shortlisted',
  REJECTED: 'Rejected',
  INTERVIEW_SCHEDULED: 'Interview Scheduled',
  INTERVIEWED: 'Interviewed',
  APPROVED: 'Approved',
  HIRED_REJECTED: 'Final Rejected'
};

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone) {
  return /^0[3-9][0-9]{8}$/.test(phone);
}

export function formatSlots(job) {
  const filled = job.availableSlots?.filled ?? 0;
  const total = job.availableSlots?.total ?? 0;
  return `${filled}/${total}`;
}

export function sanitizeUser(user) {
  const email = user.email?.endsWith?.('@smartguard.local') ? '' : user.email;
  const phone = user.phone?.startsWith?.('placeholder-') ? '' : user.phone;

  return {
    id: user.id,
    fullName: user.fullName,
    email,
    phone,
    dob: user.dob || '',
    idCard: user.idCard || '',
    address: user.address || '',
    avatarUrl: user.avatarUrl || '',
    role: user.role
  };
}

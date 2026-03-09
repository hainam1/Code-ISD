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
  return /^[0-9+]{8,15}$/.test(phone);
}

export function formatSlots(job) {
  const filled = job.availableSlots?.filled ?? 0;
  const total = job.availableSlots?.total ?? 0;
  return `${filled}/${total}`;
}

export function sanitizeUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    role: user.role
  };
}

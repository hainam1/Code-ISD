import { getSession } from '@/features/auth/api/authApi';

export async function submitApplication(payload) {
  const formData = new FormData();
  formData.append('jobId', payload.jobId || '');
  formData.append('fullName', payload.fullName || '');
  formData.append('identifier', payload.identifier || '');
  formData.append('contactType', payload.contactType || 'email');
  formData.append('note', payload.note || '');
  formData.append('candidateId', payload.candidateId || '');
  if (payload.cvFile) {
    formData.append('cv', payload.cvFile);
  }
  if (payload.healthFile) {
    formData.append('healthFile', payload.healthFile);
  }

  const session = getSession();
  const response = await fetch('/api/applications', {
    method: 'POST',
    headers: session?.token ? { Authorization: `Bearer ${session.token}` } : undefined,
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Gửi đơn thất bại.');
  }
  return data;
}

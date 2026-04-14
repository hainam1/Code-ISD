export const AUTH_ROUTES = {
  login: '/login',
  register: '/register',
};

export const JOB_ROUTES = {
  list: '/jobs',
  detail: (jobId) => `/jobs/${jobId}`,
  apply: '/apply',
};

export const ADMIN_ROUTES = {
  candidates: '/admin/candidates',
  candidateDetail: (candidateId) => `/admin/candidates/${candidateId}`,
  candidateEvaluation: (candidateId) => `/admin/candidates/${candidateId}/evaluation`,
  history: '/admin/history',
  interviews: '/admin/interviews',
  interviewEdit: '/admin/interviews/edit',
  jobs: '/admin/jobs',
  jobCreate: '/admin/jobs/create',
  jobEdit: (jobId) => `/admin/jobs/${jobId}/edit`,
};

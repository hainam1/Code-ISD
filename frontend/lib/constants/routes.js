export const AUTH_ROUTES = {
  login: '/login',
  register: '/register',
};

export const JOB_ROUTES = {
  list: '/jobs',
  detail: (jobId) => `/jobs/${jobId}`,
  apply: '/apply',
};

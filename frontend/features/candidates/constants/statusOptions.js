export const CANDIDATE_STATUS = {
  all: 'All',
  noApplication: 'No Application',
  review: 'Under Review',
  interview: 'Interview Scheduled',
  approved: 'Approved',
  failed: 'Final Rejected',
};

export const STATUS_LABELS = {
  [CANDIDATE_STATUS.all]: 'Tất cả trạng thái',
  [CANDIDATE_STATUS.noApplication]: 'Chưa ứng tuyển',
  [CANDIDATE_STATUS.review]: 'Cần kiểm tra',
  [CANDIDATE_STATUS.interview]: 'Phỏng vấn',
  [CANDIDATE_STATUS.approved]: 'Sẵn sàng',
  [CANDIDATE_STATUS.failed]: 'Bị loại',
  'Under Review': 'Cần kiểm tra',
  'Needs Review': 'Cần kiểm tra',
  Shortlisted: 'Cần kiểm tra',
  Rejected: 'Bị loại',
  Interviewed: 'Phỏng vấn',
  Approved: 'Sẵn sàng',
  'Final Rejected': 'Bị loại',
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

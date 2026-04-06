export const CANDIDATE_STATUS = {
  all: 'All',
  noApplication: 'No Application',
  review: 'Under Review',
  shortlisted: 'Shortlisted',
  interview: 'Interview Scheduled',
  rejected: 'Rejected',
};

export const STATUS_LABELS = {
  [CANDIDATE_STATUS.all]: 'Tất cả trạng thái',
  [CANDIDATE_STATUS.noApplication]: 'Chưa ứng tuyển',
  [CANDIDATE_STATUS.review]: 'Cần đánh giá',
  [CANDIDATE_STATUS.shortlisted]: 'Sẵn sàng',
  [CANDIDATE_STATUS.interview]: 'Phỏng vấn',
  [CANDIDATE_STATUS.rejected]: 'Bị loại',
  Interviewed: 'Phỏng vấn',
  Approved: 'Sẵn sàng',
  'Final Rejected': 'Bị loại',
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

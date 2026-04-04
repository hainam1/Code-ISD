export const CANDIDATE_STATUS = {
  all: 'All',
  review: 'Under Review',
  shortlisted: 'Shortlisted',
  rejected: 'Rejected',
};

export const STATUS_LABELS = {
  [CANDIDATE_STATUS.all]: 'Tất cả trạng thái',
  [CANDIDATE_STATUS.review]: 'Cần đánh giá',
  [CANDIDATE_STATUS.shortlisted]: 'Sẵn sàng',
  [CANDIDATE_STATUS.rejected]: 'Bị loại',
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

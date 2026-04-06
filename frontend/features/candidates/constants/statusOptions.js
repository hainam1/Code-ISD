export const CANDIDATE_STATUS = {
  all: 'All',
  noApplication: 'No Application',
  review: 'Under Review',
  shortlisted: 'Shortlisted',
  rejected: 'Rejected',
};

export const STATUS_LABELS = {
  [CANDIDATE_STATUS.all]: 'Tat ca trang thai',
  [CANDIDATE_STATUS.noApplication]: 'Chua ung tuyen',
  [CANDIDATE_STATUS.review]: 'Can danh gia',
  [CANDIDATE_STATUS.shortlisted]: 'San sang',
  [CANDIDATE_STATUS.rejected]: 'Bi loai',
};

export function getStatusLabel(status) {
  return STATUS_LABELS[status] || status;
}

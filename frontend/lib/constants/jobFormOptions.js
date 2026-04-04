export const EXPERIENCE_OPTIONS = ['1 - 2 năm', 'Dưới 1 năm', '2 - 3 năm', 'Trên 3 năm'];
export const STATUS_OPTIONS = ['Đang tuyển dụng', 'Tạm dừng', 'Đã đóng'];
export const SCHEDULE_OPTIONS = ['Xoay ca', 'Cố định'];
export const WORK_MODE_OPTIONS = ['Toàn thời gian', 'Bán thời gian', 'Theo ca'];

export const JOB_STATUS = {
  recruiting: 'Đang tuyển dụng',
  paused: 'Tạm dừng',
  closed: 'Đã đóng',
};

export const JOB_SCHEDULE_LABELS = {
  rotation: 'LUÂN PHIÊN',
  time: 'THỜI GIAN',
  dayOff: 'NGÀY NGHỈ',
  mode: 'HÌNH THỨC',
};

export function buildSalaryRange(minSalary, maxSalary) {
  return `${minSalary} - ${maxSalary} VND / tháng`;
}

export function buildJobSchedule({ scheduleType, workHours, dayOff, workMode }) {
  return [
    { label: JOB_SCHEDULE_LABELS.rotation, value: scheduleType || 'Xoay ca' },
    { label: JOB_SCHEDULE_LABELS.time, value: workHours },
    { label: JOB_SCHEDULE_LABELS.dayOff, value: dayOff || 'Theo quy định' },
    { label: JOB_SCHEDULE_LABELS.mode, value: workMode },
  ];
}

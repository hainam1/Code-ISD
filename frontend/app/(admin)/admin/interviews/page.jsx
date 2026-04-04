export default function InterviewSchedulingPage({ searchParams }) {
  const InterviewSuccessView = require('@/features/interviews/components/InterviewSuccessView').default;
  const candidateId = searchParams?.candidateId || '';
  const candidateName = searchParams?.candidateName || 'Nguyễn Văn A';
  const position = searchParams?.position || 'Nhân viên bảo vệ ca đêm';
  const interviewDate = searchParams?.date || 'Thứ Năm, 24 tháng 10, 2023';
  const interviewTime = searchParams?.time || '09:00 - 10:00';
  const location = searchParams?.location || 'Văn phòng Long Hải Security, Quận 1, TP Hồ Chí Minh';
  const interviewId = searchParams?.interviewId || 'INV-8829-X';
  const rawDate = searchParams?.rawDate || '2023-10-24';

  return (
    <InterviewSuccessView
      interview={{
        candidateId,
        candidateName,
        position,
        interviewDate,
        interviewTime,
        location,
        interviewId,
        rawDate,
      }}
    />
  );
}

export default function EditInterviewPage({ searchParams }) {
  const InterviewScheduleEditor = require('@/features/interviews/components/InterviewScheduleEditor').default;
  const candidateId = searchParams?.candidateId || '';
  const candidateName = searchParams?.candidateName || 'Nguyễn Văn A';
  const position = searchParams?.position || 'Nhân viên bảo vệ ca đêm';
  const interviewId = searchParams?.interviewId || '';
  const initialDate = searchParams?.rawDate || searchParams?.date || '2023-10-24';
  const initialTime = searchParams?.time || '09:00 - 10:00';
  const initialLocation = searchParams?.location || 'Văn phòng Long Hải Security, Quận 1, TP Hồ Chí Minh';

  return (
    <InterviewScheduleEditor
      candidateId={candidateId}
      candidateName={candidateName}
      position={position}
      interviewId={interviewId}
      initialDate={initialDate}
      initialTime={initialTime}
      initialLocation={initialLocation}
    />
  );
}

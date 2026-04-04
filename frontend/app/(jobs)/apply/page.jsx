import ApplicationFormView from '@/features/applications/ApplicationFormView';

export default function ApplyPage({ searchParams }) {
  return <ApplicationFormView jobId={searchParams?.jobId || ''} />;
}

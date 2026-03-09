import ApplicationFormView from '../../../features/application/ApplicationFormView';

export default function ApplyPage({ searchParams }) {
  return <ApplicationFormView jobId={searchParams?.jobId || ''} />;
}

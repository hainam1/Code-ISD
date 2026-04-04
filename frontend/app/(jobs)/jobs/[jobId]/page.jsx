import JobDetailView from '@/features/jobs/JobDetailView';
import { getJobById } from '@/features/jobs/api/jobsApi';

export default async function JobDetailPage({ params }) {
  const job = await getJobById(params.jobId);
  return <JobDetailView job={job} />;
}

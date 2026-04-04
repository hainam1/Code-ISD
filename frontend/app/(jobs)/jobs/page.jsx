import JobsListView from '@/features/jobs/JobsListView';
import { getJobs } from '@/features/jobs/api/jobsApi';

export const metadata = {
  title: 'Công việc | Smart Guard',
};

export default async function JobsPage() {
  const jobs = await getJobs();
  return <JobsListView jobs={jobs} />;
}

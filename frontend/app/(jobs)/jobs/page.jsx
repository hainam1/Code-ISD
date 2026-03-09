import JobsListView from '../../../features/jobs/JobsListView';
import { getJobs } from '../../../services/api/jobsApi';

export const metadata = {
  title: 'Cong viec | Smart Guard',
};

export default async function JobsPage() {
  const jobs = await getJobs();
  return <JobsListView jobs={jobs} />;
}

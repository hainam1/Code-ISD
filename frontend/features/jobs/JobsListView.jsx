import JobCard from '../../components/jobs/JobCard';
import JobsToolbar from '../../components/jobs/JobsToolbar';
import styles from './JobsListView.module.css';

export default function JobsListView({ jobs }) {
  return (
    <main className={styles.page}>
      <JobsToolbar />
      <section className={styles.grid}>
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </section>
      <div className={styles.pagination}>
        <button type="button">‹</button>
        <button type="button" className={styles.active}>1</button>
        <button type="button">2</button>
        <button type="button">3</button>
        <button type="button">4</button>
        <button type="button">›</button>
      </div>
    </main>
  );
}

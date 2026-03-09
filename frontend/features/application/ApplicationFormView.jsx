import ApplyModal from '../../components/application/ApplyModal';
import styles from './ApplicationFormView.module.css';

export default function ApplicationFormView({ jobId }) {
  return (
    <main className={styles.page}>
      <ApplyModal jobId={jobId} />
    </main>
  );
}

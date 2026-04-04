import styles from './AppFooter.module.css';

export default function AppFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.links}>
        <button type="button">Privacy Policy</button>
        <button type="button">Terms of Service</button>
        <button type="button">Help Center</button>
        <button type="button">Contact Support</button>
      </div>
      <p className={styles.brand}>SMART GUARD RECRUITMENT</p>
      <p className={styles.copy}>© 2026 Long Hai Security Company. All rights reserved.</p>
    </footer>
  );
}

import JobSummaryCard from '../../components/jobs/JobSummaryCard';
import styles from './JobDetailView.module.css';

export default function JobDetailView({ job }) {
  if (!job) {
    return (
      <main className={styles.page}>
        <p className={styles.notFound}>Khong tim thay thong tin vi tri.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <p className={styles.breadcrumb}>Tong quan / Vi tri tuyen dung / Chi tiet vi tri Bao ve</p>

      <div className={styles.titleRow}>
        <div>
          <p className={styles.badge}>DANG TUYEN</p>
          <h1 className={styles.title}>{job.title}</h1>
          <p className={styles.meta}>
            {job.company} • {job.address}
          </p>
        </div>
        <a className={styles.backButton} href="/jobs">
          ← Quay lai danh sach
        </a>
      </div>

      <section className={styles.stats}>
        <article>
          <h3>Muc luong</h3>
          <p>8.000.000 VND - 12.000.000 VND /thang</p>
        </article>
        <article>
          <h3>Kinh nghiem</h3>
          <p>{job.experience}</p>
        </article>
        <article>
          <h3>Ung vien</h3>
          <p>{job.candidates}</p>
        </article>
      </section>

      <section className={styles.contentGrid}>
        <div className={styles.contentCol}>
          <h2>Mo ta cong viec</h2>
          <p>
            Chung toi dang tim kiem nhan vien bao ve chuyen nghiep va canh giac cao cho khu vuc
            duoc phan cong. Trong vai tro nay, ban se chiu trach nhiem duy tri moi truong an toan
            va an ninh cho cac khach hang VIP cung nhu tai san cua ho.
          </p>
          <p>
            Ban se dai dien cho thuong hieu uy tin cua Bao ve Long Hai, cung cap dich vu xuat sac
            trong khi tuan thu tat ca quy dinh an ninh mot cach chuyen nghiep hang ngay.
          </p>

          <h2>Yeu cau cong viec</h2>
          <ul className={styles.requirements}>
            {job.requirements.map((item) => (
              <li key={item}>☑ {item}</li>
            ))}
          </ul>
        </div>

        <JobSummaryCard summary={job.summary} jobId={job.id} />
      </section>

      <section className={styles.schedule}>
        {job.schedule.map((item) => (
          <article key={item.label}>
            <p>{item.label}</p>
            <h4>{item.value}</h4>
          </article>
        ))}
      </section>

      <section className={styles.cta}>
        <h3>San sang dong hanh cung chung toi?</h3>
        <p>Gui thong tin tuyen dung den chung toi de duoc lien he nhanh nhat.</p>
      </section>
    </main>
  );
}

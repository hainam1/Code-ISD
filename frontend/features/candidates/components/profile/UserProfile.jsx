'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getSession } from '@/features/auth/api/authApi';
import styles from './UserProfile.module.css';

function formatDisplayDate(dateValue) {
  if (!dateValue) {
    return 'Chưa cập nhật';
  }

  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getInitials(fullName) {
  return (fullName || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function buildProfileMetrics(user) {
  const fields = [user?.fullName || user?.name, user?.email, user?.phone, user?.address, user?.dob, user?.idCard];
  const completedFields = fields.filter(Boolean).length;
  const profileScore = Math.round((completedFields / fields.length) * 100);

  return {
    completedFields,
    totalFields: fields.length,
    profileScore,
  };
}

export default function UserProfile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const session = getSession();
    if (!session?.user) {
      return;
    }

    setUser(session.user);
  }, []);

  if (!user) {
    return (
      <div className={styles.loadingContainer}>
        <p>Đang tải thông tin cá nhân...</p>
      </div>
    );
  }

  const metrics = buildProfileMetrics(user);
  const infoItems = [
    { label: 'Họ và tên', value: user.fullName || user.name || 'Chưa cập nhật' },
    { label: 'Email', value: user.email || 'Chưa cập nhật' },
    { label: 'Số điện thoại', value: user.phone || 'Chưa cập nhật' },
    { label: 'Địa chỉ', value: user.address || 'Chưa cập nhật' },
    { label: 'Ngày sinh', value: formatDisplayDate(user.dob) },
    { label: 'CCCD / CMND', value: user.idCard || 'Chưa cập nhật' },
  ];

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <p className={styles.eyebrow}>Hồ sơ ứng viên</p>
        <div className={styles.pageHeaderRow}>
          <div className={styles.pageHeaderContent}>
            <h1 className={styles.pageTitle}>Thông tin cá nhân rõ ràng, sẵn sàng cho bước xét duyệt</h1>
            <p className={styles.pageSubtitle}>
              Kiểm tra nhanh hồ sơ, bổ sung thông tin còn thiếu và giữ ảnh đại diện chuyên nghiệp để nhà tuyển dụng dễ nhận diện.
            </p>
          </div>
          <Link href="/profile/edit" className={styles.primaryAction}>
            Cập nhật hồ sơ
          </Link>
        </div>
      </header>

      <main className={styles.mainContent}>
        <section className={styles.heroCard}>
          <div className={styles.heroPanel}>
            <div className={styles.profileTop}>
              <div
                className={styles.heroAvatar}
                style={user.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})` } : undefined}
              >
                {user.avatarUrl ? null : getInitials(user.fullName || user.name)}
              </div>
              <div className={styles.headingTexts}>
                <span className={styles.statusChip}>Tài khoản ứng viên</span>
                <h2 className={styles.profileName}>{user.fullName || user.name || 'Ứng viên'}</h2>
                <p className={styles.sectionSub}>
                  Hồ sơ của bạn đang ở mức {metrics.profileScore}% hoàn chỉnh. Điền đủ thông tin sẽ giúp quá trình liên hệ và xếp lịch nhanh hơn.
                </p>
              </div>
            </div>

            <div className={styles.heroMeta}>
              <div className={styles.metricCard}>
                <span className={styles.metricLabel}>Độ đầy đủ</span>
                <strong className={styles.metricValue}>{metrics.profileScore}%</strong>
                <span className={styles.metricHint}>
                  {metrics.completedFields}/{metrics.totalFields} mục đã cập nhật
                </span>
              </div>
              <div className={styles.metricCard}>
                <span className={styles.metricLabel}>Trạng thái</span>
                <strong className={styles.metricValue}>Sẵn sàng bổ sung</strong>
                <span className={styles.metricHint}>Thông tin được lưu và có thể chỉnh sửa bất kỳ lúc nào.</span>
              </div>
            </div>
          </div>

          <aside className={styles.sidePanel}>
            <p className={styles.sideTitle}>Lưu ý cho ứng viên</p>
            <ul className={styles.sideList}>
              <li>Sử dụng họ tên, số điện thoại và địa chỉ chính xác để bên tuyển dụng liên hệ đúng lúc.</li>
              <li>Ảnh đại diện nên rõ mặt, nền sáng và trang phục gọn gàng.</li>
              <li>Nếu thay đổi số điện thoại hoặc CCCD, cập nhật ngay để tránh sai thông tin hồ sơ.</li>
            </ul>
          </aside>
        </section>

        <section className={styles.detailsSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionEyebrow}>Chi tiết hồ sơ</p>
              <h2 className={styles.sectionTitle}>Thông tin cơ bản</h2>
            </div>
            <p className={styles.sectionNote}>Tất cả trường thông tin bên dưới được đồng bộ từ trang chỉnh sửa hồ sơ.</p>
          </div>

          <div className={styles.infoGrid}>
            {infoItems.map((item) => (
              <div key={item.label} className={styles.infoCard}>
                <label>{item.label}</label>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

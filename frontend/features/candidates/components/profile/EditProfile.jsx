'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, setSession } from '@/features/auth/api/authApi';
import styles from './EditProfile.module.css';

const PHONE_REGEX = /^0[3-9][0-9]{8}$/;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const AVATAR_OUTPUT_SIZE = 512;
const AVATAR_OUTPUT_QUALITY = 0.82;

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IdCardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
      <circle cx="8.5" cy="10.5" r="2.5" />
      <line x1="14" y1="10" x2="19" y2="10" />
      <line x1="14" y1="14" x2="19" y2="14" />
      <line x1="5" y1="16" x2="11" y2="16" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function getInitial(fullName) {
  return (fullName || 'U')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

function getProfileCompletion(formData) {
  const values = [formData.fullName, formData.email, formData.phone, formData.dob, formData.idCard, formData.address, formData.avatarUrl];
  const filled = values.filter((value) => String(value || '').trim()).length;
  return Math.round((filled / values.length) * 100);
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc ảnh đại diện.'));
    };

    image.src = objectUrl;
  });
}

async function buildAvatarDataUrl(file) {
  const image = await loadImage(file);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
  }

  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;

  const scale = Math.max(
    AVATAR_OUTPUT_SIZE / Math.max(image.width, 1),
    AVATAR_OUTPUT_SIZE / Math.max(image.height, 1),
  );
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (AVATAR_OUTPUT_SIZE - drawWidth) / 2;
  const offsetY = (AVATAR_OUTPUT_SIZE - drawHeight) / 2;

  context.clearRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
  context.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);

  return canvas.toDataURL('image/webp', AVATAR_OUTPUT_QUALITY);
}

export default function EditProfile() {
  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formMessage, setFormMessage] = useState('');
  const [formMessageType, setFormMessageType] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    dob: '',
    idCard: '',
    address: '',
    avatarUrl: '',
  });
  const [phonePlaceholder, setPhonePlaceholder] = useState('03xxxxxxxx');
  const fileInputRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    if (session?.user) {
      setUser(session.user);
      setFormData({
        fullName: session.user.fullName || session.user.name || '',
        email: session.user.email || '',
        phone: '',
        dob: session.user.dob || '',
        idCard: session.user.idCard || '',
        address: session.user.address || '',
        avatarUrl: session.user.avatarUrl || '',
      });
      setPhonePlaceholder(session.user.phone || '03xxxxxxxx');
    } else {
      setUser({});
    }
  }, []);

  if (!user) {
    return (
      <div className={styles.pageContainer}>
        <p className={styles.loadingText}>Đang tải dữ liệu...</p>
      </div>
    );
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleAvatarSelect(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setFormMessage('Ảnh đại diện chỉ hỗ trợ PNG, JPG hoặc WEBP.');
      setFormMessageType('error');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setFormMessage('Ảnh đại diện vượt quá 2MB. Hãy chọn ảnh nhẹ hơn.');
      setFormMessageType('error');
      event.target.value = '';
      return;
    }

    try {
      const avatarUrl = await buildAvatarDataUrl(file);
      setFormMessage('');
      setFormMessageType('');
      setFormData((prev) => ({
        ...prev,
        avatarUrl,
      }));
    } catch (error) {
      setFormMessage(error?.message || 'Không thể xử lý ảnh đại diện.');
      setFormMessageType('error');
      event.target.value = '';
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormMessage('');
    setFormMessageType('');

    if (formData.phone && !PHONE_REGEX.test(formData.phone.trim())) {
      setFormMessage('Số điện thoại phải gồm 10 chữ số và bắt đầu từ 03 đến 09.');
      setFormMessageType('error');
      return;
    }

    const session = getSession();
    if (session?.user) {
      const userId = String(session.user.id || '').trim();
      const authToken = String(session.token || `user-${userId}`).trim();
      if (!userId) {
        setFormMessage('Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.');
        setFormMessageType('error');
        return;
      }

      setIsSaving(true);

      try {
        const response = await fetch('/api/profile', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify({
            userId,
            fullName: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            dob: formData.dob,
            idCard: formData.idCard,
            address: formData.address,
            avatarUrl: formData.avatarUrl,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.message || 'Không thể cập nhật thông tin.');
        }

        setSession({
          ...session,
          user: {
            ...session.user,
            ...payload.user,
          },
        });

        setFormMessage(payload.message || 'Cập nhật thông tin thành công!');
        setFormMessageType('success');
        router.push('/profile');
        router.refresh();
      } catch (error) {
        setFormMessage(error?.message || 'Không thể cập nhật thông tin.');
        setFormMessageType('error');
      } finally {
        setIsSaving(false);
      }
    }
  }

  const completion = getProfileCompletion(formData);
  const checklist = [
    { label: 'Họ tên đầy đủ', done: Boolean(formData.fullName.trim()) },
    { label: 'Email hoặc kênh liên hệ', done: Boolean(formData.email.trim() || formData.phone.trim()) },
    { label: 'Ảnh đại diện', done: Boolean(formData.avatarUrl) },
    { label: 'Thông tin xác minh', done: Boolean(formData.idCard.trim() && formData.address.trim()) },
  ];

  return (
    <div className={styles.pageContainer}>
      <main className={styles.mainContent}>
        <div className={styles.pageHeader}>
          <p className={styles.eyebrow}>Cập nhật hồ sơ</p>
          <div className={styles.headerRow}>
            <div className={styles.headerCopy}>
              <h1 className={styles.pageTitle}>Điều chỉnh hồ sơ cá nhân để nhà tuyển dụng đọc nhanh hơn</h1>
              <p className={styles.pageSubtitle}>
                Giao diện ưu tiên sự rõ ràng, dễ nhập trên điện thoại và giữ thông tin xác thực nhất cho quá trình liên hệ.
              </p>
            </div>
            <Link href="/profile" className={styles.secondaryAction}>
              Quay lại hồ sơ
            </Link>
          </div>
        </div>

        <section className={styles.workspace}>
          <aside className={styles.profileRail}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className={styles.hiddenInput}
              onChange={handleAvatarSelect}
            />
            <button
              type="button"
              className={styles.avatarUpload}
              onClick={() => fileInputRef.current?.click()}
            >
              <div
                className={`${styles.avatarPlaceholder} ${formData.avatarUrl ? styles.avatarFilled : ''}`}
                style={formData.avatarUrl ? { backgroundImage: `url(${formData.avatarUrl})` } : undefined}
              >
                {formData.avatarUrl ? null : <CameraIcon />}
                {formData.avatarUrl ? null : <span className={styles.avatarFallback}>{getInitial(formData.fullName)}</span>}
              </div>
              <span className={styles.avatarText}>Tải ảnh đại diện</span>
            </button>

            <div className={styles.profileSummary}>
              <span className={styles.summaryLabel}>Mức độ hoàn chỉnh</span>
              <strong className={styles.summaryValue}>{completion}%</strong>
              <p className={styles.summaryCopy}>Hồ sơ đầy đủ hơn sẽ giúp đội tuyển dụng xác minh nhanh và liên hệ đúng kênh.</p>
            </div>

            <div className={styles.checklist}>
              {checklist.map((item) => (
                <div key={item.label} className={styles.checkItem}>
                  <span className={item.done ? styles.checkDotDone : styles.checkDot} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </aside>

          <section className={styles.mainCard}>
            <form onSubmit={handleSubmit}>
              <div className={styles.formGrid}>
                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label>Họ và tên</label>
                  <p className={styles.fieldHint}>Sử dụng tên trùng với CCCD/CMND để tránh sai lệch khi đối chiếu hồ sơ.</p>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Nhập họ và tên"
                    value={formData.fullName}
                    onChange={handleChange}
                    className={styles.inputField}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <label>Email</label>
                  <p className={styles.fieldHint}>Nhận thông báo và cập nhật tuyển dụng.</p>
                  <div className={styles.inputWrapper}>
                    <div className={styles.inputIcon}><MailIcon /></div>
                    <input
                      type="email"
                      name="email"
                      placeholder="example@gmail.com"
                      value={formData.email}
                      onChange={handleChange}
                      className={`${styles.inputField} ${styles.withIcon}`}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Số điện thoại</label>
                  <p className={styles.fieldHint}>Số di động đang hoạt động để nhận cuộc gọi phỏng vấn.</p>
                  <div className={styles.inputWrapper}>
                    <div className={styles.inputIcon}><PhoneIcon /></div>
                    <input
                      type="text"
                      name="phone"
                      placeholder={phonePlaceholder}
                      value={formData.phone}
                      onChange={handleChange}
                      className={`${styles.inputField} ${styles.withIcon}`}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>Ngày sinh</label>
                  <p className={styles.fieldHint}>Thông tin cơ bản phục vụ đối chiếu và lưu hồ sơ.</p>
                  <div className={styles.inputWrapper}>
                    <div className={styles.inputIcon}><CalendarIcon /></div>
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className={`${styles.inputField} ${styles.withIcon}`}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label>CCCD / CMND</label>
                  <p className={styles.fieldHint}>Nhập đúng số trên giấy tờ tùy thân.</p>
                  <div className={styles.inputWrapper}>
                    <div className={styles.inputIcon}><IdCardIcon /></div>
                    <input
                      type="text"
                      name="idCard"
                      placeholder="Số định danh"
                      value={formData.idCard}
                      onChange={handleChange}
                      className={`${styles.inputField} ${styles.withIcon}`}
                    />
                  </div>
                </div>

                <div className={`${styles.inputGroup} ${styles.fullWidth}`}>
                  <label>Địa chỉ</label>
                  <p className={styles.fieldHint}>Địa chỉ hiện tại để đội tuyển dụng dễ sắp xếp vị trí phù hợp.</p>
                  <div className={styles.inputWrapper}>
                    <div className={styles.inputIcon}><LocationIcon /></div>
                    <input
                      type="text"
                      name="address"
                      placeholder="Nhập địa chỉ thường trú"
                      value={formData.address}
                      onChange={handleChange}
                      className={`${styles.inputField} ${styles.withIcon}`}
                    />
                  </div>
                </div>
              </div>

              {formMessage ? (
                <p className={`${styles.formMessage} ${formMessageType === 'error' ? styles.formMessageError : styles.formMessageSuccess}`}>
                  {formMessage}
                </p>
              ) : null}

              <div className={styles.submitSection}>
                <Link href="/profile" className={styles.ghostButton}>
                  Hủy
                </Link>
                <button type="submit" className={styles.submitBtn} disabled={isSaving}>
                  {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </section>
        </section>
      </main>
    </div>
  );
}

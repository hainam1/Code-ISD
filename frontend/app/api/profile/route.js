import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0[3-9][0-9]{8}$/;

function mapUser(user) {
  return {
    id: user.id,
    fullName: user.fullName || '',
    name: user.fullName || '',
    email: user.email || '',
    phone: user.phone || '',
    dob: user.dob || '',
    idCard: user.idCard || '',
    address: user.address || '',
    avatarUrl: user.avatarUrl || '',
    role: user.role || 'USER',
  };
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const userId = String(body.userId || '').trim();

    if (!userId) {
      return NextResponse.json({ message: 'Thiếu mã người dùng.' }, { status: 400 });
    }

    const db = await getDb();
    const user = db.data.users.find((item) => item.id === userId);

    if (!user) {
      return NextResponse.json({ message: 'Không tìm thấy tài khoản.' }, { status: 404 });
    }

    const fullName = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const dob = String(body.dob || '').trim();
    const idCard = String(body.idCard || '').trim();
    const address = String(body.address || '').trim();
    const avatarUrl = String(body.avatarUrl || '').trim();

    if (!fullName) {
      return NextResponse.json({ message: 'Họ và tên không được để trống.' }, { status: 400 });
    }

    if (email && !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ message: 'Email không hợp lệ.' }, { status: 400 });
    }

    if (phone && !PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu từ 03 đến 09.' },
        { status: 400 }
      );
    }

    const emailTaken = email
      ? db.data.users.some((item) => item.id !== userId && item.email === email)
      : false;
    if (emailTaken) {
      return NextResponse.json({ message: 'Email đã được sử dụng.' }, { status: 409 });
    }

    const phoneTaken = phone
      ? db.data.users.some((item) => item.id !== userId && item.phone === phone)
      : false;
    if (phoneTaken) {
      return NextResponse.json({ message: 'Số điện thoại đã được sử dụng.' }, { status: 409 });
    }

    user.fullName = fullName;
    user.email = email;
    user.phone = phone;
    user.dob = dob;
    user.idCard = idCard;
    user.address = address;
    user.avatarUrl = avatarUrl;
    user.updatedAt = new Date().toISOString();

    await db.write();

    return NextResponse.json({
      message: 'Cập nhật thông tin thành công.',
      user: mapUser(user),
    });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể cập nhật thông tin.', error: String(error) },
      { status: 500 }
    );
  }
}

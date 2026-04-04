import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const INVALID_LOGIN_MESSAGE = 'Email, số điện thoại, mật khẩu hoặc loại tài khoản chưa chính xác';
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin12345';

export async function POST(request) {
  try {
    const body = await request.json();
    const loginType = body.loginType === 'admin' ? 'admin' : 'user';
    const identifier = (body.identifier || '').trim().toLowerCase();
    const password = (body.password || '').trim();

    if (!identifier || !password) {
      return NextResponse.json({ message: 'Vui lòng nhập đầy đủ Email hoặc Password.' }, { status: 400 });
    }

    if (password.length <= 6) {
      return NextResponse.json({ message: INVALID_LOGIN_MESSAGE }, { status: 401 });
    }

    if (loginType === 'admin') {
      if (identifier !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return NextResponse.json({ message: INVALID_LOGIN_MESSAGE }, { status: 401 });
      }

      return NextResponse.json({
        message: 'Đăng nhập thành công',
        token: 'admin-internal-token',
        user: {
          id: 'admin-internal',
          name: 'Admin',
          email: ADMIN_EMAIL,
          phone: '',
          role: 'ADMIN',
        },
      });
    }

    const isEmailLogin = identifier.includes('@');
    if (isEmailLogin && !EMAIL_REGEX.test(identifier)) {
      return NextResponse.json({ message: 'Email không hợp lệ (ví dụ: abc@gmail.com).' }, { status: 400 });
    }
    if (!isEmailLogin && !PHONE_REGEX.test(identifier)) {
      return NextResponse.json({ message: INVALID_LOGIN_MESSAGE }, { status: 401 });
    }

    const db = await getDb();
    const user = db.data.users.find((item) => item.email === identifier || item.phone === identifier);
    if (!user) {
      return NextResponse.json({ message: INVALID_LOGIN_MESSAGE }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ message: INVALID_LOGIN_MESSAGE }, { status: 401 });
    }
    if ((user.role || '').toUpperCase() === 'ADMIN') {
      return NextResponse.json({ message: INVALID_LOGIN_MESSAGE }, { status: 401 });
    }

    return NextResponse.json({
      message: 'Đăng nhập thành công',
      token: `user-${user.id}`,
      user: {
        id: user.id,
        fullName: user.fullName || '',
        name: user.fullName,
        email: user.email || '',
        phone: user.phone || '',
        dob: user.dob || '',
        idCard: user.idCard || '',
        address: user.address || '',
        avatarUrl: user.avatarUrl || '',
        role: user.role || 'USER',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: 'Đăng nhập thất bại. Vui lòng thử lại.', error: String(error) },
      { status: 500 }
    );
  }
}

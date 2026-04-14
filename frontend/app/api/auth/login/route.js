import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import {
  encodeSessionCookie,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/session';
import { createClient } from '@/lib/supabase/server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const INVALID_LOGIN_MESSAGE = 'Email, số điện thoại, mật khẩu hoặc loại tài khoản chưa chính xác';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim() || 'admin@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim() || 'admin12345';

function isPlaceholderEmail(value) {
  return /@smartguard\.local$/i.test(String(value || '').trim());
}

function isPlaceholderPhone(value) {
  return /^placeholder-/i.test(String(value || '').trim());
}

function toPublicEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return isPlaceholderEmail(email) ? '' : email;
}

function toPublicPhone(value) {
  const phone = String(value || '').trim();
  return isPlaceholderPhone(phone) ? '' : phone;
}

function withSessionCookie(payload) {
  const response = NextResponse.json(payload);
  response.cookies.set(
    SESSION_COOKIE_NAME,
    encodeSessionCookie(payload),
    getSessionCookieOptions(),
  );
  return response;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const loginType = body.loginType === 'admin' ? 'admin' : 'user';
    const identifier = String(body.identifier || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

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

      return withSessionCookie({
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

    const supabase = createClient();
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${identifier},phone.eq.${identifier}`)
      .limit(1);

    if (error) {
      return NextResponse.json({ message: 'Đã có lỗi xảy ra khi truy xuất cơ sở dữ liệu.' }, { status: 500 });
    }

    const user = users?.[0];
    if (!user || !user.password_hash) {
      return NextResponse.json({ message: INVALID_LOGIN_MESSAGE }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch || String(user.role || '').toUpperCase() === 'ADMIN') {
      return NextResponse.json({ message: INVALID_LOGIN_MESSAGE }, { status: 401 });
    }

    return withSessionCookie({
      message: 'Đăng nhập thành công',
      token: `user-${user.id}`,
      user: {
        id: user.id,
        fullName: user.full_name || '',
        name: user.full_name || '',
        email: toPublicEmail(user.email),
        phone: toPublicPhone(user.phone),
        dob: user.date_of_birth || '',
        idCard: user.id_card || '',
        address: user.address || '',
        avatarUrl: user.avatar_url || '',
        role: user.role || 'USER',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: 'Đăng nhập thất bại. Vui lòng thử lại.', error: String(error) },
      { status: 500 },
    );
  }
}

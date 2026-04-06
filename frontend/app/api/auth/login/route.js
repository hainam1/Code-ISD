import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;
const INVALID_LOGIN_MESSAGE = 'Email, so dien thoai, mat khau hoac loai tai khoan chua chinh xac';
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

export async function POST(request) {
  try {
    const body = await request.json();
    const loginType = body.loginType === 'admin' ? 'admin' : 'user';
    const identifier = String(body.identifier || '').trim().toLowerCase();
    const password = String(body.password || '').trim();

    if (!identifier || !password) {
      return NextResponse.json({ message: 'Vui long nhap day du Email hoac Password.' }, { status: 400 });
    }

    if (password.length <= 6) {
      return NextResponse.json({ message: INVALID_LOGIN_MESSAGE }, { status: 401 });
    }

    if (loginType === 'admin') {
      if (identifier !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        return NextResponse.json({ message: INVALID_LOGIN_MESSAGE }, { status: 401 });
      }

      return NextResponse.json({
        message: 'Dang nhap thanh cong',
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
      return NextResponse.json({ message: 'Email khong hop le (vi du: abc@gmail.com).' }, { status: 400 });
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
      return NextResponse.json({ message: 'Da co loi xay ra khi truy xuat co so du lieu.' }, { status: 500 });
    }

    const user = users?.[0];
    if (!user || !user.password_hash) {
      return NextResponse.json({ message: INVALID_LOGIN_MESSAGE }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch || String(user.role || '').toUpperCase() === 'ADMIN') {
      return NextResponse.json({ message: INVALID_LOGIN_MESSAGE }, { status: 401 });
    }

    return NextResponse.json({
      message: 'Dang nhap thanh cong',
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
      { message: 'Dang nhap that bai. Vui long thu lai.', error: String(error) },
      { status: 500 },
    );
  }
}

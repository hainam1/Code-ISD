import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0[3-9][0-9]{8}$/;

function buildPlaceholderEmail() {
  return `temp-${randomUUID()}@smartguard.local`.slice(0, 255);
}

function buildPlaceholderPhone() {
  return `placeholder-${randomUUID().replace(/-/g, '').slice(0, 20)}`.slice(0, 32);
}

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
    const fullName = (body.fullName || '').trim();
    const identifier = (body.identifier || '').trim();
    const registerType = body.registerType === 'phone' ? 'phone' : 'email';
    const email = registerType === 'email' ? identifier.toLowerCase() : '';
    const phone = registerType === 'phone' ? identifier : '';
    const password = (body.password || '').trim();

    if (!fullName || !identifier || !password) {
      return NextResponse.json({ message: 'Vui lòng nhập đầy đủ thông tin.' }, { status: 400 });
    }

    if (registerType === 'email' && !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ message: 'Email không hợp lệ (ví dụ: abc@gmail.com).' }, { status: 400 });
    }

    if (registerType === 'phone' && !PHONE_REGEX.test(phone)) {
      return NextResponse.json({ message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu từ 03 đến 09.' }, { status: 400 });
    }

    if (password.length <= 6) {
      return NextResponse.json({ message: 'Mật khẩu phải lớn hơn 6 ký tự.' }, { status: 400 });
    }

    const supabase = createClient();

    // Check if user already exists
    const duplicateConditions = [];
    if (email) duplicateConditions.push(`email.eq.${email}`);
    if (phone) duplicateConditions.push(`phone.eq.${phone}`);

    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('id')
      .or(duplicateConditions.join(','))
      .limit(1);

    if (checkError) {
      console.error('Supabase query error:', checkError);
      return NextResponse.json({ message: 'Đã có lỗi xảy ra khi xác thực thông tin.' }, { status: 500 });
    }

    if (existingUsers && existingUsers.length > 0) {
       return NextResponse.json({ message: 'Email hoặc số điện thoại đã tồn tại.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Default placeholder values for missing properties to satisfy DB constraints if needed
    const placeholderEmail = email || buildPlaceholderEmail();
    const placeholderPhone = phone || buildPlaceholderPhone();

    const { data: user, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: randomUUID(),
          full_name: fullName,
          email: placeholderEmail,
          phone: placeholderPhone,
          role: 'CANDIDATE',
          password_hash: passwordHash,
        }
      ])
      .select()
      .single();

    if (insertError) {
       console.error('Supabase insert error:', insertError);
       return NextResponse.json({ message: 'Không thể thêm thư mục vào cơ sở dữ liệu.' }, { status: 500 });
    }

    return NextResponse.json(
      {
        message: 'Đăng ký thành công',
        user: {
          id: user.id,
          fullName: user.full_name,
          email: toPublicEmail(user.email),
          phone: toPublicPhone(user.phone),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Đăng ký thất bại. Vui lòng nhập lại thông tin.', error: String(error) },
      { status: 500 }
    );
  }
}

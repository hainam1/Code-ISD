import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0[3-9][0-9]{8}$/;

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

    const db = await getDb();
    const existed = db.data.users.some((user) => {
      if (registerType === 'email') return user.email === email;
      return user.phone === phone;
    });
    if (existed) {
      return NextResponse.json({ message: 'Email hoặc số điện thoại đã tồn tại.' }, { status: 409 });
    }

    const user = {
      id: randomUUID(),
      fullName,
      email,
      phone,
      role: 'USER',
      passwordHash: await bcrypt.hash(password, 10),
      createdAt: new Date().toISOString(),
    };

    db.data.users.push(user);
    await db.write();

    return NextResponse.json(
      {
        message: 'Đăng ký thành công',
        user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone },
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

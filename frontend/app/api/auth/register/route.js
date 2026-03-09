import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db/database';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;

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
      return NextResponse.json({ message: 'Vui long nhap day du thong tin.' }, { status: 400 });
    }

    if (registerType === 'email' && !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ message: 'Email khong hop le (vi du: abc@gmail.com).' }, { status: 400 });
    }

    if (registerType === 'phone' && !PHONE_REGEX.test(phone)) {
      return NextResponse.json({ message: 'So dien thoai khong hop le (10 chu so).' }, { status: 400 });
    }

    if (password.length <= 6) {
      return NextResponse.json({ message: 'Mat khau phai lon hon 6 ky tu.' }, { status: 400 });
    }

    const db = await getDb();
    const existed = db.data.users.some((user) => {
      if (registerType === 'email') return user.email === email;
      return user.phone === phone;
    });
    if (existed) {
      return NextResponse.json({ message: 'Email hoac so dien thoai da ton tai.' }, { status: 409 });
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
        message: 'Registration successful',
        user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Dang ky that bai. Vui long nhap lai thong tin.', error: String(error) },
      { status: 500 }
    );
  }
}

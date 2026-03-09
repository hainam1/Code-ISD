import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db/database';

export async function POST(request) {
  try {
    const body = await request.json();
    const fullName = (body.fullName || '').trim();
    const identifier = (body.identifier || '').trim();
    const registerType = body.registerType === 'phone' ? 'phone' : 'email';
    const password = (body.password || '').trim();
    const email = registerType === 'email' ? identifier.toLowerCase() : '';
    const phone = registerType === 'phone' ? identifier : '';

    if (!fullName || !identifier || !password) {
      return NextResponse.json(
        { message: 'Vui long nhap day du thong tin bat buoc.' },
        { status: 400 }
      );
    }

    if (registerType === 'email' && !email.includes('@')) {
      return NextResponse.json({ message: 'Email khong hop le.' }, { status: 400 });
    }

    if (registerType === 'phone' && !/^[0-9+]{8,15}$/.test(phone)) {
      return NextResponse.json({ message: 'So dien thoai khong hop le.' }, { status: 400 });
    }

    const db = await getDb();
    const exists = db.data.users.find((user) => {
      if (registerType === 'email') {
        return user.email === email;
      }
      return user.phone === phone;
    });

    if (exists) {
      return NextResponse.json({ message: 'Email hoac so dien thoai da ton tai.' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = {
      id: randomUUID(),
      fullName,
      email,
      phone: phone || '',
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    db.data.users.push(user);
    await db.write();

    return NextResponse.json(
      {
        user: { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json({ message: 'Khong the tao tai khoan.', error: String(error) }, { status: 500 });
  }
}

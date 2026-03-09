import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db/database';

export async function POST(request) {
  try {
    const body = await request.json();
    const identifier = (body.identifier || '').trim().toLowerCase();
    const password = (body.password || '').trim();

    if (!identifier || !password) {
      return NextResponse.json(
        { message: 'Thong tin dang nhap khong hop le.' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const user = db.data.users.find((item) => item.email === identifier || item.phone === identifier);

    if (!user) {
      return NextResponse.json({ message: 'Sai thong tin dang nhap.' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ message: 'Sai thong tin dang nhap.' }, { status: 401 });
    }

    return NextResponse.json({
      token: `user-${user.id}`,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: 'Dang nhap that bai.', error: String(error) },
      { status: 500 }
    );
  }
}

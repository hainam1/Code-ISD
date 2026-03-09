import { NextResponse } from 'next/server';
import { getDb } from '../../../lib/db/database';

export async function GET() {
  try {
    const db = await getDb();
    return NextResponse.json({ jobs: db.data.jobs });
  } catch (error) {
    return NextResponse.json(
      { message: 'Khong the tai danh sach cong viec.', error: String(error) },
      { status: 500 }
    );
  }
}

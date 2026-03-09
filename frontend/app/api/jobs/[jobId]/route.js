import { NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db/database';

export async function GET(_request, { params }) {
  try {
    const db = await getDb();
    const job = db.data.jobs.find((item) => item.id === params.jobId);

    if (!job) {
      return NextResponse.json({ message: 'Khong tim thay cong viec.' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json({ message: 'Khong the tai cong viec.', error: String(error) }, { status: 500 });
  }
}

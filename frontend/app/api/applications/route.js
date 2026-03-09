import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb } from '../../../lib/db/database';

export async function POST(request) {
  try {
    const body = await request.json();
    const fullName = (body.fullName || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const phone = (body.phone || '').trim();
    const note = (body.note || '').trim();
    const cvUrl = (body.cvUrl || '').trim();
    const resumeUrl = (body.resumeUrl || '').trim();
    const jobId = (body.jobId || '').trim();

    if (!fullName || !email || !phone || !jobId) {
      return NextResponse.json({ message: 'Vui long nhap day du thong tin ung tuyen.' }, { status: 400 });
    }

    const db = await getDb();
    const job = db.data.jobs.find((item) => item.id === jobId);
    if (!job) {
      return NextResponse.json({ message: 'Cong viec khong ton tai.' }, { status: 404 });
    }

    const application = {
      id: randomUUID(),
      fullName,
      email,
      phone,
      note,
      cvUrl,
      resumeUrl,
      jobId: job.id,
      createdAt: new Date().toISOString(),
    };
    db.data.applications.push(application);
    await db.write();

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Khong the gui don ung tuyen.', error: String(error) },
      { status: 500 }
    );
  }
}

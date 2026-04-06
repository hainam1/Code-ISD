import { NextResponse } from 'next/server';
import { getJobs } from '@/features/jobs/api/jobsApi';
import { createAdminJob } from '@/features/jobs/server/adminJobs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ jobs: await getJobs() });
  } catch (error) {
    return NextResponse.json(
      { message: 'Khong the tai danh sach cong viec.', error: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const company = String(body.company || '').trim();
    const location = String(body.location || '').trim();
    const address = String(body.address || '').trim();
    const status = String(body.status || '').trim();
    const minSalary = String(body.minSalary || '').trim();
    const maxSalary = String(body.maxSalary || '').trim();
    const quantity = String(body.quantity || '').trim();
    const experience = String(body.experience || '').trim();
    const description = String(body.description || '').trim();
    const scheduleType = String(body.scheduleType || '').trim();
    const workHours = String(body.workHours || '').trim();
    const dayOff = String(body.dayOff || '').trim();
    const workMode = String(body.workMode || '').trim();
    const requirements = Array.isArray(body.requirements)
      ? body.requirements.map((item) => String(item || '').trim()).filter(Boolean)
      : [];

    if (
      !title ||
      !company ||
      !location ||
      !address ||
      !minSalary ||
      !maxSalary ||
      !experience ||
      !description ||
      !workHours ||
      !workMode
    ) {
      return NextResponse.json({ message: 'Thieu thong tin bat buoc.' }, { status: 400 });
    }

    const job = await createAdminJob({
      title,
      company,
      location,
      address,
      minSalary,
      maxSalary,
      description,
      requirements,
      experience,
      quantity,
      status,
      workMode,
      scheduleType,
      workHours,
      dayOff,
    });

    return NextResponse.json({ message: 'Dang tuyen cong viec thanh cong.', job }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Khong the dang tuyen cong viec.', error: String(error) },
      { status: 500 },
    );
  }
}

import { NextResponse } from 'next/server';
import { getJobs } from '@/features/jobs/api/jobsApi';
import { createAdminJob } from '@/features/jobs/server/adminJobs';
import { getServerSession } from '@/lib/auth/serverSession';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ jobs: await getJobs() });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể tải danh sách công việc.', error: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession();

    if (session?.user?.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Bạn không có quyền đăng tuyển công việc.' }, { status: 403 });
    }

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
      return NextResponse.json({ message: 'Thiếu thông tin bắt buộc.' }, { status: 400 });
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

    return NextResponse.json({ message: 'Đăng tuyển công việc thành công.', job }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể đăng tuyển công việc.', error: String(error) },
      { status: 500 },
    );
  }
}

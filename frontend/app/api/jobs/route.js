import { NextResponse } from 'next/server';
import { createAdminJob } from '@/features/jobs/server/adminJobs';
import { buildJobSchedule, buildSalaryRange, JOB_STATUS } from '@/lib/constants/jobFormOptions';
import { getDb } from '@/lib/db/database';

export async function GET() {
  try {
    const db = await getDb();
    return NextResponse.json({ jobs: db.data.jobs });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể tải danh sách công việc.', error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const title = (body.title || '').trim();
    const company = (body.company || '').trim();
    const location = (body.location || '').trim();
    const status = (body.status || '').trim();
    const minSalary = (body.minSalary || '').trim();
    const maxSalary = (body.maxSalary || '').trim();
    const quantity = (body.quantity || '').trim();
    const experience = (body.experience || '').trim();
    const description = (body.description || '').trim();
    const scheduleType = (body.scheduleType || '').trim();
    const workHours = (body.workHours || '').trim();
    const dayOff = (body.dayOff || '').trim();
    const workMode = (body.workMode || '').trim();
    const requirements = Array.isArray(body.requirements)
      ? body.requirements.map((item) => String(item || '').trim()).filter(Boolean)
      : [];

    if (
      !title ||
      !company ||
      !location ||
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
      address: body.address?.trim() || location,
      salary: buildSalaryRange(minSalary, maxSalary),
      badge: status === JOB_STATUS.recruiting ? 'NEW' : '',
      description,
      requirements,
      experience,
      quantity,
      status,
      summary: {
        place: location,
        mode: workMode,
        postedAt: 'Vừa đăng',
      },
      schedule: buildJobSchedule({ scheduleType, workHours, dayOff, workMode }),
    });

    return NextResponse.json({ message: 'Đăng tuyển công việc thành công.', job }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể đăng tuyển công việc.', error: String(error) },
      { status: 500 }
    );
  }
}

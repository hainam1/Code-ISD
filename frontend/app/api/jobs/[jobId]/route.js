import { NextResponse } from 'next/server';
import { deleteAdminJobById, updateAdminJobById } from '@/features/jobs/server/adminJobs';
import { buildJobSchedule, buildSalaryRange } from '@/lib/constants/jobFormOptions';
import { getDb } from '@/lib/db/database';

export async function GET(_request, { params }) {
  try {
    const db = await getDb();
    const job = db.data.jobs.find((item) => item.id === params.jobId);

    if (!job) {
      return NextResponse.json({ message: 'Không tìm thấy công việc.' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể tải công việc.', error: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
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

    const job = await updateAdminJobById(params.jobId, {
      title,
      company,
      location,
      salary: buildSalaryRange(minSalary, maxSalary),
      description,
      experience,
      requirements,
      status,
      quantity,
      summary: {
        place: location,
        mode: workMode,
      },
      schedule: buildJobSchedule({ scheduleType, workHours, dayOff, workMode }),
    });

    if (!job) {
      return NextResponse.json({ message: 'Không tìm thấy công việc.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Cập nhật công việc thành công.', job });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể cập nhật công việc.', error: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const deleted = await deleteAdminJobById(params.jobId);

    if (!deleted) {
      return NextResponse.json({ message: 'Không tìm thấy công việc.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Xóa công việc thành công.' });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể xóa công việc.', error: String(error) },
      { status: 500 }
    );
  }
}

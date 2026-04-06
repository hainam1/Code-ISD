import { NextResponse } from 'next/server';
import { getJobById } from '@/features/jobs/api/jobsApi';
import { deleteAdminJobById, updateAdminJobById } from '@/features/jobs/server/adminJobs';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  try {
    const job = await getJobById(params.jobId);

    if (!job) {
      return NextResponse.json({ message: 'Khong tim thay cong viec.' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      { message: 'Khong the tai cong viec.', error: String(error) },
      { status: 500 },
    );
  }
}

export async function PATCH(request, { params }) {
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

    const job = await updateAdminJobById(params.jobId, {
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

    if (!job) {
      return NextResponse.json({ message: 'Khong tim thay cong viec.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Cap nhat cong viec thanh cong.', job });
  } catch (error) {
    return NextResponse.json(
      { message: 'Khong the cap nhat cong viec.', error: String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(_request, { params }) {
  try {
    const deleted = await deleteAdminJobById(params.jobId);

    if (!deleted) {
      return NextResponse.json({ message: 'Khong tim thay cong viec.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Xoa cong viec thanh cong.' });
  } catch (error) {
    return NextResponse.json(
      { message: 'Khong the xoa cong viec.', error: String(error) },
      { status: 500 },
    );
  }
}

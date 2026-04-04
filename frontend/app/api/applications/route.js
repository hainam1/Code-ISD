import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/database';
import { saveApplicationFile } from '../../../lib/files/applicationStorage';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);
const HEALTH_ALLOWED_MIME_TYPES = new Set([...ALLOWED_MIME_TYPES, 'image/png']);
const HEALTH_ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'png']);
const MAX_CV_SIZE = 5 * 1024 * 1024;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^0[3-9][0-9]{8}$/;

function getExt(filename = '') {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
}

export async function GET(request) {
  try {
    const candidateId = new URL(request.url).searchParams.get('candidateId')?.trim() || '';

    if (!candidateId) {
      return NextResponse.json({ message: 'Thiếu mã ứng viên.' }, { status: 400 });
    }

    const db = await getDb();
    const applications = db.data.applications
      .filter((item) => item.candidateId === candidateId)
      .map((item) => {
        const job = db.data.jobs.find((jobItem) => jobItem.id === item.jobId);

        return {
          ...item,
          job: job
            ? {
                id: job.id,
                title: job.title,
                company: job.company,
                location: job.location,
                salary: job.salary,
              }
            : null,
        };
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    return NextResponse.json({ applications });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể tải hồ sơ ứng tuyển.', error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const fullName = String(formData.get('fullName') || '').trim();
    const identifier = String(formData.get('identifier') || '').trim();
    const contactType = String(formData.get('contactType') || 'email').trim() === 'phone' ? 'phone' : 'email';
    const email = contactType === 'email' ? identifier.toLowerCase() : '';
    const phone = contactType === 'phone' ? identifier : '';
    const note = String(formData.get('note') || '').trim();
    const jobId = String(formData.get('jobId') || '').trim();
    const candidateId = String(formData.get('candidateId') || '').trim();
    const cv = formData.get('cv');
    const healthFile = formData.get('healthFile');

    if (!jobId) {
      return NextResponse.json(
        { message: 'Vui lòng chọn vị trí tuyển dụng trước khi nộp hồ sơ.' },
        { status: 400 }
      );
    }

    if (!fullName || !identifier || !candidateId) {
      return NextResponse.json({ message: 'Vui lòng nhập đầy đủ thông tin ứng tuyển.' }, { status: 400 });
    }
    if (contactType === 'email' && !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ message: 'Email không hợp lệ.' }, { status: 400 });
    }
    if (contactType === 'phone' && !PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu từ 03 đến 09.' },
        { status: 400 }
      );
    }

    if (!cv || typeof cv === 'string') {
      return NextResponse.json({ message: 'Chưa tải lên CV.' }, { status: 400 });
    }
    if (!healthFile || typeof healthFile === 'string') {
      return NextResponse.json({ message: 'Chưa tải lên hồ sơ sức khỏe.' }, { status: 400 });
    }

    const fileName = cv.name || '';
    const fileMime = cv.type || '';
    const fileExt = getExt(fileName);
    if (!ALLOWED_MIME_TYPES.has(fileMime) && !ALLOWED_EXTENSIONS.has(fileExt)) {
      return NextResponse.json(
        { message: 'Hệ thống chỉ chấp nhận file CV định dạng PDF, DOC hoặc DOCX.' },
        { status: 400 }
      );
    }

    if (cv.size > MAX_CV_SIZE) {
      return NextResponse.json({ message: 'Kích thước file CV không vượt quá 5MB.' }, { status: 400 });
    }

    const healthName = healthFile.name || '';
    const healthMime = healthFile.type || '';
    const healthExt = getExt(healthName);
    if (!HEALTH_ALLOWED_MIME_TYPES.has(healthMime) && !HEALTH_ALLOWED_EXTENSIONS.has(healthExt)) {
      return NextResponse.json(
        { message: 'Hồ sơ sức khỏe chỉ chấp nhận PDF, DOC, DOCX hoặc PNG.' },
        { status: 400 }
      );
    }
    if (healthFile.size > MAX_CV_SIZE) {
      return NextResponse.json(
        { message: 'Kích thước hồ sơ sức khỏe không vượt quá 5MB.' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const job = db.data.jobs.find((item) => item.id === jobId);
    if (!job) {
      return NextResponse.json({ message: 'Công việc không tồn tại.' }, { status: 404 });
    }

    const candidate = db.data.users.find((user) => user.id === candidateId);
    if (!candidate) {
      return NextResponse.json({ message: 'Không tìm thấy tài khoản ứng viên.' }, { status: 401 });
    }

    const duplicated = db.data.applications.some(
      (item) => item.candidateId === candidateId && item.jobId === jobId
    );
    if (duplicated) {
      return NextResponse.json({ message: 'Bạn đã ứng tuyển vị trí này rồi.' }, { status: 409 });
    }

    const applicationId = randomUUID();
    const savedCvFile = await saveApplicationFile({
      applicationId,
      fieldName: 'cv',
      file: cv,
    });
    const savedHealthFile = await saveApplicationFile({
      applicationId,
      fieldName: 'health',
      file: healthFile,
    });

    const now = new Date().toISOString();
    const application = {
      id: applicationId,
      candidateId,
      jobId: job.id,
      fullName,
      email,
      phone,
      note,
      cvFile: savedCvFile,
      healthFile: savedHealthFile,
      status: 'Under Review',
      createdAt: now,
      updatedAt: now,
    };
    db.data.applications.push(application);
    await db.write();

    return NextResponse.json(
      {
        message: 'Nộp hồ sơ thành công.',
        application,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể gửi đơn ứng tuyển.', error: String(error) },
      { status: 500 }
    );
  }
}

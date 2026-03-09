import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { getDb } from '../../../lib/db/database';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx']);
const HEALTH_ALLOWED_MIME_TYPES = new Set([
  ...ALLOWED_MIME_TYPES,
  'image/png',
]);
const HEALTH_ALLOWED_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'png']);
const MAX_CV_SIZE = 5 * 1024 * 1024;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\d{10}$/;

function getExt(filename = '') {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
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
      return NextResponse.json({ message: 'Vui long chon vi tri tuyen dung truoc khi nop ho so.' }, { status: 400 });
    }

    if (!fullName || !identifier || !candidateId) {
      return NextResponse.json({ message: 'Vui long nhap day du thong tin ung tuyen.' }, { status: 400 });
    }
    if (contactType === 'email' && !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ message: 'Email khong hop le.' }, { status: 400 });
    }
    if (contactType === 'phone' && !PHONE_REGEX.test(phone)) {
      return NextResponse.json({ message: 'So dien thoai khong hop le (10 chu so).' }, { status: 400 });
    }

    if (!cv || typeof cv === 'string') {
      return NextResponse.json({ message: 'Chua tai len CV' }, { status: 400 });
    }
    if (!healthFile || typeof healthFile === 'string') {
      return NextResponse.json({ message: 'Chua tai len ho so suc khoe' }, { status: 400 });
    }

    const fileName = cv.name || '';
    const fileMime = cv.type || '';
    const fileExt = getExt(fileName);
    if (!ALLOWED_MIME_TYPES.has(fileMime) && !ALLOWED_EXTENSIONS.has(fileExt)) {
      return NextResponse.json({ message: 'He thong chi chap nhan file CV dinh dang PDF, DOC hoac DOCX.' }, { status: 400 });
    }

    if (cv.size > MAX_CV_SIZE) {
      return NextResponse.json({ message: 'Kich thuoc file CV khong vuot qua 5MB.' }, { status: 400 });
    }

    const healthName = healthFile.name || '';
    const healthMime = healthFile.type || '';
    const healthExt = getExt(healthName);
    if (!HEALTH_ALLOWED_MIME_TYPES.has(healthMime) && !HEALTH_ALLOWED_EXTENSIONS.has(healthExt)) {
      return NextResponse.json({ message: 'Ho so suc khoe chi chap nhan PDF, DOC, DOCX hoac PNG.' }, { status: 400 });
    }
    if (healthFile.size > MAX_CV_SIZE) {
      return NextResponse.json({ message: 'Kich thuoc ho so suc khoe khong vuot qua 5MB.' }, { status: 400 });
    }

    const db = await getDb();
    const job = db.data.jobs.find((item) => item.id === jobId);
    if (!job) {
      return NextResponse.json({ message: 'Cong viec khong ton tai.' }, { status: 404 });
    }

    const candidate = db.data.users.find((user) => user.id === candidateId);
    if (!candidate) {
      return NextResponse.json({ message: 'Khong tim thay tai khoan ung vien.' }, { status: 401 });
    }

    const duplicated = db.data.applications.some(
      (item) => item.candidateId === candidateId && item.jobId === jobId
    );
    if (duplicated) {
      return NextResponse.json({ message: 'Ban da ung tuyen vi tri nay roi.' }, { status: 409 });
    }

    const application = {
      id: randomUUID(),
      candidateId,
      jobId: job.id,
      fullName,
      email,
      phone,
      note,
      cvFile: {
        fileName,
        mimeType: fileMime,
        size: cv.size,
      },
      healthFile: {
        fileName: healthName,
        mimeType: healthMime,
        size: healthFile.size,
      },
      status: 'Under Review',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.data.applications.push(application);
    await db.write();

    return NextResponse.json(
      {
        message: 'Application submitted successfully',
        application,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Khong the gui don ung tuyen.', error: String(error) },
      { status: 500 }
    );
  }
}

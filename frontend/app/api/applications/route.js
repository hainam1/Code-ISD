import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
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

    const supabase = createClient();
    const { data: rawApps, error } = await supabase
      .from('applications')
      .select('*, jobs(*)')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const applications = rawApps.map(item => ({
      id: item.id,
      candidateId: item.candidate_id,
      jobId: item.job_id,
      fullName: item.candidate_full_name,
      email: item.candidate_email,
      phone: item.candidate_phone,
      note: item.note,
      cvFile: { fileName: item.cv_original_name, mimeType: item.cv_mime_type, size: item.cv_size, storedFileName: item.cv_path, relativePath: item.cv_path },
      healthFile: item.health_path ? { fileName: item.health_original_name, mimeType: item.health_mime_type, size: item.health_size, storedFileName: item.health_path, relativePath: item.health_path } : null,
      status: item.status,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      job: item.jobs ? {
        id: item.jobs.id,
        title: item.jobs.title,
        company: item.jobs.company_name,
        location: item.jobs.location,
        salary: item.jobs.salary_max !== null ? `${item.jobs.salary_min} - ${item.jobs.salary_max}` : 'Thỏa thuận',
      } : null
    }));

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

    const supabase = createClient();
    
    // Check if job exists
    const { data: job, error: jobError } = await supabase.from('jobs').select('id').eq('id', jobId).single();
    if (jobError || !job) {
      return NextResponse.json({ message: 'Công việc không tồn tại.' }, { status: 404 });
    }

    // Check if user exists
    const { data: candidate, error: candidateError } = await supabase.from('users').select('id').eq('id', candidateId).single();
    if (candidateError || !candidate) {
      return NextResponse.json({ message: 'Không tìm thấy tài khoản ứng viên.' }, { status: 401 });
    }

    // Check if duplicated
    const { data: duplicated } = await supabase
      .from('applications')
      .select('id')
      .eq('candidate_id', candidateId)
      .eq('job_id', jobId)
      .limit(1)
      .single();

    if (duplicated) {
      return NextResponse.json({ message: 'Bạn đã ứng tuyển vị trí này rồi.' }, { status: 409 });
    }

    // Since we don't have Supabase storage setup right now, we keep the original save file logic
    const { randomUUID } = await import('node:crypto');
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
    
    const payload = {
      id: applicationId,
      candidate_id: candidateId,
      job_id: jobId,
      candidate_full_name: fullName,
      candidate_email: email || null,
      candidate_phone: phone || null,
      note: note || null,
      cv_original_name: savedCvFile.fileName,
      cv_mime_type: savedCvFile.mimeType,
      cv_size: savedCvFile.size,
      cv_path: savedCvFile.relativePath,
      health_original_name: savedHealthFile.fileName,
      health_mime_type: savedHealthFile.mimeType,
      health_size: savedHealthFile.size,
      health_path: savedHealthFile.relativePath,
      status: 'Under Review',
      status_history: [
        {
          status: 'Under Review',
          updatedAt: now,
          updatedBy: candidateId,
        },
      ],
      created_at: now,
      updated_at: now
    };

    const { error: insertError } = await supabase.from('applications').insert([payload]);
    
    if (insertError) {
      throw insertError;
    }

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

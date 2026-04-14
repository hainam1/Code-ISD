import { NextResponse } from 'next/server';
import { getAdminCandidateById, updateAdminCandidateById } from '@/features/candidates/server/adminCandidates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_request, { params }) {
  try {
    const candidate = await getAdminCandidateById(params.candidateId);

    if (!candidate) {
      return NextResponse.json({ message: 'Không tìm thấy ứng viên.' }, { status: 404 });
    }

    return NextResponse.json(
      { candidate },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể tải thông tin ứng viên.', error: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const body = await request.json().catch(() => ({}));
    const candidate = await updateAdminCandidateById(params.candidateId, body || {});

    if (!candidate) {
      return NextResponse.json({ message: 'Không tìm thấy ứng viên.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Cập nhật ứng viên thành công.', candidate });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể cập nhật ứng viên.', error: String(error) },
      { status: 500 }
    );
  }
}

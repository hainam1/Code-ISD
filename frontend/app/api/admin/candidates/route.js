import { NextResponse } from 'next/server';
import { listAdminCandidates } from '@/features/candidates/server/adminCandidates';

export async function GET() {
  try {
    const candidates = await listAdminCandidates();
    return NextResponse.json({ candidates });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể tải danh sách ứng viên.', error: String(error) },
      { status: 500 }
    );
  }
}

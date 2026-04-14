import { NextResponse } from 'next/server';
import { listAdminHistory } from '@/features/candidates/server/adminCandidates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const candidates = await listAdminHistory();
    return NextResponse.json(
      { candidates },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate' } }
    );
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể tải lịch sử ứng viên.', error: String(error) },
      { status: 500 }
    );
  }
}

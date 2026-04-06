import { NextResponse } from 'next/server';
import { getCandidateInterview, upsertCandidateInterview } from '@/features/interviews/server/adminInterviews';

export async function GET(_request, { params }) {
  try {
    const interview = await getCandidateInterview(params.candidateId);
    return NextResponse.json({ interview });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể tải lịch phỏng vấn.', error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    const body = await request.json();
    const interview = await upsertCandidateInterview({
      candidateId: params.candidateId,
      interviewDate: body.interviewDate,
      interviewTime: body.interviewTime,
      location: body.location,
      scheduledBy: body.scheduledBy,
    });

    return NextResponse.json({
      message: 'Lưu lịch phỏng vấn thành công.',
      interview,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể lưu lịch phỏng vấn.';
    return NextResponse.json({ message, error: String(error) }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createInterviewNotification, listUserNotifications } from '@/shared/utils/notifications';

export async function GET(request) {
  try {
    const userId = (new URL(request.url).searchParams.get('userId') || '').trim();

    if (!userId) {
      return NextResponse.json({ message: 'Thiếu userId.' }, { status: 400 });
    }

    const notifications = await listUserNotifications(userId);
    return NextResponse.json({ notifications });
  } catch (error) {
    return NextResponse.json({ message: 'Không thể tải thông báo.', error: String(error) }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const normalizedBody = {
      userId: String(body.userId || body.candidateId || '').trim(),
      candidateId: String(body.candidateId || body.userId || '').trim(),
      candidateName: String(body.candidateName || '').trim(),
      position: String(body.position || '').trim(),
      interviewDate: String(body.interviewDate || '').trim(),
      interviewTime: String(body.interviewTime || '').trim(),
      location: String(body.location || '').trim(),
      interviewId: String(body.interviewId || '').trim(),
    };
    const required = [
      normalizedBody.userId,
      normalizedBody.candidateName,
      normalizedBody.position,
      normalizedBody.interviewDate,
      normalizedBody.interviewTime,
      normalizedBody.location,
      normalizedBody.interviewId,
    ];

    if (required.some((item) => !item)) {
      return NextResponse.json({ message: 'Thiếu thông tin thông báo.' }, { status: 400 });
    }

    const { notification, created } = await createInterviewNotification(normalizedBody);
    return NextResponse.json(
      {
        message: created ? 'Gửi thông báo thành công.' : 'Thông báo lịch phỏng vấn đã tồn tại.',
        notification,
      },
      { status: created ? 201 : 200 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Không thể gửi thông báo.';
    return NextResponse.json({ message, error: String(error) }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { markNotificationAsRead } from '@/shared/utils/notifications';

export async function PATCH(request, { params }) {
  try {
    const body = await request.json();
    const userId = body.userId || '';

    if (!userId) {
      return NextResponse.json({ message: 'Thiếu userId.' }, { status: 400 });
    }

    const notification = await markNotificationAsRead(params.notificationId, userId);

    if (!notification) {
      return NextResponse.json({ message: 'Không tìm thấy thông báo.' }, { status: 404 });
    }

    return NextResponse.json({ notification });
  } catch (error) {
    return NextResponse.json({ message: 'Không thể cập nhật thông báo.', error: String(error) }, { status: 500 });
  }
}

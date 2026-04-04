import { NextResponse } from 'next/server';
import { getChatThread, listChatThreads, sendChatMessage } from '@/shared/utils/chat';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const viewerId = searchParams.get('viewerId') || '';
    const viewerRole = searchParams.get('viewerRole') || '';
    const threadId = searchParams.get('threadId') || '';

    if (!viewerId || !viewerRole) {
      return NextResponse.json({ message: 'Thiếu thông tin người dùng.' }, { status: 400 });
    }

    const activeThread = threadId
      ? await getChatThread({ threadId, viewerId, viewerRole })
      : null;
    const threads = await listChatThreads({ viewerId, viewerRole });

    return NextResponse.json({ threads, activeThread });
  } catch (error) {
    return NextResponse.json(
      { message: 'Không thể tải dữ liệu chat.', error: String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = await sendChatMessage({
      senderId: body.senderId,
      senderRole: body.senderRole,
      candidateId: body.candidateId,
      threadId: body.threadId,
      content: body.content,
    });

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Không thể gửi tin nhắn.' },
      { status: 400 },
    );
  }
}

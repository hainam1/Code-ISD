import 'server-only';
import { cookies } from 'next/headers';
import { decodeSessionCookie, SESSION_COOKIE_NAME } from '@/lib/auth/session';

export async function getServerSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value || '';
  return decodeSessionCookie(sessionCookie);
}

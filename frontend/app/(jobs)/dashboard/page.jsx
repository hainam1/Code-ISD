'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_ROUTES } from '@/lib/constants/routes';
import { getSession } from '@/features/auth/api/authApi';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    const session = getSession();
    const nextRoute = session?.user?.role === 'ADMIN' ? ADMIN_ROUTES.candidates : '/jobs';
    router.replace(nextRoute);
  }, [router]);

  return null;
}

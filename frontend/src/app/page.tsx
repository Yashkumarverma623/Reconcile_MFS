'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('reconcile_token');
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#1f2328] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}

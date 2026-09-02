'use client';

import React from 'react';
import { Sidebar } from '../../components/layout/Sidebar';
import { Navbar } from '../../components/layout/Navbar';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f6f8fa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-[#1f2328] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#57606a] font-mono">Initializing Analyst Workbench...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return null;
  }

  return (
    <div className="flex min-h-screen bg-[#f6f8fa] text-[#1f2328]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

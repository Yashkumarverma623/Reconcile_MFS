'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GitCompare,
  AlertTriangle,
  Database,
  UploadCloud,
  BarChart3,
  Settings,
  Search,
  Activity,
  Layers,
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Reconciliations', href: '/reconciliations', icon: GitCompare },
  { name: 'Exceptions Queue', href: '/exceptions', icon: AlertTriangle },
  { name: 'Data Sources', href: '/data-sources', icon: Database },
  { name: 'Dataset Imports', href: '/imports', icon: UploadCloud },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings & Audit', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 wb-sidebar flex flex-col shrink-0 min-h-screen text-[#1f2328]">
      {/* Workbench Identity Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-[#d0d7de] bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#1f2328] rounded flex items-center justify-center text-white font-mono text-xs font-bold tracking-tighter">
            REC
          </div>
          <div>
            <span className="font-bold text-sm text-[#1f2328] tracking-tight block leading-tight">
              RECONCILE
            </span>
            <span className="text-[10px] font-mono text-[#57606a] block leading-tight uppercase">
              Ops Workbench
            </span>
          </div>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Engine Active" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        <div className="px-2 pb-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-[#57606a]">
          Investigation & Data
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-2.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
                isActive
                  ? 'bg-white text-[#1f2328] font-semibold border border-[#d0d7de] shadow-xs'
                  : 'text-[#57606a] hover:text-[#1f2328] hover:bg-[#eaeef2]'
              )}
            >
              <Icon className={clsx('w-4 h-4', isActive ? 'text-[#1f2328]' : 'text-[#6e7781]')} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Operational Status Bar */}
      <div className="p-3 border-t border-[#d0d7de] bg-white">
        <div className="text-[11px] space-y-1">
          <div className="flex items-center justify-between text-[#57606a]">
            <span>Matching Engine</span>
            <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 rounded">
              ONLINE
            </span>
          </div>
          <div className="flex items-center justify-between text-[#57606a]">
            <span>Queue Consumer</span>
            <span className="font-mono text-[10px] text-[#24292f]">BullMQ #1</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

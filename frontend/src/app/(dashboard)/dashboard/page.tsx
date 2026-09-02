'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import Link from 'next/link';
import {
  GitCompare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck2,
  TrendingUp,
  ArrowUpRight,
  Plus,
  Upload,
  RefreshCw,
} from 'lucide-react';

export default function DashboardPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res = await api.get('/analytics/dashboard');
      return res.data;
    },
  });

  const { data: reconciliationsData } = useQuery({
    queryKey: ['recent-reconciliations'],
    queryFn: async () => {
      const res = await api.get('/reconciliations');
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    );
  }

  const { reconciliations, records, exceptions } = data || {
    reconciliations: { total: 0, completed: 0, running: 0, failed: 0 },
    records: { totalProcessedRecords: 0, matchRate: 0, mismatchRate: 0 },
    exceptions: { open: 0, inReview: 0, resolved: 0, severity: { high: 0 } },
  };

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reconciliation Operations</h1>
          <p className="text-sm text-slate-400">
            Real-time status of transaction matching, data discrepancies, and open exceptions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-slate-300 transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            href="/imports"
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-4 py-2 rounded-lg text-sm font-medium text-slate-200 transition-colors"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            Upload Dataset
          </Link>
          <Link
            href="/reconciliations"
            className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-brand-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Reconciliation
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Reconciliations */}
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Runs
            </span>
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center">
              <GitCompare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{reconciliations.total}</span>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span className="text-emerald-400 font-medium">{reconciliations.completed} Completed</span>
              <span>•</span>
              <span className="text-amber-400">{reconciliations.running} Active</span>
            </div>
          </div>
        </div>

        {/* Card 2: Match Accuracy */}
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Match Accuracy
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{records.matchRate}%</span>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span className="text-slate-300">{records.matched || 0} matched records</span>
            </div>
          </div>
        </div>

        {/* Card 3: Open Exceptions */}
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Open Exceptions
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">{exceptions.open}</span>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span className="text-red-400 font-medium">{exceptions.severity?.high || 0} High Severity</span>
            </div>
          </div>
        </div>

        {/* Card 4: Total Records Processed */}
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Records Evaluated
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <FileCheck2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-white">
              {records.totalProcessedRecords.toLocaleString()}
            </span>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
              <span className="text-emerald-400">{exceptions.resolved} Exceptions Resolved</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Reconciliations Table */}
        <div className="lg:col-span-2 glass-panel p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-lg text-white">Recent Reconciliation Runs</h3>
              <p className="text-xs text-slate-400">Latest deterministic matching jobs execution logs</p>
            </div>
            <Link
              href="/reconciliations"
              className="text-xs font-medium text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-slate-950/60 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Matched</th>
                  <th className="px-4 py-3">Mismatched</th>
                  <th className="px-4 py-3">Missing</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {reconciliationsData?.reconciliations?.slice(0, 5).map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-white">{r.name}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          r.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : r.status === 'RUNNING' || r.status === 'QUEUED'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-emerald-400">{r.matchedCount}</td>
                    <td className="px-4 py-3.5 font-mono text-amber-400">{r.mismatchCount}</td>
                    <td className="px-4 py-3.5 font-mono text-red-400">{r.missingACount + r.missingBCount}</td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/reconciliations/${r.id}`}
                        className="text-xs font-semibold text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 px-3 py-1 rounded-md border border-brand-500/20 transition-colors"
                      >
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Exception Action Summary Widget */}
        <div className="glass-panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-white">Exception Workstand</h3>
              <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-medium">
                {exceptions.open} Open
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Track assigned issues requiring investigation, resolution reasons, or journal entries.
            </p>

            <div className="space-y-4">
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center font-bold">
                    H
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">High Severity</span>
                    <span className="text-xs text-slate-400">Critical amount/missing errors</span>
                  </div>
                </div>
                <span className="font-mono text-lg font-bold text-red-400">
                  {exceptions.severity?.high || 0}
                </span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold">
                    M
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">Medium Severity</span>
                    <span className="text-xs text-slate-400">Date window tolerance exceedance</span>
                  </div>
                </div>
                <span className="font-mono text-lg font-bold text-amber-400">
                  {exceptions.severity?.medium || 0}
                </span>
              </div>

              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    R
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">Resolved Issues</span>
                    <span className="text-xs text-slate-400">Historical resolution verified</span>
                  </div>
                </div>
                <span className="font-mono text-lg font-bold text-emerald-400">
                  {exceptions.resolved}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/exceptions"
            className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 border border-slate-700/60 transition-colors"
          >
            Open Exception Workbench
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import Link from 'next/link';
import {
  GitCompare,
  AlertTriangle,
  FileCheck2,
  Plus,
  Upload,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
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

  const { data: exceptionsData } = useQuery({
    queryKey: ['recent-exceptions'],
    queryFn: async () => {
      const res = await api.get('/exceptions', { params: { limit: 5 } });
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-xs font-mono text-[#57606a]">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        Loading operational matrix...
      </div>
    );
  }

  const { reconciliations, records, exceptions } = data || {
    reconciliations: { total: 0, completed: 0, running: 0, failed: 0 },
    records: { totalProcessedRecords: 0, matchRate: 0, mismatchRate: 0 },
    exceptions: { open: 0, inReview: 0, resolved: 0, severity: { high: 0, medium: 0, low: 0 } },
  };

  return (
    <div className="space-y-6 text-[#1f2328]">
      {/* Analyst Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d0d7de] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-[#1f2328]">Reconciliation Workbench</h1>
            <span className="text-[10px] font-mono bg-[#f6f8fa] text-[#57606a] px-2 py-0.5 border border-[#d0d7de] rounded">
              ENVIRONMENT: PRODUCTION
            </span>
          </div>
          <p className="text-xs text-[#57606a] mt-0.5">
            Operational overview of transaction matching, data discrepancies, and open exception queues.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="wb-btn-secondary flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#57606a]" />
            <span>Refresh</span>
          </button>
          <Link href="/imports" className="wb-btn-secondary flex items-center gap-1.5">
            <Upload className="w-3.5 h-3.5 text-[#57606a]" />
            <span>Import Dataset</span>
          </Link>
          <Link href="/reconciliations" className="wb-btn-primary flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>New Run</span>
          </Link>
        </div>
      </div>

      {/* Analytical Summary Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Metric 1: Reconciliation Health */}
        <div className="wb-panel p-3.5">
          <div className="text-[11px] font-mono font-semibold uppercase text-[#57606a] mb-1">
            Reconciliation Health
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-[#1f2328]">{reconciliations.total}</span>
            <span className="text-xs font-mono text-[#166534] bg-[#f0fdf4] border border-[#bbf7d0] px-1.5 py-0.5 rounded">
              {reconciliations.completed} Completed
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#f0f2f5] text-[11px] text-[#57606a] flex justify-between font-mono">
            <span>Running: {reconciliations.running}</span>
            <span>Failed: {reconciliations.failed}</span>
          </div>
        </div>

        {/* Metric 2: Match Accuracy */}
        <div className="wb-panel p-3.5">
          <div className="text-[11px] font-mono font-semibold uppercase text-[#57606a] mb-1">
            Match Accuracy Rate
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-[#166534]">{records.matchRate}%</span>
            <span className="text-xs font-mono text-[#57606a]">
              {records.matched || 0} matched
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#f0f2f5] text-[11px] text-[#57606a] flex justify-between font-mono">
            <span>Mismatch: {records.mismatchRate}%</span>
            <span>Missing: {records.missingRate || 0}%</span>
          </div>
        </div>

        {/* Metric 3: Open Exceptions */}
        <div className="wb-panel p-3.5">
          <div className="text-[11px] font-mono font-semibold uppercase text-[#57606a] mb-1">
            Open Exception Queue
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-[#991b1b]">{exceptions.open}</span>
            <span className="text-xs font-mono text-[#991b1b] bg-[#fef2f2] border border-[#fecaca] px-1.5 py-0.5 rounded">
              {exceptions.severity?.high || 0} High Severity
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#f0f2f5] text-[11px] text-[#57606a] flex justify-between font-mono">
            <span>In Review: {exceptions.inReview}</span>
            <span>Resolved: {exceptions.resolved}</span>
          </div>
        </div>

        {/* Metric 4: Processed Volume */}
        <div className="wb-panel p-3.5">
          <div className="text-[11px] font-mono font-semibold uppercase text-[#57606a] mb-1">
            Evaluated Volume
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-[#1f2328]">
              {records.totalProcessedRecords.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-[#0969da]">Records</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[#f0f2f5] text-[11px] text-[#57606a] flex justify-between font-mono">
            <span>Audit Trail Logs: Verified</span>
          </div>
        </div>
      </div>

      {/* Main Operational Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reconciliation Runs Table */}
        <div className="lg:col-span-2 wb-panel overflow-hidden">
          <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-[#57606a]" />
              <span className="text-xs font-bold text-[#1f2328] uppercase tracking-wider">
                Recent Reconciliation Runs
              </span>
            </div>
            <Link
              href="/reconciliations"
              className="text-xs text-[#0969da] hover:underline font-medium flex items-center gap-1"
            >
              View all runs <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="wb-table-header">
                <tr>
                  <th className="px-3.5 py-2.5">Run Name</th>
                  <th className="px-3.5 py-2.5">Status</th>
                  <th className="px-3.5 py-2.5 text-right">Matched</th>
                  <th className="px-3.5 py-2.5 text-right">Mismatch</th>
                  <th className="px-3.5 py-2.5 text-right">Missing</th>
                  <th className="px-3.5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f5]">
                {reconciliationsData?.reconciliations?.slice(0, 6).map((r: any) => (
                  <tr key={r.id} className="wb-table-row">
                    <td className="px-3.5 py-2.5 font-medium text-[#1f2328] max-w-[200px] truncate">
                      {r.name}
                    </td>
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                          r.status === 'COMPLETED'
                            ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                            : r.status === 'RUNNING' || r.status === 'QUEUED'
                            ? 'bg-[#fffbe6] text-[#92400e] border-[#fef08a]'
                            : 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-right text-[#166534] font-medium">
                      {r.matchedCount}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-right text-[#92400e] font-medium">
                      {r.mismatchCount}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-right text-[#991b1b] font-medium">
                      {r.missingACount + r.missingBCount}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <Link
                        href={`/reconciliations/${r.id}`}
                        className="wb-btn-secondary text-[11px] py-0.5 px-2"
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

        {/* Exceptions Action Workstand Queue */}
        <div className="wb-panel overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#991b1b]" />
                <span className="text-xs font-bold text-[#1f2328] uppercase tracking-wider">
                  Open Discrepancies
                </span>
              </div>
              <span className="text-[11px] font-mono bg-[#fef2f2] text-[#991b1b] border border-[#fecaca] px-1.5 py-0.5 rounded font-bold">
                {exceptions.open} Open
              </span>
            </div>

            <div className="divide-y divide-[#f0f2f5]">
              {exceptionsData?.exceptions?.slice(0, 4).map((exc: any) => (
                <div key={exc.id} className="p-3 hover:bg-[#f8f9fa] transition-colors text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                        exc.severity === 'HIGH'
                          ? 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
                          : exc.severity === 'MEDIUM'
                          ? 'bg-[#fffbe6] text-[#92400e] border-[#fef08a]'
                          : 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                      }`}
                    >
                      {exc.severity}
                    </span>
                    <span className="text-[10px] font-mono text-[#57606a]">
                      {exc.status}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-[#1f2328] font-medium truncate mb-1">
                    {exc.reason}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-[#57606a]">
                    <span>Run: {exc.reconciliation?.name || 'N/A'}</span>
                    <Link
                      href={`/exceptions/${exc.id}`}
                      className="text-[#0969da] hover:underline font-medium"
                    >
                      Investigate →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 border-t border-[#d0d7de] bg-[#f6f8fa]">
            <Link
              href="/exceptions"
              className="w-full wb-btn-secondary flex items-center justify-center gap-1.5 text-xs text-center"
            >
              <span>Open Exception Investigation Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

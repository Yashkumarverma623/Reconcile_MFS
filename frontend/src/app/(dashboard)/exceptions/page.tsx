'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import Link from 'next/link';
import { AlertTriangle, Filter, Search, ChevronLeft, ChevronRight, User, RefreshCw } from 'lucide-react';

export default function ExceptionsListPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['exceptions-list', statusFilter, severityFilter, assigneeFilter, search, page],
    queryFn: async () => {
      const res = await api.get('/exceptions', {
        params: {
          status: statusFilter || undefined,
          severity: severityFilter || undefined,
          assignedToId: assigneeFilter || undefined,
          search: search || undefined,
          page,
          limit: 15,
        },
      });
      return res.data;
    },
  });

  const { data: membersData } = useQuery({
    queryKey: ['org-members-select'],
    queryFn: async () => {
      const res = await api.get('/organizations/members');
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Exception Management</h1>
          <p className="text-sm text-slate-400">
            Investigate transaction discrepancies, assign ownership, and log historical resolutions.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-2 rounded-lg text-xs text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="RESOLVED">Resolved</option>
            <option value="IGNORED">Ignored</option>
          </select>

          {/* Severity Select */}
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Severities</option>
            <option value="HIGH">High Severity</option>
            <option value="MEDIUM">Medium Severity</option>
            <option value="LOW">Low Severity</option>
          </select>

          {/* Assignee Select */}
          <select
            value={assigneeFilter}
            onChange={(e) => {
              setAssigneeFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {membersData?.members?.map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reasons, IDs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Exception Table */}
      <div className="glass-panel overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading exceptions...</div>
        ) : data?.exceptions?.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No exceptions found matching filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Severity</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Reconciliation Job</th>
                  <th className="px-5 py-3.5">Discrepancy Reason</th>
                  <th className="px-5 py-3.5">Assigned To</th>
                  <th className="px-5 py-3.5">Age</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {data?.exceptions?.map((exc: any) => {
                  const ageDays = Math.floor(
                    (new Date().getTime() - new Date(exc.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                  );

                  return (
                    <tr key={exc.id} className="hover:bg-slate-800/40 transition-colors text-xs">
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                            exc.severity === 'HIGH'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : exc.severity === 'MEDIUM'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {exc.severity}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-semibold ${
                            exc.status === 'RESOLVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : exc.status === 'IN_REVIEW'
                              ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                              : exc.status === 'OPEN'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {exc.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-medium text-white max-w-xs truncate">
                        {exc.reconciliation?.name}
                      </td>
                      <td className="px-5 py-4 max-w-sm truncate text-slate-300 font-mono text-[11px]">
                        {exc.reason}
                      </td>
                      <td className="px-5 py-4 text-slate-300">
                        {exc.assignedTo ? (
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-sky-400" />
                            {exc.assignedTo.name}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-400 font-mono">
                        {ageDays === 0 ? 'Today' : `${ageDays}d ago`}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/exceptions/${exc.id}`}
                          className="text-xs font-semibold text-brand-400 hover:text-brand-300 bg-brand-500/10 hover:bg-brand-500/20 px-3 py-1 rounded-md border border-brand-500/20 transition-colors"
                        >
                          Investigate
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data?.pagination && (
          <div className="flex items-center justify-between p-4 border-t border-slate-800 text-xs text-slate-400">
            <span>
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} exceptions)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

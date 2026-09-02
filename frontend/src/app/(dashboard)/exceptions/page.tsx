'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import Link from 'next/link';
import { AlertTriangle, Search, RefreshCw, User } from 'lucide-react';

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
    <div className="space-y-4 text-[#1f2328]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d0d7de] pb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#1f2328]">Exception Investigation Queue</h1>
          <p className="text-xs text-[#57606a] mt-0.5">
            Operational queue for investigating transaction discrepancies, assigning ownership, and tracking resolution.
          </p>
        </div>
        <button onClick={() => refetch()} className="wb-btn-secondary flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-[#57606a]" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Prominent Multi-Filter Bar */}
      <div className="wb-panel p-3 flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-mono font-semibold uppercase text-[#57606a] mr-1">Filters:</span>

          {/* Status Select */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="wb-input text-xs py-1"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_REVIEW">IN_REVIEW</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="IGNORED">IGNORED</option>
          </select>

          {/* Severity Select */}
          <select
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setPage(1);
            }}
            className="wb-input text-xs py-1"
          >
            <option value="">All Severities</option>
            <option value="HIGH">HIGH SEVERITY</option>
            <option value="MEDIUM">MEDIUM SEVERITY</option>
            <option value="LOW">LOW SEVERITY</option>
          </select>

          {/* Assignee Select */}
          <select
            value={assigneeFilter}
            onChange={(e) => {
              setAssigneeFilter(e.target.value);
              setPage(1);
            }}
            className="wb-input text-xs py-1"
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
        <div className="relative w-60">
          <Search className="w-3.5 h-3.5 text-[#57606a] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reasons, IDs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full wb-input pl-8 pr-3 py-1 text-xs"
          />
        </div>
      </div>

      {/* Exception Table */}
      <div className="wb-panel overflow-hidden bg-white">
        {isLoading ? (
          <div className="p-8 text-center font-mono text-xs text-[#57606a]">Loading queue...</div>
        ) : data?.exceptions?.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#57606a] italic">
            No exceptions found in queue matching active filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="wb-table-header">
                <tr>
                  <th className="px-3.5 py-2.5">SEVERITY</th>
                  <th className="px-3.5 py-2.5">STATUS</th>
                  <th className="px-3.5 py-2.5">RECONCILIATION RUN</th>
                  <th className="px-3.5 py-2.5">DISCREPANCY REASON</th>
                  <th className="px-3.5 py-2.5">ASSIGNED TO</th>
                  <th className="px-3.5 py-2.5">AGE</th>
                  <th className="px-3.5 py-2.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f5]">
                {data?.exceptions?.map((exc: any) => {
                  const ageDays = Math.floor(
                    (new Date().getTime() - new Date(exc.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                  );

                  return (
                    <tr key={exc.id} className="wb-table-row">
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                            exc.severity === 'HIGH'
                              ? 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
                              : exc.severity === 'MEDIUM'
                              ? 'bg-[#fffbe6] text-[#92400e] border-[#fef08a]'
                              : 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                          }`}
                        >
                          {exc.severity}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            exc.status === 'RESOLVED'
                              ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                              : exc.status === 'IN_REVIEW'
                              ? 'bg-[#f1f5f9] text-[#1e293b] border-[#cbd5e1]'
                              : exc.status === 'OPEN'
                              ? 'bg-[#fffbe6] text-[#92400e] border-[#fef08a]'
                              : 'bg-[#f6f8fa] text-[#57606a] border-[#d0d7de]'
                          }`}
                        >
                          {exc.status}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-medium text-[#1f2328] max-w-[180px] truncate">
                        {exc.reconciliation?.name}
                      </td>
                      <td className="px-3.5 py-2.5 max-w-sm truncate text-[#24292f] font-mono text-[11px]">
                        {exc.reason}
                      </td>
                      <td className="px-3.5 py-2.5 text-[#57606a]">
                        {exc.assignedTo ? (
                          <span className="flex items-center gap-1 font-medium text-[#1f2328]">
                            <User className="w-3 h-3 text-[#57606a]" />
                            {exc.assignedTo.name}
                          </span>
                        ) : (
                          <span className="text-[#8c959f] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-[#57606a] font-mono text-[11px]">
                        {ageDays === 0 ? 'Today' : `${ageDays}d ago`}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <Link
                          href={`/exceptions/${exc.id}`}
                          className="wb-btn-secondary text-[11px] py-0.5 px-2"
                        >
                          Investigate →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {data?.pagination && (
          <div className="p-3 border-t border-[#d0d7de] bg-[#f6f8fa] flex items-center justify-between text-xs text-[#57606a]">
            <span>
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} exceptions)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="wb-btn-secondary py-0.5 px-2 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="wb-btn-secondary py-0.5 px-2 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

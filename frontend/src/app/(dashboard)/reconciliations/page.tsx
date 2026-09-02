'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import Link from 'next/link';
import { GitCompare, Plus, RefreshCw, X, Play, Search, Filter } from 'lucide-react';

export default function ReconciliationsListPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [sourceAId, setSourceAId] = useState('');
  const [sourceBId, setSourceBId] = useState('');
  const [matchingRuleId, setMatchingRuleId] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch reconciliations with refetchInterval for polling active jobs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reconciliations-list'],
    queryFn: async () => {
      const res = await api.get('/reconciliations');
      return res.data;
    },
    refetchInterval: 3000,
  });

  const { data: dataSourcesData } = useQuery({
    queryKey: ['data-sources-select'],
    queryFn: async () => {
      const res = await api.get('/data-sources');
      return res.data;
    },
  });

  const { data: rulesData } = useQuery({
    queryKey: ['matching-rules-select'],
    queryFn: async () => {
      const res = await api.get('/reconciliations/matching-rules');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/reconciliations', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliations-list'] });
      setShowModal(false);
      setName('');
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to launch reconciliation run.');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceAId || !sourceBId) {
      setFormError('Please select both Source A and Source B datasets.');
      return;
    }
    if (sourceAId === sourceBId) {
      setFormError('Source A and Source B cannot be the same data source.');
      return;
    }

    createMutation.mutate({
      name: name || `Reconciliation Run ${new Date().toISOString().substring(0, 10)}`,
      sourceAId,
      sourceBId,
      matchingRuleId: matchingRuleId || undefined,
    });
  };

  const filteredRuns = data?.reconciliations?.filter((r: any) => {
    if (statusFilter && r.status !== statusFilter) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4 text-[#1f2328]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d0d7de] pb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#1f2328]">Reconciliation Runs</h1>
          <p className="text-xs text-[#57606a] mt-0.5">
            Operational log of deterministic matching execution jobs between dataset pairs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className="wb-btn-secondary flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-[#57606a]" />
            <span>Refresh</span>
          </button>
          <button onClick={() => setShowModal(true)} className="wb-btn-primary flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            <span>New Run</span>
          </button>
        </div>
      </div>

      {/* Prominent Analyst Filter Bar */}
      <div className="wb-panel p-3 flex flex-wrap items-center justify-between gap-3 bg-white">
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono font-semibold uppercase text-[#57606a]">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="wb-input text-xs py-1"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="RUNNING">RUNNING</option>
            <option value="QUEUED">QUEUED</option>
            <option value="FAILED">FAILED</option>
          </select>
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-[#57606a] absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search run name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full wb-input pl-8 pr-3 py-1 text-xs"
          />
        </div>
      </div>

      {/* Dense Operational Table */}
      <div className="wb-panel overflow-hidden bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-[#57606a]">Loading runs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="wb-table-header">
                <tr>
                  <th className="px-3.5 py-2.5">RUN NAME</th>
                  <th className="px-3.5 py-2.5">SOURCE A</th>
                  <th className="px-3.5 py-2.5">SOURCE B</th>
                  <th className="px-3.5 py-2.5">STATUS</th>
                  <th className="px-3.5 py-2.5 text-right">MATCH RATE</th>
                  <th className="px-3.5 py-2.5 text-right">MISMATCHES</th>
                  <th className="px-3.5 py-2.5 text-right">MISSING</th>
                  <th className="px-3.5 py-2.5">CREATED / STARTED</th>
                  <th className="px-3.5 py-2.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f5]">
                {filteredRuns?.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3.5 py-6 text-center text-[#57606a] italic">
                      No reconciliation runs found matching current filter.
                    </td>
                  </tr>
                ) : (
                  filteredRuns?.map((r: any) => {
                    const totalEv = r.matchedCount + r.mismatchCount + r.missingACount + r.missingBCount;
                    const matchRatePct = totalEv > 0 ? ((r.matchedCount / totalEv) * 100).toFixed(1) : '0.0';

                    return (
                      <tr key={r.id} className="wb-table-row">
                        <td className="px-3.5 py-2.5 font-medium text-[#1f2328]">{r.name}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[#57606a]">{r.sourceA?.name}</td>
                        <td className="px-3.5 py-2.5 font-mono text-[#57606a]">{r.sourceB?.name}</td>
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
                        <td className="px-3.5 py-2.5 font-mono text-right font-bold text-[#166534]">
                          {matchRatePct}%
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-right font-semibold text-[#92400e]">
                          {r.mismatchCount}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-right font-semibold text-[#991b1b]">
                          {r.missingACount + r.missingBCount}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-[#57606a]">
                          {new Date(r.createdAt).toLocaleString()}
                        </td>
                        <td className="px-3.5 py-2.5 text-right">
                          <Link
                            href={`/reconciliations/${r.id}`}
                            className="wb-btn-secondary text-[11px] py-0.5 px-2"
                          >
                            Investigate →
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Launch New Reconciliation Job */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#d0d7de] rounded max-w-md w-full p-5 shadow-lg space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-[#d0d7de] pb-3">
              <h3 className="font-bold text-sm text-[#1f2328] flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-[#1f2328]" />
                Launch Reconciliation Job
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#57606a] hover:text-[#1f2328]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-[#fef2f2] border border-[#fecaca] rounded p-2 text-[#991b1b] font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                  Run Identifier Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Gateway vs ERP Ledger Aug-2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full wb-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                    Source A Dataset *
                  </label>
                  <select
                    value={sourceAId}
                    onChange={(e) => setSourceAId(e.target.value)}
                    required
                    className="w-full wb-input"
                  >
                    <option value="">Select Source A</option>
                    {dataSourcesData?.dataSources?.map((ds: any) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name} ({ds.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                    Source B Dataset *
                  </label>
                  <select
                    value={sourceBId}
                    onChange={(e) => setSourceBId(e.target.value)}
                    required
                    className="w-full wb-input"
                  >
                    <option value="">Select Source B</option>
                    {dataSourcesData?.dataSources?.map((ds: any) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name} ({ds.type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                  Matching Rule Specification
                </label>
                <select
                  value={matchingRuleId}
                  onChange={(e) => setMatchingRuleId(e.target.value)}
                  className="w-full wb-input"
                >
                  <option value="">Default: ID + Amount Match + 24h Window</option>
                  {rulesData?.matchingRules?.map((rule: any) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#d0d7de]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="wb-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="wb-btn-primary flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{createMutation.isPending ? 'Queuing...' : 'Start Job'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

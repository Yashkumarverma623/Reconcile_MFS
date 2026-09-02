'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import Link from 'next/link';
import { GitCompare, Plus, RefreshCw, X, Play } from 'lucide-react';

export default function ReconciliationsListPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [sourceAId, setSourceAId] = useState('');
  const [sourceBId, setSourceBId] = useState('');
  const [matchingRuleId, setMatchingRuleId] = useState('');
  const [formError, setFormError] = useState('');

  // Fetch reconciliations with refetchInterval for polling running jobs
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reconciliations-list'],
    queryFn: async () => {
      const res = await api.get('/reconciliations');
      return res.data;
    },
    refetchInterval: 3000, // Poll every 3s
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
      setFormError(err.response?.data?.error?.message || 'Failed to create reconciliation job.');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceAId || !sourceBId) {
      setFormError('Please select both Source A and Source B.');
      return;
    }
    if (sourceAId === sourceBId) {
      setFormError('Source A and Source B cannot be the same data source.');
      return;
    }

    createMutation.mutate({
      name: name || `Reconciliation Run ${new Date().toLocaleDateString()}`,
      sourceAId,
      sourceBId,
      matchingRuleId: matchingRuleId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Reconciliation Jobs</h1>
          <p className="text-sm text-slate-400">
            Automated background matching jobs comparing records between data sources.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-brand-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Reconciliation
        </button>
      </div>

      {/* List Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-300">All Reconciliations</span>
          <button
            onClick={() => refetch()}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading jobs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Job Name</th>
                  <th className="px-5 py-3.5">Source A</th>
                  <th className="px-5 py-3.5">Source B</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Matched</th>
                  <th className="px-5 py-3.5">Mismatch</th>
                  <th className="px-5 py-3.5">Created At</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {data?.reconciliations?.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-white">{r.name}</td>
                    <td className="px-5 py-4 text-slate-300">{r.sourceA?.name}</td>
                    <td className="px-5 py-4 text-slate-300">{r.sourceB?.name}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          r.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : r.status === 'RUNNING' || r.status === 'QUEUED'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-emerald-400 font-semibold">{r.matchedCount}</td>
                    <td className="px-5 py-4 font-mono text-amber-400 font-semibold">{r.mismatchCount}</td>
                    <td className="px-5 py-4 text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/reconciliations/${r.id}`}
                        className="text-xs font-semibold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 rounded-lg border border-sky-500/20 transition-colors"
                      >
                        View Breakdown
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create Reconciliation */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-brand-500" />
                Launch New Reconciliation Run
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Reconciliation Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Stripe vs ERP August 2026 Run"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Source A Dataset
                  </label>
                  <select
                    value={sourceAId}
                    onChange={(e) => setSourceAId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
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
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Source B Dataset
                  </label>
                  <select
                    value={sourceBId}
                    onChange={(e) => setSourceBId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
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
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Matching Rule
                </label>
                <select
                  value={matchingRuleId}
                  onChange={(e) => setMatchingRuleId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                >
                  <option value="">Standard ID + Amount + 24h Window (Default)</option>
                  {rulesData?.matchingRules?.map((rule: any) => (
                    <option key={rule.id} value={rule.id}>
                      {rule.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-brand-600/20 disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {createMutation.isPending ? 'Queuing Job...' : 'Start Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

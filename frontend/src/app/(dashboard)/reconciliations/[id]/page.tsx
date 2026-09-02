'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';

export default function ReconciliationDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [resultTypeFilter, setResultTypeFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  // Reconciliation summary data
  const { data: reconData, isLoading: isReconLoading, refetch: refetchRecon } = useQuery({
    queryKey: ['reconciliation-detail', id],
    queryFn: async () => {
      const res = await api.get(`/reconciliations/${id}`);
      return res.data.reconciliation;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'QUEUED' || status === 'RUNNING' ? 2000 : false;
    },
  });

  // Paginated Results data
  const { data: resultsData, isLoading: isResultsLoading, refetch: refetchResults } = useQuery({
    queryKey: ['reconciliation-results', id, resultTypeFilter, search, page],
    queryFn: async () => {
      const res = await api.get(`/reconciliations/${id}/results`, {
        params: {
          resultType: resultTypeFilter || undefined,
          search: search || undefined,
          page,
          limit: 15,
        },
      });
      return res.data;
    },
    enabled: !!reconData,
  });

  if (isReconLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!reconData) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Reconciliation Job Not Found</h2>
        <Link href="/reconciliations" className="text-sky-400 text-sm hover:underline">
          Return to Reconciliations list
        </Link>
      </div>
    );
  }

  const {
    name,
    status,
    sourceA,
    sourceB,
    matchingRule,
    matchedCount,
    mismatchCount,
    missingACount,
    missingBCount,
    createdAt,
    completedAt,
  } = reconData;

  const totalEvaluated = matchedCount + mismatchCount + missingACount + missingBCount;

  return (
    <div className="space-y-8">
      {/* Back Button & Header */}
      <div>
        <Link
          href="/reconciliations"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Reconciliations
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{name}</h1>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  status === 'COMPLETED'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : status === 'RUNNING' || status === 'QUEUED'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Matching Rule: <span className="text-slate-300 font-medium">{matchingRule?.name}</span> • Created at{' '}
              {new Date(createdAt).toLocaleString()}
            </p>
          </div>

          <button
            onClick={() => {
              refetchRecon();
              refetchResults();
            }}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-2 rounded-lg text-xs text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Overview Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-card">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Data Source A
          </span>
          <span className="text-sm font-bold text-sky-400 block truncate">{sourceA?.name}</span>
          <span className="text-xs text-slate-500 font-mono mt-1 block">{sourceA?.type}</span>
        </div>

        <div className="glass-card">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Data Source B
          </span>
          <span className="text-sm font-bold text-sky-400 block truncate">{sourceB?.name}</span>
          <span className="text-xs text-slate-500 font-mono mt-1 block">{sourceB?.type}</span>
        </div>

        <div className="glass-card border-l-4 border-l-emerald-500">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block mb-1">
            MATCHED
          </span>
          <span className="text-2xl font-extrabold text-white">{matchedCount}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            {totalEvaluated > 0 ? ((matchedCount / totalEvaluated) * 100).toFixed(1) : 0}% of pairs
          </span>
        </div>

        <div className="glass-card border-l-4 border-l-amber-500">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block mb-1">
            MISMATCH
          </span>
          <span className="text-2xl font-extrabold text-white">{mismatchCount}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">Discrepancies found</span>
        </div>

        <div className="glass-card border-l-4 border-l-red-500">
          <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider block mb-1">
            MISSING RECORDS
          </span>
          <span className="text-2xl font-extrabold text-white">{missingACount + missingBCount}</span>
          <span className="text-[11px] text-slate-400 block mt-0.5">
            A: {missingACount} | B: {missingBCount}
          </span>
        </div>
      </div>

      {/* Result Explorer Table Section */}
      <div className="glass-panel p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg text-white">Result Explorer</h3>
            <p className="text-xs text-slate-400">Search and filter evaluated transaction pairs</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Tabs / Select */}
            <div className="relative">
              <select
                value={resultTypeFilter}
                onChange={(e) => {
                  setResultTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
              >
                <option value="">All Results ({totalEvaluated})</option>
                <option value="MATCHED">Matched ({matchedCount})</option>
                <option value="MISMATCH">Mismatch ({mismatchCount})</option>
                <option value="MISSING_FROM_A">Missing from A ({missingACount})</option>
                <option value="MISSING_FROM_B">Missing from B ({missingBCount})</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative w-64">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter by External ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-4 py-3">External ID</th>
                <th className="px-4 py-3">Result Status</th>
                <th className="px-4 py-3">Source A Record</th>
                <th className="px-4 py-3">Source B Record</th>
                <th className="px-4 py-3">Difference</th>
                <th className="px-4 py-3">Mismatch Details</th>
                <th className="px-4 py-3 text-right">Exception</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {isResultsLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Loading result explorer records...
                  </td>
                </tr>
              ) : resultsData?.results?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No results found matching filter criteria.
                  </td>
                </tr>
              ) : (
                resultsData?.results?.map((resItem: any) => {
                  const extId =
                    resItem.sourceARecord?.externalId || resItem.sourceBRecord?.externalId || 'N/A';
                  const diffVal = (parseInt(resItem.differenceAmount, 10) / 100).toFixed(2);

                  return (
                    <tr key={resItem.id} className="hover:bg-slate-800/40 transition-colors text-xs">
                      <td className="px-4 py-3.5 font-mono text-sky-400 font-bold">{extId}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-semibold ${
                            resItem.resultType === 'MATCHED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : resItem.resultType === 'MISMATCH'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}
                        >
                          {resItem.resultType}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        {resItem.sourceARecord ? (
                          <div>
                            <span className="font-mono text-slate-200">
                              ${(parseInt(resItem.sourceARecord.amount, 10) / 100).toFixed(2)}
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              {new Date(resItem.sourceARecord.date).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {resItem.sourceBRecord ? (
                          <div>
                            <span className="font-mono text-slate-200">
                              ${(parseInt(resItem.sourceBRecord.amount, 10) / 100).toFixed(2)}
                            </span>
                            <span className="block text-[10px] text-slate-500">
                              {new Date(resItem.sourceBRecord.date).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-600 italic">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-slate-200">
                        {parseFloat(diffVal) > 0 ? `$${diffVal}` : '$0.00'}
                      </td>
                      <td className="px-4 py-3.5 max-w-xs truncate font-mono text-[11px] text-slate-400">
                        {Object.keys(resItem.mismatchFields).length > 0
                          ? JSON.stringify(resItem.mismatchFields)
                          : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {resItem.exception ? (
                          <Link
                            href={`/exceptions/${resItem.exception.id}`}
                            className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20"
                          >
                            View Exception
                          </Link>
                        ) : (
                          <span className="text-slate-600 text-[11px]">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {resultsData?.pagination && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
            <span>
              Showing page {resultsData.pagination.page} of {resultsData.pagination.totalPages} (Total{' '}
              {resultsData.pagination.total} records)
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
                disabled={page >= resultsData.pagination.totalPages}
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

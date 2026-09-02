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
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Info,
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
      <div className="flex items-center justify-center h-64 text-xs font-mono text-[#57606a]">
        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
        Loading investigation session...
      </div>
    );
  }

  if (!reconData) {
    return (
      <div className="p-8 text-center text-xs">
        <h2 className="font-bold text-[#1f2328] mb-2">Reconciliation Run Not Found</h2>
        <Link href="/reconciliations" className="text-[#0969da] hover:underline font-mono">
          ← Return to Reconciliations List
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
  } = reconData;

  const totalEvaluated = matchedCount + mismatchCount + missingACount + missingBCount;

  return (
    <div className="space-y-4 text-[#1f2328]">
      {/* Top Header & Investigation Identity */}
      <div className="border-b border-[#d0d7de] pb-3">
        <Link
          href="/reconciliations"
          className="inline-flex items-center gap-1 text-xs font-mono text-[#57606a] hover:text-[#1f2328] mb-2"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Reconciliations
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#1f2328] tracking-tight">{name}</h1>
              <span
                className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                  status === 'COMPLETED'
                    ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                    : status === 'RUNNING' || status === 'QUEUED'
                    ? 'bg-[#fffbe6] text-[#92400e] border-[#fef08a]'
                    : 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
                }`}
              >
                {status}
              </span>
            </div>
            <p className="text-xs text-[#57606a] mt-0.5 font-mono">
              Rule: <strong className="text-[#1f2328]">{matchingRule?.name}</strong> • Created:{' '}
              {new Date(createdAt).toLocaleString()}
            </p>
          </div>

          <button
            onClick={() => {
              refetchRecon();
              refetchResults();
            }}
            className="wb-btn-secondary flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#57606a]" />
            <span>Refresh Results</span>
          </button>
        </div>
      </div>

      {/* Summary Metrics Matrix */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="wb-panel p-3 bg-white">
          <span className="text-[10px] font-mono font-semibold uppercase text-[#57606a] block mb-0.5">
            Source A
          </span>
          <span className="font-bold text-[#1f2328] block truncate">{sourceA?.name}</span>
          <span className="text-[10px] font-mono text-[#57606a]">Format: {sourceA?.type}</span>
        </div>

        <div className="wb-panel p-3 bg-white">
          <span className="text-[10px] font-mono font-semibold uppercase text-[#57606a] block mb-0.5">
            Source B
          </span>
          <span className="font-bold text-[#1f2328] block truncate">{sourceB?.name}</span>
          <span className="text-[10px] font-mono text-[#57606a]">Format: {sourceB?.type}</span>
        </div>

        <div className="wb-panel p-3 bg-[#f0fdf4] border-[#bbf7d0]">
          <span className="text-[10px] font-mono font-semibold uppercase text-[#166534] block mb-0.5">
            MATCHED
          </span>
          <span className="text-xl font-bold font-mono text-[#166534]">{matchedCount}</span>
          <span className="text-[10px] font-mono text-[#166534] block">
            {totalEvaluated > 0 ? ((matchedCount / totalEvaluated) * 100).toFixed(1) : 0}% of records
          </span>
        </div>

        <div className="wb-panel p-3 bg-[#fffbe6] border-[#fef08a]">
          <span className="text-[10px] font-mono font-semibold uppercase text-[#92400e] block mb-0.5">
            MISMATCHES
          </span>
          <span className="text-xl font-bold font-mono text-[#92400e]">{mismatchCount}</span>
          <span className="text-[10px] font-mono text-[#92400e] block">Field discrepancies</span>
        </div>

        <div className="wb-panel p-3 bg-[#fef2f2] border-[#fecaca] col-span-2 sm:col-span-1">
          <span className="text-[10px] font-mono font-semibold uppercase text-[#991b1b] block mb-0.5">
            MISSING RECORDS
          </span>
          <span className="text-xl font-bold font-mono text-[#991b1b]">
            {missingACount + missingBCount}
          </span>
          <span className="text-[10px] font-mono text-[#991b1b] block">
            A: {missingACount} | B: {missingBCount}
          </span>
        </div>
      </div>

      {/* Results Explorer Table Section */}
      <div className="wb-panel overflow-hidden bg-white">
        <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-[#1f2328] uppercase tracking-wider block">
              Results Explorer
            </span>
            <span className="text-[11px] text-[#57606a]">
              Evaluated pair comparison log ({totalEvaluated} pairs evaluated)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Result Type Filter */}
            <select
              value={resultTypeFilter}
              onChange={(e) => {
                setResultTypeFilter(e.target.value);
                setPage(1);
              }}
              className="wb-input text-xs py-1"
            >
              <option value="">All Results ({totalEvaluated})</option>
              <option value="MATCHED">Matched ({matchedCount})</option>
              <option value="MISMATCH">Mismatch ({mismatchCount})</option>
              <option value="MISSING_FROM_A">Missing from A ({missingACount})</option>
              <option value="MISSING_FROM_B">Missing from B ({missingBCount})</option>
            </select>

            {/* Search Input */}
            <div className="relative w-48">
              <Search className="w-3.5 h-3.5 text-[#57606a] absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter external ID..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full wb-input pl-7 pr-2 py-1 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Large Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="wb-table-header">
              <tr>
                <th className="px-3.5 py-2.5">EXTERNAL ID</th>
                <th className="px-3.5 py-2.5">SOURCE A</th>
                <th className="px-3.5 py-2.5">SOURCE B</th>
                <th className="px-3.5 py-2.5">STATUS</th>
                <th className="px-3.5 py-2.5 text-right">DIFFERENCE</th>
                <th className="px-3.5 py-2.5">DISCREPANCY DETAILS</th>
                <th className="px-3.5 py-2.5 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f5]">
              {isResultsLoading ? (
                <tr>
                  <td colSpan={7} className="px-3.5 py-8 text-center text-[#57606a] font-mono">
                    Loading results...
                  </td>
                </tr>
              ) : resultsData?.results?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3.5 py-8 text-center text-[#57606a] italic">
                    No evaluated record pairs found matching selected filter.
                  </td>
                </tr>
              ) : (
                resultsData?.results?.map((resItem: any) => {
                  const extId =
                    resItem.sourceARecord?.externalId || resItem.sourceBRecord?.externalId || 'N/A';
                  const diffVal = (parseInt(resItem.differenceAmount || 0, 10) / 100).toFixed(2);
                  const hasDiff = Object.keys(resItem.mismatchFields || {}).length > 0;

                  return (
                    <tr key={resItem.id} className="wb-table-row">
                      <td className="px-3.5 py-2.5 font-mono text-[#0969da] font-bold">
                        {extId}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {resItem.sourceARecord ? (
                          <div className="font-mono text-[11px]">
                            <span className="font-bold text-[#1f2328]">
                              ₹{(parseInt(resItem.sourceARecord.amount, 10) / 100).toLocaleString()}
                            </span>
                            <span className="text-[#57606a] block text-[10px]">
                              {new Date(resItem.sourceARecord.date).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#991b1b] font-mono text-[11px] italic">[ABSENT IN A]</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {resItem.sourceBRecord ? (
                          <div className="font-mono text-[11px]">
                            <span className="font-bold text-[#1f2328]">
                              ₹{(parseInt(resItem.sourceBRecord.amount, 10) / 100).toLocaleString()}
                            </span>
                            <span className="text-[#57606a] block text-[10px]">
                              {new Date(resItem.sourceBRecord.date).toLocaleDateString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#991b1b] font-mono text-[11px] italic">[ABSENT IN B]</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            resItem.resultType === 'MATCHED'
                              ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                              : resItem.resultType === 'MISMATCH'
                              ? 'bg-[#fffbe6] text-[#92400e] border-[#fef08a]'
                              : 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
                          }`}
                        >
                          {resItem.resultType}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-right font-bold text-[#1f2328]">
                        {parseFloat(diffVal) > 0 ? `₹${diffVal}` : '₹0.00'}
                      </td>
                      <td className="px-3.5 py-2.5 max-w-xs font-mono text-[11px]">
                        {hasDiff ? (
                          <div className="bg-[#fffbe6] border border-[#fef08a] rounded p-1.5 text-[#92400e] text-[10px] space-y-0.5">
                            {Object.entries(resItem.mismatchFields).map(([k, v]: any) => (
                              <div key={k} className="flex justify-between">
                                <span className="font-semibold uppercase">{k}:</span>
                                <span>A: {v.sourceA} vs B: {v.sourceB}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#57606a]">—</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        {resItem.exception ? (
                          <Link
                            href={`/exceptions/${resItem.exception.id}`}
                            className="wb-btn-secondary text-[11px] py-0.5 px-2 text-[#92400e] border-[#fef08a] bg-[#fffbe6]"
                          >
                            Exception →
                          </Link>
                        ) : (
                          <span className="text-[#57606a] font-mono text-[10px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {resultsData?.pagination && (
          <div className="p-3 border-t border-[#d0d7de] bg-[#f6f8fa] flex items-center justify-between text-xs text-[#57606a]">
            <span>
              Page {resultsData.pagination.page} of {resultsData.pagination.totalPages} ({resultsData.pagination.total} records)
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
                disabled={page >= resultsData.pagination.totalPages}
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

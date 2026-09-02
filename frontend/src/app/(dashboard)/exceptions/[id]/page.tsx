'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../../lib/api';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  CheckCircle,
  MessageSquare,
  Send,
  AlertOctagon,
  Clock,
  Check,
  X,
  FileText,
} from 'lucide-react';

export default function ExceptionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionReason, setResolutionReason] = useState('');

  const { data: excData, isLoading, refetch } = useQuery({
    queryKey: ['exception-detail', id],
    queryFn: async () => {
      const res = await api.get(`/exceptions/${id}`);
      return res.data.exception;
    },
  });

  const { data: membersData } = useQuery({
    queryKey: ['org-members-select'],
    queryFn: async () => {
      const res = await api.get('/organizations/members');
      return res.data;
    },
  });

  // Assign mutation
  const assignMutation = useMutation({
    mutationFn: async (assignedToId: string | null) => {
      const res = await api.patch(`/exceptions/${id}/assign`, { assignedToId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exception-detail', id] });
    },
  });

  // Status mutation
  const statusMutation = useMutation({
    mutationFn: async (payload: { status: string; resolution?: string }) => {
      const res = await api.patch(`/exceptions/${id}/status`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exception-detail', id] });
      setShowResolveModal(false);
      setResolutionReason('');
    },
  });

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post(`/exceptions/${id}/comments`, { content });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exception-detail', id] });
      setCommentText('');
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400">Loading exception details...</div>;
  }

  if (!excData) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Exception Not Found</h2>
        <Link href="/exceptions" className="text-sky-400 text-sm hover:underline">
          Return to Exceptions workbench
        </Link>
      </div>
    );
  }

  const {
    severity,
    status,
    reason,
    resolution,
    assignedTo,
    createdBy,
    resolvedBy,
    createdAt,
    resolvedAt,
    result,
    reconciliation,
    comments,
  } = excData;

  const recA = result?.sourceARecord;
  const recB = result?.sourceBRecord;
  const diffs = result?.mismatchFields || {};

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'RESOLVED') {
      setShowResolveModal(true);
    } else {
      statusMutation.mutate({ status: newStatus });
    }
  };

  const handleResolveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionReason.trim()) return;
    statusMutation.mutate({ status: 'RESOLVED', resolution: resolutionReason });
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    commentMutation.mutate(commentText);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/exceptions"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Exceptions
        </Link>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full font-bold text-xs ${
                  severity === 'HIGH'
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : severity === 'MEDIUM'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {severity} SEVERITY
              </span>
              <span
                className={`px-3 py-1 rounded-full font-bold text-xs ${
                  status === 'RESOLVED'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : status === 'IN_REVIEW'
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                    : status === 'OPEN'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {status}
              </span>
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight mt-2 font-mono">{reason}</h1>
            <p className="text-xs text-slate-400 mt-1">
              Reconciliation Run: <span className="text-slate-300 font-medium">{reconciliation?.name}</span> •
              Created on {new Date(createdAt).toLocaleString()} by {createdBy?.name}
            </p>
          </div>

          {/* Action Dropdowns */}
          <div className="flex items-center gap-3">
            {/* Assignee Dropdown */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
              <User className="w-3.5 h-3.5 text-sky-400" />
              <span>Assignee:</span>
              <select
                value={assignedTo?.id || ''}
                onChange={(e) => assignMutation.mutate(e.target.value || null)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none"
              >
                <option value="">Unassigned</option>
                {membersData?.members?.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Change Dropdown */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300">
              <span>Status:</span>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 focus:outline-none"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_REVIEW">IN_REVIEW</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="IGNORED">IGNORED</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Dataset Record Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Source A Record */}
        <div className="glass-panel p-5 border-t-4 border-t-sky-500">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block">
                Source A ({reconciliation?.sourceA?.name})
              </span>
              <span className="text-xs text-slate-400 font-mono">Format: {reconciliation?.sourceA?.type}</span>
            </div>
            <span className="text-xs bg-slate-950 px-2.5 py-1 rounded text-slate-300 font-mono">
              ID: {recA?.externalId || 'N/A'}
            </span>
          </div>

          {recA ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">External ID</span>
                <span className="font-mono text-sky-400 font-bold">{recA.externalId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Amount</span>
                <span
                  className={`font-mono font-bold ${
                    diffs.amount ? 'text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded' : 'text-slate-200'
                  }`}
                >
                  ${(parseInt(recA.amount, 10) / 100).toFixed(2)} {recA.currency}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Transaction Date</span>
                <span
                  className={`font-mono ${
                    diffs.date ? 'text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded' : 'text-slate-200'
                  }`}
                >
                  {new Date(recA.date).toISOString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Customer Ref</span>
                <span className="font-mono text-slate-300">{recA.customerReference || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 italic">
              Record absent in Source A (Missing Record Exception)
            </div>
          )}
        </div>

        {/* Source B Record */}
        <div className="glass-panel p-5 border-t-4 border-t-sky-500">
          <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider block">
                Source B ({reconciliation?.sourceB?.name})
              </span>
              <span className="text-xs text-slate-400 font-mono">Format: {reconciliation?.sourceB?.type}</span>
            </div>
            <span className="text-xs bg-slate-950 px-2.5 py-1 rounded text-slate-300 font-mono">
              ID: {recB?.externalId || 'N/A'}
            </span>
          </div>

          {recB ? (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">External ID</span>
                <span className="font-mono text-sky-400 font-bold">{recB.externalId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Amount</span>
                <span
                  className={`font-mono font-bold ${
                    diffs.amount ? 'text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded' : 'text-slate-200'
                  }`}
                >
                  ${(parseInt(recB.amount, 10) / 100).toFixed(2)} {recB.currency}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Transaction Date</span>
                <span
                  className={`font-mono ${
                    diffs.date ? 'text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded' : 'text-slate-200'
                  }`}
                >
                  {new Date(recB.date).toISOString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Customer Ref</span>
                <span className="font-mono text-slate-300">{recB.customerReference || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 italic">
              Record absent in Source B (Missing Record Exception)
            </div>
          )}
        </div>
      </div>

      {/* Resolution Summary Box (If resolved) */}
      {status === 'RESOLVED' && resolution && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle className="w-5 h-5" />
            Verified Resolution Logged
          </div>
          <p className="text-sm text-slate-200 font-medium">{resolution}</p>
          <div className="text-xs text-emerald-400/80 font-mono pt-1">
            Resolved by {resolvedBy?.name || 'Team Member'} on{' '}
            {resolvedAt ? new Date(resolvedAt).toLocaleString() : 'N/A'}
          </div>
        </div>
      )}

      {/* Investigation Notes & Timeline of Append-Only Comments */}
      <div className="glass-panel p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-400" />
            Investigation Notes & Audit Timeline ({comments?.length || 0})
          </h3>
        </div>

        {/* Comments Stream */}
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {comments?.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No notes posted yet for this exception.</p>
          ) : (
            comments?.map((c: any) => (
              <div key={c.id} className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center font-bold text-[10px] text-white">
                      {c.user?.name?.[0] || 'U'}
                    </div>
                    <span className="text-xs font-semibold text-slate-200">{c.user?.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">{c.content}</p>
              </div>
            ))
          )}
        </div>

        {/* Append Comment Form */}
        <form onSubmit={handleAddComment} className="pt-2 border-t border-slate-800 flex gap-3">
          <input
            type="text"
            placeholder="Add an investigation note, ledger reference, or comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500"
          />
          <button
            type="submit"
            disabled={commentMutation.isPending}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            Post Note
          </button>
        </form>
      </div>

      {/* Modal: Resolution Confirmation */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                Resolve Discrepancy Exception
              </h3>
              <button onClick={() => setShowResolveModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Resolution Reason / Action Taken *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe how this discrepancy was resolved (e.g., 'Posted journal entry JE-9801 in ERP ledger', 'Verified vendor fee adjustment')."
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusMutation.isPending}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {statusMutation.isPending ? 'Resolving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

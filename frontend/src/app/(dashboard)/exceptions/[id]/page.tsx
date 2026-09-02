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
  X,
  FileText,
  AlertOctagon,
} from 'lucide-react';

export default function ExceptionDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const queryClient = useQueryClient();

  const [commentText, setCommentText] = useState('');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionReason, setResolutionReason] = useState('');

  const { data: excData, isLoading } = useQuery({
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

  const assignMutation = useMutation({
    mutationFn: async (assignedToId: string | null) => {
      const res = await api.patch(`/exceptions/${id}/assign`, { assignedToId });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exception-detail', id] });
    },
  });

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
    return <div className="p-8 text-center font-mono text-xs text-[#57606a]">Loading investigation record...</div>;
  }

  if (!excData) {
    return (
      <div className="p-8 text-center text-xs">
        <h2 className="font-bold text-[#1f2328] mb-2">Exception Record Not Found</h2>
        <Link href="/exceptions" className="text-[#0969da] hover:underline font-mono">
          ← Return to Exception Queue
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
    <div className="space-y-4 text-[#1f2328]">
      {/* Top Header */}
      <div className="border-b border-[#d0d7de] pb-3">
        <Link
          href="/exceptions"
          className="inline-flex items-center gap-1 text-xs font-mono text-[#57606a] hover:text-[#1f2328] mb-2"
        >
          <ArrowLeft className="w-3 h-3" />
          Back to Exception Queue
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  severity === 'HIGH'
                    ? 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
                    : severity === 'MEDIUM'
                    ? 'bg-[#fffbe6] text-[#92400e] border-[#fef08a]'
                    : 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                }`}
              >
                {severity} SEVERITY
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                  status === 'RESOLVED'
                    ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                    : status === 'IN_REVIEW'
                    ? 'bg-[#f1f5f9] text-[#1e293b] border-[#cbd5e1]'
                    : status === 'OPEN'
                    ? 'bg-[#fffbe6] text-[#92400e] border-[#fef08a]'
                    : 'bg-[#f6f8fa] text-[#57606a] border-[#d0d7de]'
                }`}
              >
                {status}
              </span>
            </div>
            <h1 className="text-base font-bold text-[#1f2328] font-mono mt-1">{reason}</h1>
            <p className="text-xs text-[#57606a] font-mono mt-0.5">
              Run: <span className="text-[#1f2328] font-medium">{reconciliation?.name}</span> • Created:{' '}
              {new Date(createdAt).toLocaleString()} by {createdBy?.name}
            </p>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Assignee Control */}
            <div className="flex items-center gap-1.5 bg-white border border-[#d0d7de] rounded px-2 py-1">
              <User className="w-3.5 h-3.5 text-[#57606a]" />
              <span className="font-mono text-[#57606a]">Assignee:</span>
              <select
                value={assignedTo?.id || ''}
                onChange={(e) => assignMutation.mutate(e.target.value || null)}
                className="wb-input py-0.5 text-xs border-0 focus:ring-0 bg-transparent font-medium"
              >
                <option value="">Unassigned</option>
                {membersData?.members?.map((m: any) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Control */}
            <div className="flex items-center gap-1.5 bg-white border border-[#d0d7de] rounded px-2 py-1">
              <span className="font-mono text-[#57606a]">Status:</span>
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="wb-input py-0.5 text-xs border-0 focus:ring-0 bg-transparent font-medium"
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

      {/* Side-by-Side Record Discrepancy Evidence Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Source A Record */}
        <div className="wb-panel p-4 bg-white border-t-2 border-t-[#0969da]">
          <div className="flex items-center justify-between border-b border-[#d0d7de] pb-2 mb-3">
            <div>
              <span className="text-xs font-mono font-bold text-[#0969da] uppercase block">
                SOURCE A ({reconciliation?.sourceA?.name})
              </span>
              <span className="text-[10px] font-mono text-[#57606a]">Type: {reconciliation?.sourceA?.type}</span>
            </div>
            <span className="text-[10px] font-mono bg-[#f6f8fa] border border-[#d0d7de] px-2 py-0.5 rounded text-[#24292f]">
              ID: {recA?.externalId || 'N/A'}
            </span>
          </div>

          {recA ? (
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-[#f0f2f5]">
                <span className="text-[#57606a]">External ID</span>
                <span className="text-[#0969da] font-bold">{recA.externalId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f2f5]">
                <span className="text-[#57606a]">Amount</span>
                <span className={`font-bold ${diffs.amount ? 'bg-[#fffbe6] text-[#92400e] px-1 border border-[#fef08a] rounded' : 'text-[#1f2328]'}`}>
                  ₹{(parseInt(recA.amount, 10) / 100).toLocaleString()} {recA.currency}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f2f5]">
                <span className="text-[#57606a]">Transaction Date</span>
                <span className={diffs.date ? 'bg-[#fffbe6] text-[#92400e] px-1 border border-[#fef08a] rounded' : 'text-[#1f2328]'}>
                  {new Date(recA.date).toISOString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f2f5]">
                <span className="text-[#57606a]">Customer Ref</span>
                <span className="text-[#1f2328]">{recA.customerReference || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-[#991b1b] font-mono text-xs italic bg-[#fef2f2] border border-[#fecaca] rounded">
              Record absent in Source A dataset (Missing Record)
            </div>
          )}
        </div>

        {/* Source B Record */}
        <div className="wb-panel p-4 bg-white border-t-2 border-t-[#0969da]">
          <div className="flex items-center justify-between border-b border-[#d0d7de] pb-2 mb-3">
            <div>
              <span className="text-xs font-mono font-bold text-[#0969da] uppercase block">
                SOURCE B ({reconciliation?.sourceB?.name})
              </span>
              <span className="text-[10px] font-mono text-[#57606a]">Type: {reconciliation?.sourceB?.type}</span>
            </div>
            <span className="text-[10px] font-mono bg-[#f6f8fa] border border-[#d0d7de] px-2 py-0.5 rounded text-[#24292f]">
              ID: {recB?.externalId || 'N/A'}
            </span>
          </div>

          {recB ? (
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-[#f0f2f5]">
                <span className="text-[#57606a]">External ID</span>
                <span className="text-[#0969da] font-bold">{recB.externalId}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f2f5]">
                <span className="text-[#57606a]">Amount</span>
                <span className={`font-bold ${diffs.amount ? 'bg-[#fffbe6] text-[#92400e] px-1 border border-[#fef08a] rounded' : 'text-[#1f2328]'}`}>
                  ₹{(parseInt(recB.amount, 10) / 100).toLocaleString()} {recB.currency}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f2f5]">
                <span className="text-[#57606a]">Transaction Date</span>
                <span className={diffs.date ? 'bg-[#fffbe6] text-[#92400e] px-1 border border-[#fef08a] rounded' : 'text-[#1f2328]'}>
                  {new Date(recB.date).toISOString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#f0f2f5]">
                <span className="text-[#57606a]">Customer Ref</span>
                <span className="text-[#1f2328]">{recB.customerReference || 'N/A'}</span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-[#991b1b] font-mono text-xs italic bg-[#fef2f2] border border-[#fecaca] rounded">
              Record absent in Source B dataset (Missing Record)
            </div>
          )}
        </div>
      </div>

      {/* Resolution Log (If resolved) */}
      {status === 'RESOLVED' && resolution && (
        <div className="wb-panel p-4 bg-[#f0fdf4] border-[#bbf7d0] space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-[#166534] font-bold">
            <CheckCircle className="w-4 h-4" />
            Verified Resolution Logged
          </div>
          <p className="text-[#1f2328] font-mono">{resolution}</p>
          <div className="text-[11px] text-[#166534] font-mono pt-1">
            Resolved by {resolvedBy?.name || 'Analyst'} on{' '}
            {resolvedAt ? new Date(resolvedAt).toLocaleString() : 'N/A'}
          </div>
        </div>
      )}

      {/* Vertical Investigation Evidence Notes Trail */}
      <div className="wb-panel p-4 bg-white space-y-4">
        <div className="flex items-center justify-between border-b border-[#d0d7de] pb-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#1f2328] font-mono flex items-center gap-1.5">
            <MessageSquare className="w-4 h-4 text-[#57606a]" />
            Investigation Notes & Audit Evidence Trail ({comments?.length || 0})
          </h3>
        </div>

        {/* Append-only Comments List */}
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {comments?.length === 0 ? (
            <p className="text-xs text-[#57606a] italic font-mono">No notes logged yet for this discrepancy.</p>
          ) : (
            comments?.map((c: any) => (
              <div key={c.id} className="p-3 bg-[#f6f8fa] border border-[#d0d7de] rounded text-xs space-y-1">
                <div className="flex items-center justify-between font-mono text-[11px]">
                  <span className="font-bold text-[#1f2328]">{c.user?.name}</span>
                  <span className="text-[#57606a]">{new Date(c.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-[#1f2328] leading-relaxed">{c.content}</p>
              </div>
            ))
          )}
        </div>

        {/* Add Note Form */}
        <form onSubmit={handleAddComment} className="pt-2 border-t border-[#d0d7de] flex gap-2">
          <input
            type="text"
            placeholder="Add an investigation note, ledger reference, or comment..."
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="flex-1 wb-input text-xs"
          />
          <button
            type="submit"
            disabled={commentMutation.isPending}
            className="wb-btn-primary flex items-center gap-1 text-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Post Note</span>
          </button>
        </form>
      </div>

      {/* Modal: Resolution Confirmation */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#d0d7de] rounded max-w-md w-full p-5 shadow-lg space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-[#d0d7de] pb-2">
              <h3 className="font-bold text-sm text-[#1f2328] flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[#166534]" />
                Log Discrepancy Resolution
              </h3>
              <button onClick={() => setShowResolveModal(false)} className="text-[#57606a] hover:text-[#1f2328]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-3">
              <div>
                <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                  Resolution Action Taken / Journal Entry Ref *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Describe resolution (e.g., 'Posted adjustment entry JE-9982 in ERP ledger', 'Verified gateway fee tolerance')."
                  value={resolutionReason}
                  onChange={(e) => setResolutionReason(e.target.value)}
                  className="w-full wb-input font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#d0d7de]">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="wb-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusMutation.isPending}
                  className="wb-btn-primary"
                >
                  {statusMutation.isPending ? 'Saving...' : 'Confirm Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

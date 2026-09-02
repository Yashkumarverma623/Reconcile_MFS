'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { Settings, Users, History, Plus, X, UserCheck } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'members' | 'audit'>('members');
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'OWNER' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [password, setPassword] = useState('password123');
  const [formError, setFormError] = useState('');

  const { data: membersData } = useQuery({
    queryKey: ['org-members'],
    queryFn: async () => {
      const res = await api.get('/organizations/members');
      return res.data;
    },
  });

  const { data: auditData } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const res = await api.get('/audit');
      return res.data;
    },
    enabled: activeTab === 'audit',
  });

  const addMemberMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/organizations/members', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      setShowMemberModal(false);
      setName('');
      setEmail('');
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to add team member.');
    },
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) return;
    addMemberMutation.mutate({ name, email, role, password });
  };

  return (
    <div className="space-y-4 text-[#1f2328]">
      {/* Header */}
      <div className="border-b border-[#d0d7de] pb-3">
        <h1 className="text-lg font-bold tracking-tight text-[#1f2328]">Organization Settings & Audit Log</h1>
        <p className="text-xs text-[#57606a] mt-0.5">
          Manage team memberships, role-based access permissions, and append-only audit trail verification.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#d0d7de] gap-4 text-xs font-mono font-semibold">
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-2 flex items-center gap-1.5 border-b-2 transition-colors uppercase ${
            activeTab === 'members'
              ? 'border-[#1f2328] text-[#1f2328]'
              : 'border-transparent text-[#57606a] hover:text-[#1f2328]'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          Team Members
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2 flex items-center gap-1.5 border-b-2 transition-colors uppercase ${
            activeTab === 'audit'
              ? 'border-[#1f2328] text-[#1f2328]'
              : 'border-transparent text-[#57606a] hover:text-[#1f2328]'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Audit Trail Stream
        </button>
      </div>

      {/* Tab 1: Team Members */}
      {activeTab === 'members' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#57606a] font-mono">
              Organization: <strong className="text-[#1f2328]">{user?.organizationName}</strong>
            </span>
            {user?.role === 'OWNER' && (
              <button onClick={() => setShowMemberModal(true)} className="wb-btn-primary flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" />
                <span>Invite Member</span>
              </button>
            )}
          </div>

          <div className="wb-panel overflow-hidden bg-white">
            <table className="w-full text-left text-xs">
              <thead className="wb-table-header">
                <tr>
                  <th className="px-3.5 py-2.5">NAME</th>
                  <th className="px-3.5 py-2.5">EMAIL</th>
                  <th className="px-3.5 py-2.5">ROLE PERMISSION</th>
                  <th className="px-3.5 py-2.5">JOINED DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f5]">
                {membersData?.members?.map((m: any) => (
                  <tr key={m.id} className="wb-table-row">
                    <td className="px-3.5 py-2.5 font-medium text-[#1f2328] flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-[#1f2328] text-white font-mono font-bold flex items-center justify-center text-[10px]">
                        {m.name[0]}
                      </div>
                      {m.name}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[#57606a]">{m.email}</td>
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
                          m.role === 'OWNER'
                            ? 'bg-[#f6f8fa] text-[#1f2328] border-[#d0d7de]'
                            : m.role === 'MEMBER'
                            ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                            : 'bg-[#f6f8fa] text-[#57606a] border-[#d0d7de]'
                        }`}
                      >
                        {m.role}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[#57606a]">
                      {new Date(m.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="wb-panel overflow-hidden bg-white">
          <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] font-mono text-xs font-semibold text-[#57606a] uppercase">
            Append-Only Verification Log
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="wb-table-header">
                <tr>
                  <th className="px-3.5 py-2.5">ACTOR</th>
                  <th className="px-3.5 py-2.5">ACTION</th>
                  <th className="px-3.5 py-2.5">RESOURCE</th>
                  <th className="px-3.5 py-2.5">DETAILS</th>
                  <th className="px-3.5 py-2.5">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f5] font-mono text-[11px]">
                {auditData?.auditLogs?.map((log: any) => (
                  <tr key={log.id} className="wb-table-row">
                    <td className="px-3.5 py-2 text-[#0969da] font-bold">{log.user?.name || 'System'}</td>
                    <td className="px-3.5 py-2 text-[#92400e] font-semibold">{log.action}</td>
                    <td className="px-3.5 py-2 text-[#1f2328]">{log.resource}</td>
                    <td className="px-3.5 py-2 text-[#57606a] max-w-xs truncate">
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="px-3.5 py-2 text-[#57606a]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Invite Member */}
      {showMemberModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#d0d7de] rounded max-w-md w-full p-5 shadow-lg space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-[#d0d7de] pb-2">
              <h3 className="font-bold text-sm text-[#1f2328] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#1f2328]" />
                Add Team Member
              </h3>
              <button onClick={() => setShowMemberModal(false)} className="text-[#57606a] hover:text-[#1f2328]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-[#fef2f2] border border-[#fecaca] rounded p-2 text-[#991b1b] font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Jane Member"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full wb-input"
                />
              </div>

              <div>
                <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  required
                  placeholder="jane@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full wb-input font-mono"
                />
              </div>

              <div>
                <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                  Role Permission
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full wb-input"
                >
                  <option value="MEMBER">MEMBER (Upload, Run jobs, Investigate, Resolve)</option>
                  <option value="VIEWER">VIEWER (Read-only access)</option>
                  <option value="OWNER">OWNER (Full administrative access)</option>
                </select>
              </div>

              <div>
                <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full wb-input font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#d0d7de]">
                <button
                  type="button"
                  onClick={() => setShowMemberModal(false)}
                  className="wb-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMemberMutation.isPending}
                  className="wb-btn-primary"
                >
                  {addMemberMutation.isPending ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

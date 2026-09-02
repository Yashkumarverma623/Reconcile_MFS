'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../lib/api';
import Link from 'next/link';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('owner@acme.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.token, res.data.user);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fa] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#1f2328]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-10 h-10 rounded bg-[#1f2328] text-white flex items-center justify-center font-mono font-bold text-sm tracking-widest mb-3">
          REC
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[#1f2328]">Sign in to Reconcile</h2>
        <p className="mt-1 text-xs text-[#57606a] font-mono">
          Data Reconciliation & Exception Investigation Workbench
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="wb-panel p-6 bg-white shadow-xs">
          {error && (
            <div className="mb-4 bg-[#fef2f2] border border-[#fecaca] rounded p-2 text-xs text-[#991b1b] font-mono">
              {error}
            </div>
          )}

          <form className="space-y-4 text-xs" onSubmit={handleSubmit}>
            <div>
              <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-[#57606a] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full wb-input pl-8"
                />
              </div>
            </div>

            <div>
              <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-[#57606a] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full wb-input pl-8 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full wb-btn-primary py-2 flex items-center justify-center gap-1.5 text-xs font-semibold disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Workbench'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-[#57606a] border-t border-[#f0f2f5] pt-4">
            <span>Need an organization account? </span>
            <Link href="/register" className="text-[#0969da] font-semibold hover:underline">
              Register Organization
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

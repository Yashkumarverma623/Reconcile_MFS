'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { BarChart3, TrendingUp, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-metrics'],
    queryFn: async () => {
      const res = await api.get('/analytics/dashboard');
      return res.data;
    },
  });

  const { data: chartData } = useQuery({
    queryKey: ['analytics-charts'],
    queryFn: async () => {
      const res = await api.get('/analytics/charts');
      return res.data;
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-500">Loading analytics engine data...</div>;
  }

  const { records, exceptions } = data || {
    records: { matchRate: 0, mismatchRate: 0, missingRate: 0, duplicateRate: 0, invalidRate: 0 },
    exceptions: { severity: { high: 0, medium: 0, low: 0 }, avgResolutionHours: 0 },
  };

  const severityPieData = [
    { name: 'High Severity', value: exceptions.severity?.high || 0, color: '#ef4444' },
    { name: 'Medium Severity', value: exceptions.severity?.medium || 0, color: '#f59e0b' },
    { name: 'Low Severity', value: exceptions.severity?.low || 0, color: '#10b981' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Reconciliation Analytics</h1>
        <p className="text-sm text-slate-400">
          Quantitative accuracy benchmarks, exception severity distribution, and operational metrics.
        </p>
      </div>

      {/* High-Level Rate Indicators Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Match Rate
          </span>
          <span className="text-2xl font-extrabold text-emerald-400">{records.matchRate}%</span>
        </div>

        <div className="glass-card">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Mismatch Rate
          </span>
          <span className="text-2xl font-extrabold text-amber-400">{records.mismatchRate}%</span>
        </div>

        <div className="glass-card">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Duplicate Rate
          </span>
          <span className="text-2xl font-extrabold text-sky-400">{records.duplicateRate}%</span>
        </div>

        <div className="glass-card">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block mb-1">
            Avg Resolution
          </span>
          <span className="text-2xl font-extrabold text-brand-400">
            {exceptions.avgResolutionHours} hrs
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Bar Chart */}
        <div className="lg:col-span-2 glass-panel p-6 space-y-4">
          <div>
            <h3 className="font-bold text-lg text-white">Reconciliation Matching Trend</h3>
            <p className="text-xs text-slate-400">Matched vs Mismatched vs Missing record breakdown</p>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData?.trendData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="matched" name="Matched" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mismatch" name="Mismatch" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="missing" name="Missing" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution Pie Chart */}
        <div className="glass-panel p-6 space-y-4">
          <div>
            <h3 className="font-bold text-lg text-white">Exception Severity Breakdown</h3>
            <p className="text-xs text-slate-400">Categorization of active discrepancies</p>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {severityPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

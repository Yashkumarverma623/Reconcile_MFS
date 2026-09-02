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
    return <div className="p-8 text-center font-mono text-xs text-[#57606a]">Loading analytical benchmarks...</div>;
  }

  const { records, exceptions } = data || {
    records: { matchRate: 0, mismatchRate: 0, missingRate: 0, duplicateRate: 0, invalidRate: 0 },
    exceptions: { severity: { high: 0, medium: 0, low: 0 }, avgResolutionHours: 0 },
  };

  const severityPieData = [
    { name: 'High Severity', value: exceptions.severity?.high || 0, color: '#991b1b' },
    { name: 'Medium Severity', value: exceptions.severity?.medium || 0, color: '#92400e' },
    { name: 'Low Severity', value: exceptions.severity?.low || 0, color: '#166534' },
  ];

  return (
    <div className="space-y-4 text-[#1f2328]">
      {/* Header */}
      <div className="border-b border-[#d0d7de] pb-3">
        <h1 className="text-lg font-bold tracking-tight text-[#1f2328]">Operational Analytics</h1>
        <p className="text-xs text-[#57606a] mt-0.5">
          Quantitative reconciliation benchmarks, accuracy indicators, and resolution times.
        </p>
      </div>

      {/* Analytical Rate Indicators Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="wb-panel p-3.5 bg-white">
          <span className="text-[10px] font-mono font-semibold uppercase text-[#57606a] block mb-1">
            Overall Match Rate
          </span>
          <span className="text-2xl font-bold font-mono text-[#166534]">{records.matchRate}%</span>
          <span className="text-[10px] font-mono text-[#57606a] block mt-1">Matched record ratio</span>
        </div>

        <div className="wb-panel p-3.5 bg-white">
          <span className="text-[10px] font-mono font-semibold uppercase text-[#57606a] block mb-1">
            Mismatch Discrepancy Rate
          </span>
          <span className="text-2xl font-bold font-mono text-[#92400e]">{records.mismatchRate}%</span>
          <span className="text-[10px] font-mono text-[#57606a] block mt-1">Field variance ratio</span>
        </div>

        <div className="wb-panel p-3.5 bg-white">
          <span className="text-[10px] font-mono font-semibold uppercase text-[#57606a] block mb-1">
            Duplicate Ingestion Rate
          </span>
          <span className="text-2xl font-bold font-mono text-[#0969da]">{records.duplicateRate}%</span>
          <span className="text-[10px] font-mono text-[#57606a] block mt-1">Deduplicated rows</span>
        </div>

        <div className="wb-panel p-3.5 bg-white">
          <span className="text-[10px] font-mono font-semibold uppercase text-[#57606a] block mb-1">
            Avg Resolution Duration
          </span>
          <span className="text-2xl font-bold font-mono text-[#1f2328]">
            {exceptions.avgResolutionHours} hrs
          </span>
          <span className="text-[10px] font-mono text-[#57606a] block mt-1">Mean time to resolve</span>
        </div>
      </div>

      {/* Analytical Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
        {/* Trend Bar Chart */}
        <div className="lg:col-span-2 wb-panel p-4 bg-white space-y-3">
          <div className="border-b border-[#f0f2f5] pb-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#1f2328] font-mono">
              Reconciliation Matching Performance Log
            </h3>
            <p className="text-[11px] text-[#57606a]">Matched vs Mismatched vs Missing record breakdown per run</p>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData?.trendData || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e4e8" />
                <XAxis dataKey="name" stroke="#57606a" fontSize={10} fontFamily="monospace" />
                <YAxis stroke="#57606a" fontSize={10} fontFamily="monospace" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d0d7de', borderRadius: '4px', fontSize: '11px' }}
                />
                <Bar dataKey="matched" name="Matched" fill="#166534" radius={[2, 2, 0, 0]} />
                <Bar dataKey="mismatch" name="Mismatch" fill="#92400e" radius={[2, 2, 0, 0]} />
                <Bar dataKey="missing" name="Missing" fill="#991b1b" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Severity Distribution Pie Chart */}
        <div className="wb-panel p-4 bg-white space-y-3">
          <div className="border-b border-[#f0f2f5] pb-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#1f2328] font-mono">
              Exception Severity Distribution
            </h3>
            <p className="text-[11px] text-[#57606a]">Active discrepancy severity categorization</p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {severityPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d0d7de', borderRadius: '4px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#1f2328' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

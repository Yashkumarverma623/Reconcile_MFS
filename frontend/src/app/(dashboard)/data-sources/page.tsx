'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { Database, Plus, FileText, Code2, Globe, History, X } from 'lucide-react';

export default function DataSourcesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<'CSV' | 'JSON' | 'API'>('CSV');
  const [baseUrl, setBaseUrl] = useState('');
  const [resourcePath, setResourcePath] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [formError, setFormError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['data-sources-list'],
    queryFn: async () => {
      const res = await api.get('/data-sources');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post('/data-sources', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data-sources-list'] });
      setShowModal(false);
      setName('');
      setBaseUrl('');
      setResourcePath('');
      setAuthToken('');
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || 'Failed to create data source');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const config: Record<string, any> = {};
    if (type === 'API') {
      if (!baseUrl) {
        setFormError('Base URL is required for API data source');
        return;
      }
      config.baseUrl = baseUrl;
      config.resourcePath = resourcePath || '/';
      if (authToken) config.authToken = authToken;
    }

    createMutation.mutate({ name, type, config });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Data Sources</h1>
          <p className="text-sm text-slate-400">
            Configure datasets for reconciliation via CSV, JSON uploads, or external REST API connectors.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-brand-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Data Source
        </button>
      </div>

      {/* Grid of Data Source Cards */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500">Loading data sources...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.dataSources?.map((ds: any) => {
            const Icon = ds.type === 'CSV' ? FileText : ds.type === 'JSON' ? Code2 : Globe;
            const latestImport = ds.imports?.[0];

            return (
              <div key={ds.id} className="glass-panel p-6 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-sky-400 flex items-center justify-center border border-brand-500/20">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        ds.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {ds.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-white mb-1">{ds.name}</h3>
                  <span className="inline-block bg-slate-950 px-2.5 py-0.5 rounded text-[11px] font-mono text-slate-400 mb-3">
                    Format: {ds.type}
                  </span>

                  {ds.type === 'API' && ds.config?.baseUrl && (
                    <div className="text-xs text-slate-400 font-mono truncate bg-slate-950/60 p-2 rounded border border-slate-800">
                      {ds.config.baseUrl}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <History className="w-3.5 h-3.5" />
                    <span>{ds._count.imports} Imports processed</span>
                  </div>
                  {latestImport && (
                    <span className="font-mono text-emerald-400">{latestImport.totalRows} rows</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Data Source */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-brand-500" />
                New Data Source Connector
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Source Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stripe Gateway CSV"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Source Format Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                >
                  <option value="CSV">CSV File</option>
                  <option value="JSON">JSON File</option>
                  <option value="API">External REST API Connector</option>
                </select>
              </div>

              {type === 'API' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Base API URL *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://api.gateway.com/v1"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Resource Path
                    </label>
                    <input
                      type="text"
                      placeholder="/transactions"
                      value={resourcePath}
                      onChange={(e) => setResourcePath(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                      Bearer Authentication Token (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="e.g. sk_live_..."
                      value={authToken}
                      onChange={(e) => setAuthToken(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand-500 font-mono text-xs"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-sm font-medium rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-brand-600/20 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Save Data Source'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

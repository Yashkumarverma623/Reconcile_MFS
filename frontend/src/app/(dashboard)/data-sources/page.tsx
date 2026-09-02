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
      setFormError(err.response?.data?.error?.message || 'Failed to register data source connector.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const config: Record<string, any> = {};
    if (type === 'API') {
      if (!baseUrl) {
        setFormError('Base URL is required for API data source connector.');
        return;
      }
      config.baseUrl = baseUrl;
      config.resourcePath = resourcePath || '/';
      if (authToken) config.authToken = authToken;
    }

    createMutation.mutate({ name, type, config });
  };

  return (
    <div className="space-y-4 text-[#1f2328]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d0d7de] pb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#1f2328]">Data Sources & Connectors</h1>
          <p className="text-xs text-[#57606a] mt-0.5">
            Configure datasets for reconciliation via CSV/JSON uploads or REST API integrations.
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="wb-btn-primary flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          <span>Add Connector</span>
        </button>
      </div>

      {/* Grid of Data Source Cards */}
      {isLoading ? (
        <div className="p-8 text-center font-mono text-xs text-[#57606a]">Loading connectors...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          {data?.dataSources?.map((ds: any) => {
            const Icon = ds.type === 'CSV' ? FileText : ds.type === 'JSON' ? Code2 : Globe;
            const latestImport = ds.imports?.[0];

            return (
              <div key={ds.id} className="wb-panel p-4 bg-white flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-[#f6f8fa] border border-[#d0d7de] text-[#1f2328] flex items-center justify-center font-mono">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-sm text-[#1f2328]">{ds.name}</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                        ds.status === 'ACTIVE'
                          ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                          : 'bg-[#f6f8fa] text-[#57606a] border-[#d0d7de]'
                      }`}
                    >
                      {ds.status}
                    </span>
                  </div>

                  <div className="text-[10px] font-mono bg-[#f6f8fa] border border-[#d0d7de] px-2 py-0.5 rounded inline-block text-[#57606a] mb-2">
                    FORMAT: {ds.type}
                  </div>

                  {ds.type === 'API' && ds.config?.baseUrl && (
                    <div className="text-[11px] font-mono text-[#57606a] truncate bg-[#f6f8fa] p-1.5 rounded border border-[#d0d7de]">
                      {ds.config.baseUrl}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-[#f0f2f5] flex items-center justify-between text-[11px] font-mono text-[#57606a]">
                  <div className="flex items-center gap-1">
                    <History className="w-3 h-3" />
                    <span>{ds._count.imports} Imports</span>
                  </div>
                  {latestImport && (
                    <span className="font-bold text-[#166534]">{latestImport.totalRows} rows</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Data Source */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#d0d7de] rounded max-w-md w-full p-5 shadow-lg space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-[#d0d7de] pb-2">
              <h3 className="font-bold text-sm text-[#1f2328] flex items-center gap-2">
                <Database className="w-4 h-4 text-[#1f2328]" />
                Register Data Source Connector
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#57606a] hover:text-[#1f2328]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="bg-[#fef2f2] border border-[#fecaca] rounded p-2 text-[#991b1b] font-mono">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                  Connector Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gateway CSV Report"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full wb-input"
                />
              </div>

              <div>
                <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                  Format Type *
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full wb-input"
                >
                  <option value="CSV">CSV File</option>
                  <option value="JSON">JSON File</option>
                  <option value="API">REST API Endpoint</option>
                </select>
              </div>

              {type === 'API' && (
                <>
                  <div>
                    <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                      Base API URL *
                    </label>
                    <input
                      type="url"
                      required
                      placeholder="https://api.gateway.com/v1"
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      className="w-full wb-input font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                      Resource Path
                    </label>
                    <input
                      type="text"
                      placeholder="/transactions"
                      value={resourcePath}
                      onChange={(e) => setResourcePath(e.target.value)}
                      className="w-full wb-input font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                      Auth Bearer Token
                    </label>
                    <input
                      type="password"
                      placeholder="sk_live_..."
                      value={authToken}
                      onChange={(e) => setAuthToken(e.target.value)}
                      className="w-full wb-input font-mono"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex justify-end gap-2 border-t border-[#d0d7de]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="wb-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="wb-btn-primary"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Connector'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

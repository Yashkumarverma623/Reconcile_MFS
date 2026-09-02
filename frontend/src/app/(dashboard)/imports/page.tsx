'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, RefreshCw, X, FileUp } from 'lucide-react';

export default function ImportsPage() {
  const queryClient = useQueryClient();
  const [selectedDsId, setSelectedDsId] = useState<string>('');
  const [file, setFile] = useState<File | null>(null);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState<string>('');
  const [uploadErrorMsg, setUploadErrorMsg] = useState<string>('');

  const { data: importsData, isLoading, refetch } = useQuery({
    queryKey: ['imports-list'],
    queryFn: async () => {
      const res = await api.get('/imports');
      return res.data;
    },
    refetchInterval: 3000, // Poll every 3s for background processing status
  });

  const { data: dsData } = useQuery({
    queryKey: ['data-sources-select'],
    queryFn: async () => {
      const res = await api.get('/data-sources');
      return res.data;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await api.post('/imports', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['imports-list'] });
      if (data.isDuplicate) {
        setUploadSuccessMsg('An identical file checksum has already been imported previously.');
      } else {
        setUploadSuccessMsg('Import job queued successfully! Worker is processing rows.');
      }
      setUploadErrorMsg('');
      setFile(null);
    },
    onError: (err: any) => {
      setUploadErrorMsg(err.response?.data?.error?.message || 'Failed to upload and enqueue import job.');
      setUploadSuccessMsg('');
    },
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDsId) {
      setUploadErrorMsg('Please select a target Data Source.');
      return;
    }

    const targetDs = dsData?.dataSources?.find((ds: any) => ds.id === selectedDsId);

    if (targetDs?.type !== 'API' && !file) {
      setUploadErrorMsg('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('dataSourceId', selectedDsId);
    if (file) {
      formData.append('file', file);
    }

    uploadMutation.mutate(formData);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dataset Ingestion & Imports</h1>
          <p className="text-sm text-slate-400">
            Upload CSV/JSON files or trigger API ingestion with automatic SHA-256 deduplication & record validation.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-2 rounded-lg text-xs text-slate-300 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Upload Widget Panel */}
      <div className="glass-panel p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <UploadCloud className="w-5 h-5 text-brand-500" />
          Upload New Dataset File
        </h3>

        {uploadSuccessMsg && (
          <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{uploadSuccessMsg}</span>
          </div>
        )}

        {uploadErrorMsg && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{uploadErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Data Source *
              </label>
              <select
                value={selectedDsId}
                onChange={(e) => setSelectedDsId(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
              >
                <option value="">Select Data Source Connector</option>
                {dsData?.dataSources?.map((ds: any) => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Dataset File (CSV / JSON)
              </label>
              <input
                type="file"
                accept=".csv,.json"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-brand-600 file:text-white hover:file:bg-brand-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-sky-500 hover:from-brand-500 hover:to-sky-400 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-lg shadow-brand-600/20 disabled:opacity-50 transition-all"
            >
              <FileUp className="w-4 h-4" />
              {uploadMutation.isPending ? 'Processing Upload...' : 'Submit Import Job'}
            </button>
          </div>
        </form>
      </div>

      {/* Imports History & Progress Table */}
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-slate-800 font-semibold text-sm text-slate-300">
          Import Processing History
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-500">Loading import logs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-slate-950/70 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Data Source</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Total Rows</th>
                  <th className="px-5 py-3.5">Valid</th>
                  <th className="px-5 py-3.5">Invalid</th>
                  <th className="px-5 py-3.5">Duplicates</th>
                  <th className="px-5 py-3.5">Checksum</th>
                  <th className="px-5 py-3.5">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {importsData?.imports?.map((imp: any) => (
                  <tr key={imp.id} className="hover:bg-slate-800/40 transition-colors text-xs">
                    <td className="px-5 py-4 font-semibold text-white">{imp.dataSource?.name}</td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full font-semibold ${
                          imp.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : imp.status === 'PROCESSING' || imp.status === 'QUEUED'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}
                      >
                        {imp.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-200">{imp.totalRows}</td>
                    <td className="px-5 py-4 font-mono text-emerald-400 font-bold">{imp.validRows}</td>
                    <td className="px-5 py-4 font-mono text-red-400">{imp.invalidRows}</td>
                    <td className="px-5 py-4 font-mono text-amber-400">{imp.duplicateRows}</td>
                    <td className="px-5 py-4 font-mono text-slate-500 text-[10px]">
                      {imp.checksum ? imp.checksum.substring(0, 12) + '...' : 'N/A'}
                    </td>
                    <td className="px-5 py-4 text-slate-400">{new Date(imp.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

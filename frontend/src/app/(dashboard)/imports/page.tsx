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
    refetchInterval: 3000,
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
        setUploadSuccessMsg('Identical file SHA-256 checksum detected; previous import preserved.');
      } else {
        setUploadSuccessMsg('Import job enqueued successfully! Queue worker is processing records.');
      }
      setUploadErrorMsg('');
      setFile(null);
    },
    onError: (err: any) => {
      setUploadErrorMsg(err.response?.data?.error?.message || 'Failed to submit import job.');
      setUploadSuccessMsg('');
    },
  });

  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDsId) {
      setUploadErrorMsg('Please select a target Data Source connector.');
      return;
    }

    const targetDs = dsData?.dataSources?.find((ds: any) => ds.id === selectedDsId);

    if (targetDs?.type !== 'API' && !file) {
      setUploadErrorMsg('Please select a CSV or JSON file to upload.');
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
    <div className="space-y-4 text-[#1f2328]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d0d7de] pb-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#1f2328]">Dataset Ingestion</h1>
          <p className="text-xs text-[#57606a] mt-0.5">
            Ingest transaction datasets with SHA-256 checksum deduplication & record validation.
          </p>
        </div>
        <button onClick={() => refetch()} className="wb-btn-secondary flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-[#57606a]" />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Upload Form Box */}
      <div className="wb-panel p-4 bg-white space-y-3">
        <h3 className="font-bold text-xs uppercase tracking-wider text-[#1f2328] font-mono flex items-center gap-1.5">
          <UploadCloud className="w-4 h-4 text-[#1f2328]" />
          Submit Ingestion Job
        </h3>

        {uploadSuccessMsg && (
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded p-2 text-xs text-[#166534] font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{uploadSuccessMsg}</span>
          </div>
        )}

        {uploadErrorMsg && (
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded p-2 text-xs text-[#991b1b] font-mono flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{uploadErrorMsg}</span>
          </div>
        )}

        <form onSubmit={handleUploadSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                Target Data Source *
              </label>
              <select
                value={selectedDsId}
                onChange={(e) => setSelectedDsId(e.target.value)}
                required
                className="w-full wb-input"
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
              <label className="block font-mono font-semibold uppercase text-[#57606a] mb-1">
                Dataset File (CSV / JSON)
              </label>
              <input
                type="file"
                accept=".csv,.json"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="w-full wb-input py-1 text-xs file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-[#1f2328] file:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="wb-btn-primary flex items-center gap-1 text-xs"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>{uploadMutation.isPending ? 'Enqueuing Job...' : 'Submit Import Job'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Imports Log Table */}
      <div className="wb-panel overflow-hidden bg-white">
        <div className="p-3 bg-[#f6f8fa] border-b border-[#d0d7de] font-mono text-xs font-semibold text-[#57606a] uppercase">
          Import Processing History
        </div>

        {isLoading ? (
          <div className="p-8 text-center font-mono text-xs text-[#57606a]">Loading import logs...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="wb-table-header">
                <tr>
                  <th className="px-3.5 py-2.5">DATA SOURCE</th>
                  <th className="px-3.5 py-2.5">STATUS</th>
                  <th className="px-3.5 py-2.5 text-right">TOTAL ROWS</th>
                  <th className="px-3.5 py-2.5 text-right">VALID</th>
                  <th className="px-3.5 py-2.5 text-right">INVALID</th>
                  <th className="px-3.5 py-2.5 text-right">DUPLICATES</th>
                  <th className="px-3.5 py-2.5">SHA-256 CHECKSUM</th>
                  <th className="px-3.5 py-2.5">CREATED AT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2f5]">
                {importsData?.imports?.map((imp: any) => (
                  <tr key={imp.id} className="wb-table-row">
                    <td className="px-3.5 py-2.5 font-medium text-[#1f2328]">{imp.dataSource?.name}</td>
                    <td className="px-3.5 py-2.5">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                          imp.status === 'COMPLETED'
                            ? 'bg-[#f0fdf4] text-[#166534] border-[#bbf7d0]'
                            : imp.status === 'PROCESSING' || imp.status === 'QUEUED'
                            ? 'bg-[#fffbe6] text-[#92400e] border-[#fef08a]'
                            : 'bg-[#fef2f2] text-[#991b1b] border-[#fecaca]'
                        }`}
                      >
                        {imp.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-right text-[#1f2328] font-bold">{imp.totalRows}</td>
                    <td className="px-3.5 py-2.5 font-mono text-right text-[#166534] font-bold">{imp.validRows}</td>
                    <td className="px-3.5 py-2.5 font-mono text-right text-[#991b1b]">{imp.invalidRows}</td>
                    <td className="px-3.5 py-2.5 font-mono text-right text-[#92400e]">{imp.duplicateRows}</td>
                    <td className="px-3.5 py-2.5 font-mono text-[#57606a] text-[10px]">
                      {imp.checksum ? imp.checksum.substring(0, 14) + '...' : 'N/A'}
                    </td>
                    <td className="px-3.5 py-2.5 font-mono text-[#57606a]">
                      {new Date(imp.createdAt).toLocaleString()}
                    </td>
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

'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, LogOut, Building, ChevronDown, Shield, FileText } from 'lucide-react';
import { api } from '../../lib/api';
import Link from 'next/link';

export function Navbar() {
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length >= 2) {
      setIsSearching(true);
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(val)}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSearchResults(null);
      setIsSearching(false);
    }
  };

  return (
    <header className="h-14 wb-header-bar px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Search Input Bar */}
      <div className="relative w-96">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#57606a] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search external ID, customer ref, exception, run name..."
            className="w-full wb-input pl-8 pr-3 py-1 text-xs"
          />
        </div>

        {/* Search Results Panel */}
        {searchResults && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#d0d7de] rounded shadow-md p-2 z-50 max-h-96 overflow-y-auto space-y-2 text-xs">
            {searchResults.reconciliations?.length > 0 && (
              <div>
                <span className="text-[10px] font-mono font-bold text-[#57606a] uppercase block mb-1 px-1">
                  Reconciliations
                </span>
                {searchResults.reconciliations.map((r: any) => (
                  <Link
                    key={r.id}
                    href={`/reconciliations/${r.id}`}
                    onClick={() => setSearchResults(null)}
                    className="block px-2 py-1 hover:bg-[#f6f8fa] rounded text-[#0969da] font-medium"
                  >
                    {r.name}
                  </Link>
                ))}
              </div>
            )}

            {searchResults.exceptions?.length > 0 && (
              <div>
                <span className="text-[10px] font-mono font-bold text-[#57606a] uppercase block mb-1 px-1">
                  Exceptions Queue
                </span>
                {searchResults.exceptions.map((exc: any) => (
                  <Link
                    key={exc.id}
                    href={`/exceptions/${exc.id}`}
                    onClick={() => setSearchResults(null)}
                    className="block px-2 py-1 hover:bg-[#f6f8fa] rounded text-[#1f2328]"
                  >
                    <span className="font-mono text-[10px] bg-amber-50 text-amber-800 border border-amber-200 px-1 py-0.5 rounded mr-1.5">
                      {exc.severity}
                    </span>
                    {exc.reason}
                  </Link>
                ))}
              </div>
            )}

            {searchResults.sourceRecords?.length > 0 && (
              <div>
                <span className="text-[10px] font-mono font-bold text-[#57606a] uppercase block mb-1 px-1">
                  Source Records
                </span>
                {searchResults.sourceRecords.map((rec: any) => (
                  <div key={rec.id} className="px-2 py-1 text-[#24292f] flex justify-between font-mono text-[11px] hover:bg-[#f6f8fa] rounded">
                    <span className="text-[#0969da]">{rec.externalId}</span>
                    <span className="text-[#57606a]">{rec.customerReference || 'No Ref'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right User & Context Badges */}
      <div className="flex items-center gap-3">
        {/* Organization / Tenant Badge */}
        <div className="flex items-center gap-1.5 bg-[#f6f8fa] border border-[#d0d7de] rounded px-2.5 py-1 text-xs text-[#24292f] font-medium">
          <Building className="w-3.5 h-3.5 text-[#57606a]" />
          <span>{user?.organizationName || 'Acme Corp'}</span>
        </div>

        {/* User Account Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 bg-white hover:bg-[#f6f8fa] px-2.5 py-1 rounded border border-[#d0d7de] text-xs transition-colors"
          >
            <div className="w-5 h-5 rounded bg-[#1f2328] text-white flex items-center justify-center font-mono font-bold text-[10px]">
              {user?.name?.[0] || 'U'}
            </div>
            <span className="font-medium text-[#1f2328]">{user?.name}</span>
            <span className="text-[10px] font-mono text-[#57606a] uppercase">({user?.role})</span>
            <ChevronDown className="w-3 h-3 text-[#57606a]" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-1 w-44 bg-white border border-[#d0d7de] rounded shadow-md py-1 z-50 text-xs">
              <div className="px-3 py-1.5 border-b border-[#e1e4e8]">
                <p className="font-semibold text-[#1f2328]">{user?.name}</p>
                <p className="text-[11px] text-[#57606a] font-mono truncate">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-red-700 hover:bg-red-50 text-left transition-colors font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

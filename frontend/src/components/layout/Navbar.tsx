'use client';

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Search, LogOut, Building, User, ChevronDown } from 'lucide-react';
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
    <header className="h-16 bg-slate-900/90 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md">
      {/* Global Search Bar */}
      <div className="relative w-96">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearch}
            placeholder="Search external IDs, customer refs, exception reasons..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Search Results Dropdown */}
        {searchResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 z-50 max-h-96 overflow-y-auto space-y-3">
            {searchResults.reconciliations.length > 0 && (
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-2">
                  Reconciliations
                </span>
                {searchResults.reconciliations.map((r: any) => (
                  <Link
                    key={r.id}
                    href={`/reconciliations/${r.id}`}
                    onClick={() => setSearchResults(null)}
                    className="block px-2 py-1.5 hover:bg-slate-800 rounded-md text-sm text-sky-400"
                  >
                    {r.name}
                  </Link>
                ))}
              </div>
            )}

            {searchResults.exceptions.length > 0 && (
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-2">
                  Exceptions
                </span>
                {searchResults.exceptions.map((exc: any) => (
                  <Link
                    key={exc.id}
                    href={`/exceptions/${exc.id}`}
                    onClick={() => setSearchResults(null)}
                    className="block px-2 py-1.5 hover:bg-slate-800 rounded-md text-sm text-slate-300"
                  >
                    <span className="font-mono text-amber-400 mr-2">[{exc.severity}]</span>
                    {exc.reason}
                  </Link>
                ))}
              </div>
            )}

            {searchResults.sourceRecords.length > 0 && (
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1.5 px-2">
                  Records
                </span>
                {searchResults.sourceRecords.map((rec: any) => (
                  <div key={rec.id} className="px-2 py-1 text-xs text-slate-300 flex justify-between">
                    <span className="font-mono text-sky-300">{rec.externalId}</span>
                    <span className="text-slate-400">{rec.customerReference || 'N/A'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User & Tenant Badge */}
      <div className="flex items-center gap-4">
        {/* Tenant Organization Pill */}
        <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-full px-3.5 py-1 text-xs font-medium text-slate-300">
          <Building className="w-3.5 h-3.5 text-brand-500" />
          <span>{user?.organizationName || 'Acme Corp'}</span>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2.5 bg-slate-800/60 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700/60 text-sm transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center font-bold text-white text-xs">
              {user?.name?.[0] || 'U'}
            </div>
            <div className="text-left hidden sm:block">
              <span className="block font-medium text-xs text-slate-200">{user?.name}</span>
              <span className="block text-[10px] text-brand-400 font-mono">{user?.role}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-xl py-1.5 z-50">
              <div className="px-4 py-2 border-b border-slate-800">
                <p className="text-xs font-medium text-slate-200">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-400 hover:bg-slate-800/80 text-left transition-colors"
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

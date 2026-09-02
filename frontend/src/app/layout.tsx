import React from 'react';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { QueryProvider } from '../components/providers/QueryProvider';

export const metadata = {
  title: 'Reconcile | Data Reconciliation & Exception Management Platform',
  description: 'Enterprise production platform for automated transaction reconciliation, exception tracking, and financial data auditability.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 font-sans antialiased">
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}

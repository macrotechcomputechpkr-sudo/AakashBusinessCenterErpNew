import { useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import LoginScreen from '@/screens/LoginScreen';
import CompanySelectorScreen from '@/screens/CompanySelectorScreen';
import MainLayout from '@/components/layout/MainLayout';
import Dashboard from '@/pages/Dashboard';
import ChartOfAccounts from '@/pages/ChartOfAccounts';
import VoucherEntry from '@/pages/VoucherEntry';
import VouchersList from '@/pages/VouchersList';
import GlEntries from '@/pages/GlEntries';
import Customers from '@/pages/Customers';
import Inventory from '@/pages/Inventory';
import StockLedger from '@/pages/StockLedger';
import DatabaseBackup from '@/pages/DatabaseBackup';
import SystemControl from '@/pages/SystemControl';
import Branches from '@/pages/Branches';
import type { PageKey } from '@/types/nav';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const { session, currentCompany, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageKey>('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f5]">
        <Loader2 className="w-8 h-8 text-[#0078d4] animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  if (!currentCompany) {
    return <CompanySelectorScreen />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'chart_of_accounts': return <ChartOfAccounts />;
      case 'voucher_entry': return <VoucherEntry />;
      case 'vouchers_list': return <VouchersList />;
      case 'gl_entries': return <GlEntries />;
      case 'customers': return <Customers />;
      case 'inventory': return <Inventory />;
      case 'stock_ledger': return <StockLedger />;
      case 'backup': return <DatabaseBackup />;
      case 'system_control': return <SystemControl />;
      case 'branches': return <Branches />;
      default: return <Dashboard />;
    }
  };

  return (
    <MainLayout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </MainLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

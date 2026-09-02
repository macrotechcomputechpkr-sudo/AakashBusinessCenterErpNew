import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { PageHeader } from './ChartOfAccounts';
import { Database, Download, Loader2, Check, AlertCircle, FileJson } from 'lucide-react';

export default function DatabaseBackup() {
  const { currentCompany } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backupData, setBackupData] = useState<any>(null);

  async function handleExport() {
    if (!currentCompany) return;
    setExporting(true);
    setError(null);
    setSuccess(null);
    setBackupData(null);
    try {
      const { data, error } = await supabase.rpc('get_company_backup', { c_uuid: currentCompany.id });
      if (error) throw new Error(error.message);
      setBackupData(data);

      // Download as JSON file
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().split('T')[0];
      a.download = `backup_${currentCompany.name.replace(/\s+/g, '_')}_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(`Backup downloaded successfully. ${countRecords(data)} total records exported.`);
    } catch (err: any) {
      setError(err.message || 'Failed to export backup');
    } finally {
      setExporting(false);
    }
  }

  function countRecords(data: any): number {
    if (!data) return 0;
    let count = 0;
    ['chart_of_accounts', 'customers', 'vendors', 'items', 'warehouses', 'stock_ledger', 'vouchers', 'voucher_lines', 'gl_entries', 'fiscal_years'].forEach((key) => {
      if (data[key] && Array.isArray(data[key])) count += data[key].length;
    });
    return count;
  }

  return (
    <div className="p-4">
      <PageHeader title="Database Backup" subtitle="Export all data for the active company" />

      <div className="bc-card mt-3 p-6 max-w-2xl">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-[#deecf9] flex items-center justify-center flex-shrink-0">
            <Database className="w-8 h-8 text-[#0078d4]" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-800 mb-1">1-Click SQL Export</h2>
            <p className="text-xs text-gray-500 mb-4">
              Export all data for <span className="font-medium text-gray-700">{currentCompany?.name}</span> as a JSON file.
              This includes chart of accounts, customers, vendors, items, vouchers, GL entries, and stock ledger.
            </p>

            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 mb-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-2 bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 mb-3">
                <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <button
              onClick={handleExport}
              disabled={exporting}
              className="bc-btn-primary"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exporting ? 'Exporting...' : 'Export Database'}
            </button>
          </div>
        </div>

        {backupData && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <h3 className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-2">
              <FileJson className="w-4 h-4" /> Backup Summary
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {['chart_of_accounts', 'customers', 'vendors', 'items', 'vouchers', 'voucher_lines', 'gl_entries', 'stock_ledger', 'warehouses', 'fiscal_years'].map((table) => (
                <div key={table} className="bc-card p-2 text-center">
                  <div className="text-lg font-bold text-[#0078d4]">{backupData[table]?.length || 0}</div>
                  <div className="text-[10px] text-gray-500 capitalize">{table.replace(/_/g, ' ')}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-400">
              Exported at: {new Date(backupData.exported_at).toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

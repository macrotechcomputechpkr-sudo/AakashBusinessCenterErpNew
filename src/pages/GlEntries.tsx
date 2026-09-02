import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';
import type { GlEntry, ChartOfAccount } from '@/types/erp';
import { PageHeader } from './ChartOfAccounts';
import { BookMarked } from 'lucide-react';

export default function GlEntries() {
  const { currentCompany, currentBranch } = useAuth();
  const [entries, setEntries] = useState<GlEntry[]>([]);
  const [accounts, setAccounts] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterAccount, setFilterAccount] = useState('');

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany?.id, currentBranch?.id]);

  async function loadData() {
    if (!currentCompany) return;
    setLoading(true);
    let glQuery = supabase.from('gl_entries').select('*').eq('company_id', currentCompany.id);
    if (currentBranch) glQuery = glQuery.eq('branch_id', currentBranch.id);
    const [glRes, accRes] = await Promise.all([
      glQuery.order('posting_date', { ascending: false }),
      supabase.from('chart_of_accounts').select('id, account_no, name').eq('company_id', currentCompany.id),
    ]);
    setEntries(glRes.data || []);
    const map = new Map<string, string>();
    (accRes.data || []).forEach((a: any) => map.set(a.id, `${a.account_no} - ${a.name}`));
    setAccounts(map);
    setLoading(false);
  }

  const cur = currentCompany?.currency || 'NPR';
  const filtered = filterAccount ? entries.filter((e) => e.account_id === filterAccount) : entries;
  const totalDebit = filtered.reduce((s, e) => s + e.debit, 0);
  const totalCredit = filtered.reduce((s, e) => s + e.credit, 0);

  if (loading) return <div className="p-6 text-xs text-gray-400">Loading general ledger...</div>;

  return (
    <div className="p-4">
      <PageHeader title="General Ledger" subtitle="All posted GL entries" />

      <div className="bc-card mt-3">
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <BookMarked className="w-4 h-4 text-[#0078d4]" />
          <select className="bc-input max-w-xs" value={filterAccount} onChange={(e) => setFilterAccount(e.target.value)}>
            <option value="">All Accounts</option>
            {Array.from(accounts.entries()).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
          <span className="text-xs text-gray-500">{filtered.length} entries</span>
        </div>

        <div className="overflow-x-auto bc-scroll max-h-[65vh]">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Posting Date</th>
                <th>Account</th>
                <th>Description</th>
                <th>Source</th>
                <th className="text-right">Debit</th>
                <th className="text-right">Credit</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-4">No GL entries found</td></tr>
              ) : filtered.map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.posting_date)}</td>
                  <td className="font-mono text-xs">{accounts.get(e.account_id) || 'N/A'}</td>
                  <td className="max-w-[200px] truncate">{e.description || '-'}</td>
                  <td><span className="bc-badge-gray">{e.source}</span></td>
                  <td className="text-right">{e.debit ? formatCurrency(e.debit, cur) : '-'}</td>
                  <td className="text-right">{e.credit ? formatCurrency(e.credit, cur) : '-'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={4} className="text-right">Totals:</td>
                <td className="text-right">{formatCurrency(totalDebit, cur)}</td>
                <td className="text-right">{formatCurrency(totalCredit, cur)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

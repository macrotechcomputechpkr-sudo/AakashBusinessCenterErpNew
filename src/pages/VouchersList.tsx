import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Voucher, VoucherLine, ChartOfAccount } from '@/types/erp';
import { VOUCHER_TYPE_LABELS } from '@/types/erp';
import { PageHeader } from './ChartOfAccounts';
import { Eye, X } from 'lucide-react';

export default function VouchersList() {
  const { currentCompany, currentBranch } = useAuth();
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Voucher | null>(null);
  const [lines, setLines] = useState<VoucherLine[]>([]);
  const [accounts, setAccounts] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany?.id, currentBranch?.id]);

  async function loadData() {
    if (!currentCompany) return;
    setLoading(true);
    let query = supabase.from('vouchers').select('*').eq('company_id', currentCompany.id);
    if (currentBranch) query = query.eq('branch_id', currentBranch.id);
    const { data } = await query.order('created_at', { ascending: false });
    setVouchers(data || []);

    const { data: accData } = await supabase
      .from('chart_of_accounts')
      .select('id, account_no, name')
      .eq('company_id', currentCompany.id);
    const map = new Map<string, string>();
    (accData || []).forEach((a: any) => map.set(a.id, `${a.account_no} - ${a.name}`));
    setAccounts(map);
    setLoading(false);
  }

  async function viewVoucher(v: Voucher) {
    setSelected(v);
    const { data } = await supabase
      .from('voucher_lines')
      .select('*')
      .eq('voucher_id', v.id)
      .order('line_no');
    setLines(data || []);
  }

  const cur = currentCompany?.currency || 'NPR';

  if (loading) return <div className="p-6 text-xs text-gray-400">Loading vouchers...</div>;

  return (
    <div className="p-4">
      <PageHeader title="Posted Vouchers" subtitle="All vouchers for the current company" />

      <div className="bc-card mt-3">
        <table className="bc-table">
          <thead>
            <tr>
              <th>Voucher No</th>
              <th>Type</th>
              <th>Posting Date</th>
              <th>Description</th>
              <th className="text-right">Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vouchers.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-gray-400 py-4">No vouchers found</td></tr>
            ) : vouchers.map((v) => (
              <tr key={v.id}>
                <td className="font-mono font-medium">{v.voucher_no}</td>
                <td>{VOUCHER_TYPE_LABELS[v.voucher_type]}</td>
                <td>{formatDate(v.posting_date)}</td>
                <td className="max-w-[200px] truncate">{v.description || '-'}</td>
                <td className="text-right font-medium">{formatCurrency(v.total_amount, cur)}</td>
                <td>
                  <span className={v.status === 'posted' ? 'bc-badge-success' : 'bc-badge-warning'}>
                    {v.status}
                  </span>
                </td>
                <td>
                  <button onClick={() => viewVoucher(v)} className="p-1 hover:bg-blue-50 text-[#0078d4]">
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Voucher Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white max-w-3xl w-full max-h-[80vh] overflow-y-auto bc-scroll" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">{selected.voucher_no}</h2>
                <p className="text-xs text-gray-500">{VOUCHER_TYPE_LABELS[selected.voucher_type]} &middot; {formatDate(selected.posting_date)}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-600 mb-3">{selected.description || 'No description'}</p>
              <table className="bc-table">
                <thead>
                  <tr>
                    <th className="w-8">#</th>
                    <th>Account</th>
                    <th>Description</th>
                    <th className="text-right">Debit</th>
                    <th className="text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.id}>
                      <td className="text-center text-gray-400">{i + 1}</td>
                      <td className="font-mono text-xs">{accounts.get(l.account_id || '') || 'N/A'}</td>
                      <td>{l.description || '-'}</td>
                      <td className="text-right">{l.debit ? formatCurrency(l.debit, cur) : '-'}</td>
                      <td className="text-right">{l.credit ? formatCurrency(l.credit, cur) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={3} className="text-right">Totals:</td>
                    <td className="text-right">{formatCurrency(lines.reduce((s, l) => s + l.debit, 0), cur)}</td>
                    <td className="text-right">{formatCurrency(lines.reduce((s, l) => s + l.credit, 0), cur)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

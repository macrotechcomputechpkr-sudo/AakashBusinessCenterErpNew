import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatNumber, formatDate } from '@/lib/format';
import type { StockLedgerEntry, Item } from '@/types/erp';
import { PageHeader } from './ChartOfAccounts';
import { Database, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight } from 'lucide-react';

export default function StockLedger() {
  const { currentCompany, currentBranch } = useAuth();
  const [entries, setEntries] = useState<StockLedgerEntry[]>([]);
  const [items, setItems] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filterItem, setFilterItem] = useState('');

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany?.id, currentBranch?.id]);

  async function loadData() {
    if (!currentCompany) return;
    setLoading(true);
    let slQuery = supabase.from('stock_ledger').select('*').eq('company_id', currentCompany.id);
    if (currentBranch) slQuery = slQuery.eq('branch_id', currentBranch.id);
    let itemQuery = supabase.from('items').select('id, code, description').eq('company_id', currentCompany.id);
    if (currentBranch) itemQuery = itemQuery.or(`branch_id.eq.${currentBranch.id},branch_id.is.null`);
    const [slRes, itemRes] = await Promise.all([
      slQuery.order('posting_date', { ascending: false }),
      itemQuery,
    ]);
    setEntries(slRes.data || []);
    const map = new Map<string, string>();
    (itemRes.data || []).forEach((i: any) => map.set(i.id, `${i.code} - ${i.description}`));
    setItems(map);
    setLoading(false);
  }

  const filtered = filterItem ? entries.filter((e) => e.item_id === filterItem) : entries;

  const movementIcons: Record<string, any> = {
    inward: ArrowDownCircle,
    outward: ArrowUpCircle,
    transfer: ArrowLeftRight,
  };
  const movementColors: Record<string, string> = {
    inward: 'text-green-600',
    outward: 'text-red-600',
    transfer: 'text-blue-600',
  };

  if (loading) return <div className="p-6 text-xs text-gray-400">Loading stock ledger...</div>;

  return (
    <div className="p-4">
      <PageHeader title="Stock Ledger" subtitle="Real-time stock movements (inward, outward, transfer)" />

      <div className="bc-card mt-3">
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center gap-3">
          <Database className="w-4 h-4 text-[#0078d4]" />
          <select className="bc-input max-w-xs" value={filterItem} onChange={(e) => setFilterItem(e.target.value)}>
            <option value="">All Items</option>
            {Array.from(items.entries()).map(([id, name]) => (
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
                <th>Item</th>
                <th>Type</th>
                <th className="text-right">Quantity</th>
                <th className="text-right">Balance After</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-4">No stock movements found. Post a sales or purchase invoice to see entries here.</td></tr>
              ) : filtered.map((e) => {
                const Icon = movementIcons[e.movement_type];
                return (
                  <tr key={e.id}>
                    <td>{formatDate(e.posting_date)}</td>
                    <td className="font-mono text-xs">{items.get(e.item_id) || 'N/A'}</td>
                    <td>
                      <span className={`flex items-center gap-1 ${movementColors[e.movement_type]}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {e.movement_type}
                      </span>
                    </td>
                    <td className={`text-right font-medium ${e.quantity >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {e.quantity > 0 ? '+' : ''}{formatNumber(e.quantity)}
                    </td>
                    <td className="text-right">{formatNumber(e.balance_after)}</td>
                    <td className="font-mono text-xs">{e.reference || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

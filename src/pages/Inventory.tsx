import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { Item } from '@/types/erp';
import { PageHeader } from './ChartOfAccounts';
import { Plus, Trash2, Package, AlertTriangle, AlertCircle } from 'lucide-react';

export default function Inventory() {
  const { currentCompany, currentBranch } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', description: '', unit_cost: '0', sales_price: '0', category: '', reorder_point: '0', quantity_on_hand: '0' });

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany?.id, currentBranch?.id]);

  async function loadData() {
    if (!currentCompany) return;
    setLoading(true);
    let query = supabase.from('items').select('*').eq('company_id', currentCompany.id);
    if (currentBranch) query = query.or(`branch_id.eq.${currentBranch.id},branch_id.is.null`);
    const { data } = await query.order('code');
    setItems(data || []);
    setLoading(false);
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCompany || !form.code || !form.description) return;
    setError(null);
    const { error } = await supabase.from('items').insert({
      company_id: currentCompany.id,
      branch_id: currentBranch?.id || null,
      code: form.code,
      description: form.description,
      unit_cost: parseFloat(form.unit_cost) || 0,
      sales_price: parseFloat(form.sales_price) || 0,
      category: form.category || null,
      reorder_point: parseInt(form.reorder_point) || 0,
      quantity_on_hand: parseFloat(form.quantity_on_hand) || 0,
    });
    if (error) { setError(error.message); return; }
    setForm({ code: '', description: '', unit_cost: '0', sales_price: '0', category: '', reorder_point: '0', quantity_on_hand: '0' });
    setShowForm(false);
    loadData();
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this item?')) return;
    await supabase.from('items').delete().eq('id', id);
    loadData();
  }

  const cur = currentCompany?.currency || 'NPR';
  const totalValue = items.reduce((s, i) => s + i.quantity_on_hand * i.unit_cost, 0);
  const lowStock = items.filter((i) => i.quantity_on_hand <= i.reorder_point);

  if (loading) return <div className="p-6 text-xs text-gray-400">Loading inventory...</div>;

  return (
    <div className="p-4">
      <PageHeader title="Item Master" subtitle="Inventory items with stock levels and reorder points" />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bc-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#deecf9] flex items-center justify-center"><Package className="w-5 h-5 text-[#0078d4]" /></div>
          <div><div className="text-lg font-bold">{items.length}</div><div className="text-xs text-gray-500">Total Items</div></div>
        </div>
        <div className="bc-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 flex items-center justify-center"><span className="text-sm font-bold text-[#0078d4]">{cur}</span></div>
          <div><div className="text-sm font-bold">{formatCurrency(totalValue, cur)}</div><div className="text-xs text-gray-500">Stock Value</div></div>
        </div>
        <div className="bc-card p-3 flex items-center gap-3">
          <div className={`w-10 h-10 flex items-center justify-center ${lowStock.length > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
            <AlertTriangle className={`w-5 h-5 ${lowStock.length > 0 ? 'text-amber-600' : 'text-green-600'}`} />
          </div>
          <div><div className="text-lg font-bold">{lowStock.length}</div><div className="text-xs text-gray-500">Low Stock</div></div>
        </div>
      </div>

      <div className="bc-card">
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-600">Items ({items.length})</h2>
          <button onClick={() => setShowForm(!showForm)} className="bc-btn-primary">
            <Plus className="w-3.5 h-3.5" /> New Item
          </button>
        </div>

        {showForm && (
          <form onSubmit={addItem} className="p-3 border-b border-gray-200 bg-blue-50/50">
            {error && <div className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</div>}
            <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
              <input className="bc-input" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <input className="bc-input md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <input className="bc-input" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              <input className="bc-input" type="number" placeholder="Unit Cost" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} />
              <input className="bc-input" type="number" placeholder="Sales Price" value={form.sales_price} onChange={(e) => setForm({ ...form, sales_price: e.target.value })} />
              <input className="bc-input" type="number" placeholder="Reorder Pt" value={form.reorder_point} onChange={(e) => setForm({ ...form, reorder_point: e.target.value })} />
              <input className="bc-input" type="number" placeholder="Qty on Hand" value={form.quantity_on_hand} onChange={(e) => setForm({ ...form, quantity_on_hand: e.target.value })} />
              <div className="md:col-span-6" />
              <button type="submit" className="bc-btn-primary">Save</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto bc-scroll">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Description</th>
                <th>Category</th>
                <th className="text-right">Unit Cost</th>
                <th className="text-right">Sales Price</th>
                <th className="text-right">On Hand</th>
                <th className="text-right">Reorder Pt</th>
                <th className="text-right">Stock Value</th>
                <th>Status</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={10} className="text-center text-gray-400 py-4">No items found</td></tr>
              ) : items.map((i) => {
                const isLow = i.quantity_on_hand <= i.reorder_point;
                return (
                  <tr key={i.id}>
                    <td className="font-mono">{i.code}</td>
                    <td className="font-medium">{i.description}</td>
                    <td>{i.category || '-'}</td>
                    <td className="text-right">{formatCurrency(i.unit_cost, cur)}</td>
                    <td className="text-right">{formatCurrency(i.sales_price, cur)}</td>
                    <td className="text-right font-medium">{formatNumber(i.quantity_on_hand)}</td>
                    <td className="text-right">{i.reorder_point}</td>
                    <td className="text-right">{formatCurrency(i.quantity_on_hand * i.unit_cost, cur)}</td>
                    <td>{isLow ? <span className="bc-badge-warning">Low Stock</span> : <span className="bc-badge-success">OK</span>}</td>
                    <td>
                      <button onClick={() => deleteItem(i.id)} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
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

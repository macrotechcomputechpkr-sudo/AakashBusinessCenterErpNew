import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, formatNumber } from '@/lib/format';
import type { Item } from '@/types/erp';
import { ITEM_TYPE_LABELS, TAX_CATEGORY_LABELS, VALUATION_METHOD_LABELS, UOM_OPTIONS } from '@/types/erp';
import { PageHeader } from './ChartOfAccounts';
import {
  Plus, Trash2, Package, AlertTriangle, AlertCircle, Search, Pencil, X,
  FileText, Barcode, Tag, Box, Layers, Percent, DollarSign, Scale,
  Building2, ChevronDown, ChevronRight, Download,
} from 'lucide-react';

const emptyForm = {
  code: '', description: '', category: '', uom: 'PCS',
  item_type: 'goods' as Item['item_type'], hsn_code: '', barcode: '',
  tax_category: 'standard' as Item['tax_category'], gst_rate: '13',
  unit_cost: '0', sales_price: '0', mrp: '0', wholesale_price: '0',
  discount_percent: '0', brand: '', valuation_method: 'fifo' as Item['valuation_method'],
  weight: '', weight_unit: 'KG', min_stock: '0', max_stock: '0',
  reorder_point: '0', reorder_qty: '0', quantity_on_hand: '0', opening_stock: '0',
  batch_tracked: false, expiry_tracked: false, is_active: true,
};

export default function Inventory() {
  const { currentCompany, currentBranch } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => { if (currentCompany) loadData(); }, [currentCompany?.id, currentBranch?.id]);

  async function loadData() {
    if (!currentCompany) return;
    setLoading(true);
    let query = supabase.from('items').select('*').eq('company_id', currentCompany.id);
    if (currentBranch) query = query.or(`branch_id.eq.${currentBranch.id},branch_id.is.null`);
    const { data } = await query.order('code');
    setItems((data as Item[]) || []);
    setLoading(false);
  }

  function openNew() {
    setForm({ ...emptyForm });
    setEditingItem(null);
    setShowForm(true);
  }

  function openEdit(item: Item) {
    setForm({
      code: item.code, description: item.description, category: item.category || '',
      uom: item.uom, item_type: item.item_type, hsn_code: item.hsn_code || '',
      barcode: item.barcode || '', tax_category: item.tax_category,
      gst_rate: String(item.gst_rate), unit_cost: String(item.unit_cost),
      sales_price: String(item.sales_price), mrp: String(item.mrp),
      wholesale_price: String(item.wholesale_price), discount_percent: String(item.discount_percent),
      brand: item.brand || '', valuation_method: item.valuation_method,
      weight: item.weight ? String(item.weight) : '', weight_unit: item.weight_unit || 'KG',
      min_stock: String(item.min_stock), max_stock: String(item.max_stock),
      reorder_point: String(item.reorder_point), reorder_qty: String(item.reorder_qty),
      quantity_on_hand: String(item.quantity_on_hand), opening_stock: String(item.opening_stock),
      batch_tracked: item.batch_tracked, expiry_tracked: item.expiry_tracked, is_active: item.is_active,
    });
    setEditingItem(item);
    setShowForm(true);
  }

  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCompany || !form.code || !form.description) { setError('Code and Description are required'); return; }
    setSaving(true); setError(null);
    const payload = {
      company_id: currentCompany.id, branch_id: currentBranch?.id || null,
      code: form.code, description: form.description, category: form.category || null,
      uom: form.uom, item_type: form.item_type, hsn_code: form.hsn_code || null,
      barcode: form.barcode || null, tax_category: form.tax_category,
      gst_rate: parseFloat(form.gst_rate) || 0, unit_cost: parseFloat(form.unit_cost) || 0,
      sales_price: parseFloat(form.sales_price) || 0, mrp: parseFloat(form.mrp) || 0,
      wholesale_price: parseFloat(form.wholesale_price) || 0, discount_percent: parseFloat(form.discount_percent) || 0,
      brand: form.brand || null, valuation_method: form.valuation_method,
      weight: form.weight ? parseFloat(form.weight) : null, weight_unit: form.weight || null ? form.weight_unit : null,
      min_stock: parseFloat(form.min_stock) || 0, max_stock: parseFloat(form.max_stock) || 0,
      reorder_point: parseFloat(form.reorder_point) || 0, reorder_qty: parseFloat(form.reorder_qty) || 0,
      quantity_on_hand: parseFloat(form.quantity_on_hand) || 0, opening_stock: parseFloat(form.opening_stock) || 0,
      batch_tracked: form.batch_tracked, expiry_tracked: form.expiry_tracked, is_active: form.is_active,
    };
    let result;
    if (editingItem) result = await supabase.from('items').update(payload).eq('id', editingItem.id);
    else result = await supabase.from('items').insert(payload);
    if (result.error) { setError(result.error.message); setSaving(false); return; }
    setShowForm(false); setSaving(false); loadData();
  }

  async function deleteItem(id: string) {
    if (!confirm('Delete this item? This cannot be undone.')) return;
    await supabase.from('items').delete().eq('id', id);
    loadData();
  }

  function exportCSV() {
    const headers = ['Code','Description','Type','UOM','Category','Brand','HSN','Barcode','Tax Category','GST%','Unit Cost','Sales Price','MRP','Wholesale','Discount%','On Hand','Min','Max','Reorder Pt','Reorder Qty','Opening','Valuation','Batch','Expiry','Active'];
    const rows = items.map((i) => [
      i.code, i.description.replace(/,/g, ';'), i.item_type, i.uom, i.category || '', i.brand || '',
      i.hsn_code || '', i.barcode || '', i.tax_category, i.gst_rate,
      i.unit_cost, i.sales_price, i.mrp, i.wholesale_price, i.discount_percent,
      i.quantity_on_hand, i.min_stock, i.max_stock, i.reorder_point, i.reorder_qty,
      i.opening_stock, i.valuation_method, i.batch_tracked ? 'Y' : 'N', i.expiry_tracked ? 'Y' : 'N',
      i.is_active ? 'Y' : 'N',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `items_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  function toggleRow(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const cur = currentCompany?.currency || 'NPR';
  const totalValue = items.reduce((s, i) => s + i.quantity_on_hand * i.unit_cost, 0);
  const lowStock = items.filter((i) => i.quantity_on_hand <= i.reorder_point && i.is_active);
  const overStock = items.filter((i) => i.max_stock > 0 && i.quantity_on_hand > i.max_stock);
  const filtered = items.filter((i) => {
    const typeMatch = typeFilter === 'all' || i.item_type === typeFilter;
    const q = search.toLowerCase();
    const searchMatch = !q || i.code.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q) || (i.brand || '').toLowerCase().includes(q) ||
      (i.hsn_code || '').toLowerCase().includes(q) || (i.barcode || '').toLowerCase().includes(q);
    return typeMatch && searchMatch;
  });

  if (loading) return <div className="p-6 text-xs text-gray-400">Loading inventory...</div>;

  return (
    <div className="p-4">
      <PageHeader title="Item Master" subtitle="Full inventory management with UOM, tax, HSN, batch, valuation & pricing" />

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div className="bc-card p-3 flex items-center gap-2.5">
          <div className="w-9 h-9 bg-[#deecf9] flex items-center justify-center"><Package className="w-5 h-5 text-[#0078d4]" /></div>
          <div><div className="text-sm font-bold">{items.length}</div><div className="text-[10px] text-gray-500">Total Items</div></div>
        </div>
        <div className="bc-card p-3 flex items-center gap-2.5">
          <div className="w-9 h-9 bg-blue-50 flex items-center justify-center"><span className="text-xs font-bold text-[#0078d4]">{cur}</span></div>
          <div><div className="text-sm font-bold">{formatCurrency(totalValue, cur)}</div><div className="text-[10px] text-gray-500">Stock Value</div></div>
        </div>
        <div className="bc-card p-3 flex items-center gap-2.5">
          <div className={`w-9 h-9 flex items-center justify-center ${lowStock.length > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
            <AlertTriangle className={`w-5 h-5 ${lowStock.length > 0 ? 'text-amber-600' : 'text-green-600'}`} />
          </div>
          <div><div className="text-sm font-bold">{lowStock.length}</div><div className="text-[10px] text-gray-500">Low Stock</div></div>
        </div>
        <div className="bc-card p-3 flex items-center gap-2.5">
          <div className="w-9 h-9 bg-orange-50 flex items-center justify-center"><Box className="w-5 h-5 text-orange-600" /></div>
          <div><div className="text-sm font-bold">{overStock.length}</div><div className="text-[10px] text-gray-500">Over Stock</div></div>
        </div>
      </div>

      <div className="bc-card">
        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-2">
          <button onClick={openNew} className="bc-btn-primary"><Plus className="w-3.5 h-3.5" /> New Item</button>
          <button onClick={exportCSV} className="bc-btn-secondary"><Download className="w-3.5 h-3.5" /> Export CSV</button>

          <div className="w-px h-5 bg-gray-300" />

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="bc-input pl-7 w-56" placeholder="Search code, name, brand, HSN, barcode..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <select className="bc-input w-36" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="goods">Goods</option>
            <option value="service">Service</option>
            <option value="non-inventory">Non-Inventory</option>
            <option value="assembly">Assembly</option>
          </select>

          <span className="text-xs text-gray-500 ml-auto">{filtered.length} items</span>
        </div>

        {/* Form */}
        {showForm && (
          <div className="border-b border-gray-300 bg-blue-50">
            <div className="px-4 py-2 bg-[#0078d4] text-white flex items-center justify-between">
              <span className="text-sm font-semibold">{editingItem ? `Edit Item: ${editingItem.code} - ${editingItem.description}` : 'Create New Item'}</span>
              <button type="button" onClick={() => { setShowForm(false); setError(null); }} className="p-1 hover:bg-white/20 rounded">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            <form onSubmit={saveItem} className="p-4">
              {error && <div className="text-xs text-red-600 mb-3 bg-red-50 border border-red-200 px-3 py-2 flex items-center gap-2"><AlertCircle className="w-3.5 h-3.5" />{error}</div>}

              {/* Section: Basic Info */}
              <FormSection title="Basic Information" icon={Package}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="bc-label">Code *</label>
                    <input className="bc-input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. ITM001" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="bc-label">Description *</label>
                    <input className="bc-input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Item name / description" />
                  </div>
                  <div>
                    <label className="bc-label">Item Type</label>
                    <select className="bc-input" value={form.item_type} onChange={(e) => setForm({ ...form, item_type: e.target.value as Item['item_type'] })}>
                      {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="bc-label">Category</label>
                    <input className="bc-input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Electronics" />
                  </div>
                  <div>
                    <label className="bc-label">Brand</label>
                    <input className="bc-input" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} placeholder="e.g. Samsung" />
                  </div>
                  <div>
                    <label className="bc-label">Barcode / SKU</label>
                    <div className="relative">
                      <Barcode className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input className="bc-input pl-7" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Scan or enter" />
                    </div>
                  </div>
                  <div>
                    <label className="bc-label">HSN / SAC Code</label>
                    <input className="bc-input" value={form.hsn_code} onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} placeholder="e.g. 8517" />
                  </div>
                </div>
              </FormSection>

              {/* Section: Units & Measurement */}
              <FormSection title="Units & Measurement" icon={Scale}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="bc-label">Unit of Measure</label>
                    <select className="bc-input" value={form.uom} onChange={(e) => setForm({ ...form, uom: e.target.value })}>
                      {UOM_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="bc-label">Weight</label>
                    <input className="bc-input" type="number" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="bc-label">Weight Unit</label>
                    <input className="bc-input" value={form.weight_unit} onChange={(e) => setForm({ ...form, weight_unit: e.target.value })} placeholder="KG" />
                  </div>
                  <div>
                    <label className="bc-label">Valuation Method</label>
                    <select className="bc-input" value={form.valuation_method} onChange={(e) => setForm({ ...form, valuation_method: e.target.value as Item['valuation_method'] })}>
                      {Object.entries(VALUATION_METHOD_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                </div>
              </FormSection>

              {/* Section: Tax */}
              <FormSection title="Tax Configuration" icon={Tag}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="bc-label">Tax Category</label>
                    <select className="bc-input" value={form.tax_category} onChange={(e) => setForm({ ...form, tax_category: e.target.value as Item['tax_category'] })}>
                      {Object.entries(TAX_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="bc-label">Tax / GST Rate %</label>
                    <input className="bc-input" type="number" value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: e.target.value })} placeholder="13" />
                  </div>
                </div>
              </FormSection>

              {/* Section: Pricing */}
              <FormSection title="Pricing" icon={DollarSign}>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="bc-label">Unit Cost</label>
                    <input className="bc-input" type="number" value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="bc-label">Sales Price</label>
                    <input className="bc-input" type="number" value={form.sales_price} onChange={(e) => setForm({ ...form, sales_price: e.target.value })} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="bc-label">MRP (Max Retail)</label>
                    <input className="bc-input" type="number" value={form.mrp} onChange={(e) => setForm({ ...form, mrp: e.target.value })} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="bc-label">Wholesale Price</label>
                    <input className="bc-input" type="number" value={form.wholesale_price} onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })} placeholder="0.00" />
                  </div>
                  <div>
                    <label className="bc-label">Discount %</label>
                    <input className="bc-input" type="number" value={form.discount_percent} onChange={(e) => setForm({ ...form, discount_percent: e.target.value })} placeholder="0" />
                  </div>
                </div>
              </FormSection>

              {/* Section: Stock Levels */}
              <FormSection title="Stock Levels & Reorder" icon={Box}>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <label className="bc-label">Qty On Hand</label>
                    <input className="bc-input" type="number" value={form.quantity_on_hand} onChange={(e) => setForm({ ...form, quantity_on_hand: e.target.value })} placeholder="0" />
                  </div>
                  <div>
                    <label className="bc-label">Opening Stock</label>
                    <input className="bc-input" type="number" value={form.opening_stock} onChange={(e) => setForm({ ...form, opening_stock: e.target.value })} placeholder="0" />
                  </div>
                  <div>
                    <label className="bc-label">Min Stock Level</label>
                    <input className="bc-input" type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} placeholder="0" />
                  </div>
                  <div>
                    <label className="bc-label">Max Stock Level</label>
                    <input className="bc-input" type="number" value={form.max_stock} onChange={(e) => setForm({ ...form, max_stock: e.target.value })} placeholder="0" />
                  </div>
                  <div>
                    <label className="bc-label">Reorder Qty</label>
                    <input className="bc-input" type="number" value={form.reorder_qty} onChange={(e) => setForm({ ...form, reorder_qty: e.target.value })} placeholder="0" />
                  </div>
                  <div>
                    <label className="bc-label">Reorder Point</label>
                    <input className="bc-input" type="number" value={form.reorder_point} onChange={(e) => setForm({ ...form, reorder_point: e.target.value })} placeholder="0" />
                  </div>
                </div>
              </FormSection>

              {/* Section: Tracking */}
              <FormSection title="Tracking & Status" icon={Layers}>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={form.batch_tracked} onChange={(e) => setForm({ ...form, batch_tracked: e.target.checked })} className="w-3.5 h-3.5 accent-[#0078d4]" />
                    Batch Tracking
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={form.expiry_tracked} onChange={(e) => setForm({ ...form, expiry_tracked: e.target.checked })} className="w-3.5 h-3.5 accent-[#0078d4]" />
                    Expiry Date Tracking
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="w-3.5 h-3.5 accent-[#0078d4]" />
                    Active
                  </label>
                </div>
              </FormSection>

              <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-gray-100">
                <button type="button" onClick={() => { setShowForm(false); setError(null); }} className="bc-btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="bc-btn-primary">
                  {saving ? 'Saving...' : editingItem ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto bc-scroll max-h-[60vh]">
          <table className="bc-table">
            <thead>
              <tr>
                <th className="w-8"></th>
                <th>Code</th>
                <th>Description</th>
                <th>Type</th>
                <th>UOM</th>
                <th>Category</th>
                <th className="text-right">GST%</th>
                <th className="text-right">Unit Cost</th>
                <th className="text-right">Sales Price</th>
                <th className="text-right">MRP</th>
                <th className="text-right">On Hand</th>
                <th className="text-right">Stock Value</th>
                <th>Status</th>
                <th className="w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={14} className="text-center text-gray-400 py-6">
                  {items.length === 0 ? 'No items found. Click "New Item" to create one.' : 'No items match your search.'}
                </td></tr>
              ) : filtered.map((i) => {
                const isLow = i.quantity_on_hand <= i.reorder_point;
                const isOver = i.max_stock > 0 && i.quantity_on_hand > i.max_stock;
                const isExpanded = expandedRows.has(i.id);
                return (
                  <>
                    <tr key={i.id} className={`cursor-pointer hover:bg-blue-50 ${!i.is_active ? 'opacity-50' : ''}`} onClick={() => toggleRow(i.id)}>
                      <td className="text-center">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 inline" /> : <ChevronRight className="w-3.5 h-3.5 inline" />}
                      </td>
                      <td className="font-mono text-xs">{i.code}</td>
                      <td className="font-medium text-xs">{i.description}</td>
                      <td className="text-xs">{ITEM_TYPE_LABELS[i.item_type]?.split(' ')[0] || i.item_type}</td>
                      <td className="text-xs">{i.uom}</td>
                      <td className="text-xs">{i.category || '-'}</td>
                      <td className="text-right text-xs">{i.gst_rate}%</td>
                      <td className="text-right text-xs">{formatCurrency(i.unit_cost, cur)}</td>
                      <td className="text-right text-xs">{formatCurrency(i.sales_price, cur)}</td>
                      <td className="text-right text-xs">{i.mrp > 0 ? formatCurrency(i.mrp, cur) : '-'}</td>
                      <td className={`text-right text-xs font-medium ${isLow ? 'text-amber-700' : isOver ? 'text-orange-700' : ''}`}>{formatNumber(i.quantity_on_hand)}</td>
                      <td className="text-right text-xs">{formatCurrency(i.quantity_on_hand * i.unit_cost, cur)}</td>
                      <td>
                        {isLow ? <span className="bc-badge-warning text-[10px]">Low</span> :
                         isOver ? <span className="bc-badge bg-orange-100 text-orange-700 text-[10px]">Over</span> :
                         <span className="bc-badge-success text-[10px]">OK</span>}
                      </td>
                      <td>
                        <div className="flex items-center gap-0.5">
                          <button onClick={(e) => { e.stopPropagation(); openEdit(i); }} className="p-1 hover:bg-blue-100 text-gray-400 hover:text-[#0078d4] rounded"><Pencil className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); deleteItem(i.id); }} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={14} className="p-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <DetailField label="Brand" value={i.brand || '-'} />
                            <DetailField label="HSN/SAC" value={i.hsn_code || '-'} />
                            <DetailField label="Barcode" value={i.barcode || '-'} />
                            <DetailField label="Tax Category" value={TAX_CATEGORY_LABELS[i.tax_category] || i.tax_category} />
                            <DetailField label="Wholesale Price" value={i.wholesale_price > 0 ? formatCurrency(i.wholesale_price, cur) : '-'} />
                            <DetailField label="Discount %" value={i.discount_percent > 0 ? `${i.discount_percent}%` : '-'} />
                            <DetailField label="Valuation" value={VALUATION_METHOD_LABELS[i.valuation_method] || i.valuation_method} />
                            <DetailField label="Weight" value={i.weight ? `${i.weight} ${i.weight_unit || ''}` : '-'} />
                            <DetailField label="Min Stock" value={formatNumber(i.min_stock)} />
                            <DetailField label="Max Stock" value={i.max_stock > 0 ? formatNumber(i.max_stock) : '-'} />
                            <DetailField label="Reorder Point" value={formatNumber(i.reorder_point)} />
                            <DetailField label="Reorder Qty" value={i.reorder_qty > 0 ? formatNumber(i.reorder_qty) : '-'} />
                            <DetailField label="Opening Stock" value={formatNumber(i.opening_stock)} />
                            <DetailField label="Batch Tracked" value={i.batch_tracked ? 'Yes' : 'No'} />
                            <DetailField label="Expiry Tracked" value={i.expiry_tracked ? 'Yes' : 'No'} />
                            <DetailField label="Active" value={i.is_active ? 'Yes' : 'No'} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">
        <Icon className="w-3.5 h-3.5 text-[#0078d4]" />
        {title}
      </div>
      {children}
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400">{label}:</span> <span className="font-medium text-gray-700">{value}</span>
    </div>
  );
}

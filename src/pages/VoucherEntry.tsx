import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency, getTodayDateString } from '@/lib/format';
import type { ChartOfAccount, Customer, Vendor, Item, VoucherType, VoucherLine } from '@/types/erp';
import { VOUCHER_TYPE_LABELS } from '@/types/erp';
import { PageHeader } from './ChartOfAccounts';
import { Plus, Trash2, Check, AlertCircle, Loader2, Save } from 'lucide-react';

interface DraftLine {
  id: string;
  account_id: string;
  item_id: string;
  description: string;
  debit: number;
  credit: number;
  quantity: number;
}

const VAT_RATE = 0.13;

export default function VoucherEntry() {
  const { currentCompany, currentBranch } = useAuth();
  const [voucherType, setVoucherType] = useState<VoucherType>('sales_invoice');
  const [postingDate, setPostingDate] = useState(getTodayDateString());
  const [description, setDescription] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([newLine()]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fiscalStatus, setFiscalStatus] = useState<string>('open');
  const inputRefs = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());

  function newLine(): DraftLine {
    return { id: crypto.randomUUID(), account_id: '', item_id: '', description: '', debit: 0, credit: 0, quantity: 0 };
  }

  useEffect(() => {
    if (currentCompany) loadMasterData();
  }, [currentCompany?.id, currentBranch?.id]);

  useEffect(() => {
    if (currentCompany && postingDate) checkFiscalYear();
  }, [currentCompany?.id, postingDate]);

  async function loadMasterData() {
    if (!currentCompany) return;
    setLoading(true);
    let custQuery = supabase.from('customers').select('*').eq('company_id', currentCompany.id);
    if (currentBranch) custQuery = custQuery.or(`branch_id.eq.${currentBranch.id},branch_id.is.null`);
    let vendQuery = supabase.from('vendors').select('*').eq('company_id', currentCompany.id);
    if (currentBranch) vendQuery = vendQuery.or(`branch_id.eq.${currentBranch.id},branch_id.is.null`);
    let itemQuery = supabase.from('items').select('*').eq('company_id', currentCompany.id);
    if (currentBranch) itemQuery = itemQuery.or(`branch_id.eq.${currentBranch.id},branch_id.is.null`);
    const [accRes, custRes, vendRes, itemRes] = await Promise.all([
      supabase.from('chart_of_accounts').select('*').eq('company_id', currentCompany.id).eq('is_posting', true).order('account_no'),
      custQuery.order('code'),
      vendQuery.order('code'),
      itemQuery.order('code'),
    ]);
    setAccounts(accRes.data || []);
    setCustomers(custRes.data || []);
    setVendors(vendRes.data || []);
    setItems(itemRes.data || []);
    setLoading(false);
  }

  async function checkFiscalYear() {
    if (!currentCompany) return;
    const { data } = await supabase
      .from('fiscal_years')
      .select('status')
      .eq('company_id', currentCompany.id)
      .lte('start_date', postingDate)
      .gte('end_date', postingDate)
      .maybeSingle();
    setFiscalStatus(data?.status || 'unknown');
  }

  const totalDebit = lines.reduce((s, l) => s + (l.debit || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  function updateLine(id: string, field: keyof DraftLine, value: any) {
    setLines((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      const updated = { ...l, [field]: value };
      // Auto-fill from item selection
      if (field === 'item_id' && value) {
        const item = items.find((i) => i.id === value);
        if (item) {
          updated.quantity = updated.quantity || 1;
          if (voucherType === 'sales_invoice') {
            updated.debit = item.sales_price * updated.quantity;
            updated.credit = 0;
            updated.description = updated.description || item.description;
          } else if (voucherType === 'purchase_invoice') {
            updated.credit = item.unit_cost * updated.quantity;
            updated.debit = 0;
            updated.description = updated.description || item.description;
          }
        }
      }
      // Recalculate when quantity changes for item lines
      if (field === 'quantity' && l.item_id) {
        const item = items.find((i) => i.id === l.item_id);
        if (item) {
          if (voucherType === 'sales_invoice') updated.debit = item.sales_price * value;
          else if (voucherType === 'purchase_invoice') updated.credit = item.unit_cost * value;
        }
      }
      return updated;
    }));
  }

  function addLine() {
    setLines((prev) => [...prev, newLine()]);
  }

  function removeLine(id: string) {
    setLines((prev) => prev.length > 1 ? prev.filter((l) => l.id !== id) : prev);
  }

  // Auto-generate sales invoice lines
  function autoFillSalesInvoice() {
    if (voucherType !== 'sales_invoice' || !customerId || lines.length === 0) return;
    const arAccount = accounts.find((a) => a.account_no === '1100');
    const salesAccount = accounts.find((a) => a.account_no === '4010');
    const vatAccount = accounts.find((a) => a.account_no === '2020');
    if (!arAccount || !salesAccount) return;

    const itemLines = lines.filter((l) => l.item_id);
    if (itemLines.length === 0) return;

    const subtotal = itemLines.reduce((s, l) => s + l.debit, 0);
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;

    const newLines: DraftLine[] = [
      ...itemLines.map((l) => ({ ...l, credit: 0 })),
      { id: crypto.randomUUID(), account_id: arAccount.id, item_id: '', description: 'Accounts Receivable', debit: total, credit: 0, quantity: 0 },
      { id: crypto.randomUUID(), account_id: salesAccount.id, item_id: '', description: 'Sales Revenue', debit: 0, credit: subtotal, quantity: 0 },
    ];

    if (vatAccount) {
      newLines.push({ id: crypto.randomUUID(), account_id: vatAccount.id, item_id: '', description: 'VAT Payable (13%)', debit: 0, credit: vat, quantity: 0 });
    }

    setLines(newLines);
  }

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'F2') {
      e.preventDefault();
      handlePost();
    } else if (e.key === 'F3') {
      e.preventDefault();
      addLine();
    }
  }, [lines, voucherType, postingDate, description, customerId, vendorId]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Enter key moves focus to next input
  function handleInputKeyDown(e: React.KeyboardEvent, nextRefId?: string) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextRefId) {
        const el = inputRefs.current.get(nextRefId);
        el?.focus();
      }
    }
  }

  async function handlePost() {
    if (!currentCompany) return;
    setError(null);
    setSuccess(null);

    if (fiscalStatus === 'closed') { setError('Fiscal year is closed. Cannot post to a closed period.'); return; }
    if (fiscalStatus === 'unknown') { setError('No fiscal year found for the selected posting date.'); return; }
    if (!isBalanced) { setError('Voucher is not balanced. Debits must equal credits.'); return; }
    if (lines.some((l) => !l.account_id)) { setError('All lines must have an account selected.'); return; }

    setPosting(true);
    try {
      // Generate voucher number
      const prefix = voucherType === 'sales_invoice' ? 'SI' : voucherType === 'purchase_invoice' ? 'PI' : voucherType === 'journal' ? 'JV' : voucherType === 'receipt' ? 'RV' : 'PV';
      const { count } = await supabase
        .from('vouchers')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', currentCompany.id)
        .eq('voucher_type', voucherType);
      const voucherNo = `${prefix}-${String((count || 0) + 1).padStart(5, '0')}`;

      // Create voucher
      const { data: voucher, error: vError } = await supabase
        .from('vouchers')
        .insert({
          company_id: currentCompany.id,
          branch_id: currentBranch?.id || null,
          voucher_no: voucherNo,
          voucher_type: voucherType,
          posting_date: postingDate,
          description: description || `${VOUCHER_TYPE_LABELS[voucherType]} ${voucherNo}`,
          total_amount: totalDebit,
          status: 'draft',
          customer_id: customerId || null,
          vendor_id: vendorId || null,
        })
        .select()
        .single();

      if (vError) throw new Error(vError.message);

      // Create voucher lines
      const vLines = lines.map((l, i) => ({
        voucher_id: voucher.id,
        account_id: l.account_id,
        item_id: l.item_id || null,
        description: l.description,
        debit: l.debit,
        credit: l.credit,
        quantity: l.quantity,
        line_no: i + 1,
      }));
      const { error: lError } = await supabase.from('voucher_lines').insert(vLines);
      if (lError) throw new Error(lError.message);

      // Post voucher via RPC
      const { data: postResult, error: postError } = await supabase.rpc('post_voucher', { v_uuid: voucher.id });
      if (postError) throw new Error(postError.message);

      setSuccess(`Voucher ${voucherNo} posted successfully! GL entries created, inventory updated.`);
      // Reset form
      setLines([newLine()]);
      setDescription('');
      setCustomerId('');
      setVendorId('');
    } catch (err: any) {
      setError(err.message || 'Failed to post voucher');
    } finally {
      setPosting(false);
    }
  }

  if (loading) return <div className="p-6 text-xs text-gray-400">Loading voucher entry...</div>;

  const cur = currentCompany?.currency || 'NPR';

  return (
    <div className="p-4 space-y-3">
      <PageHeader title="Voucher Entry" subtitle="Create and post double-entry vouchers (F2 to post, F3 for new line)" />

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
          <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Voucher Header */}
      <div className="bc-card p-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="bc-label">Voucher Type</label>
            <select
              className="bc-input"
              value={voucherType}
              onChange={(e) => { setVoucherType(e.target.value as VoucherType); setLines([newLine()]); }}
            >
              {Object.entries(VOUCHER_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="bc-label">Posting Date</label>
            <input type="date" className="bc-input" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
          </div>
          {voucherType === 'sales_invoice' && (
            <div>
              <label className="bc-label">Customer</label>
              <select className="bc-input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select customer...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
              </select>
            </div>
          )}
          {voucherType === 'purchase_invoice' && (
            <div>
              <label className="bc-label">Vendor</label>
              <select className="bc-input" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
                <option value="">Select vendor...</option>
                {vendors.map((v) => <option key={v.id} value={v.id}>{v.code} - {v.name}</option>)}
              </select>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="bc-label">Description</label>
            <input className="bc-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Voucher description" />
          </div>
          <div className="flex items-end gap-2">
            <span className={`bc-badge ${fiscalStatus === 'open' ? 'bc-badge-success' : fiscalStatus === 'closed' ? 'bc-badge-danger' : 'bc-badge-gray'}`}>
              FY: {fiscalStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Voucher Lines Table */}
      <div className="bc-card">
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-600">Line Items</h2>
          <div className="flex gap-2">
            {voucherType === 'sales_invoice' && (
              <button onClick={autoFillSalesInvoice} className="bc-btn-secondary" title="Auto-fill AR, Sales, and VAT lines">
                Auto-Fill Sales
              </button>
            )}
            <button onClick={addLine} className="bc-btn-secondary">
              <Plus className="w-3.5 h-3.5" /> New Line (F3)
            </button>
            <button onClick={handlePost} disabled={posting || !isBalanced} className="bc-btn-primary disabled:opacity-50">
              {posting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Post (F2)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto bc-scroll">
          <table className="bc-table">
            <thead>
              <tr>
                <th className="w-8">#</th>
                <th className="min-w-[200px]">Account</th>
                {(voucherType === 'sales_invoice' || voucherType === 'purchase_invoice') && <th className="min-w-[160px]">Item</th>}
                <th className="min-w-[150px]">Description</th>
                <th className="w-20">Qty</th>
                <th className="w-28 text-right">Debit</th>
                <th className="w-28 text-right">Credit</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line, idx) => (
                <tr key={line.id}>
                  <td className="text-center text-gray-400">{idx + 1}</td>
                  <td>
                    <select
                      className="bc-input"
                      value={line.account_id}
                      onChange={(e) => updateLine(line.id, 'account_id', e.target.value)}
                      onKeyDown={(e) => handleInputKeyDown(e, `desc-${idx}`)}
                      ref={(el) => { if (el) inputRefs.current.set(`acc-${idx}`, el); }}
                    >
                      <option value="">Select account...</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.account_no} - {a.name}</option>)}
                    </select>
                  </td>
                  {(voucherType === 'sales_invoice' || voucherType === 'purchase_invoice') && (
                    <td>
                      <select
                        className="bc-input"
                        value={line.item_id}
                        onChange={(e) => updateLine(line.id, 'item_id', e.target.value)}
                        ref={(el) => { if (el) inputRefs.current.set(`item-${idx}`, el); }}
                      >
                        <option value="">(none)</option>
                        {items.map((i) => <option key={i.id} value={i.id}>{i.code} - {i.description}</option>)}
                      </select>
                    </td>
                  )}
                  <td>
                    <input
                      className="bc-input"
                      value={line.description}
                      onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                      onKeyDown={(e) => handleInputKeyDown(e, voucherType === 'sales_invoice' || voucherType === 'purchase_invoice' ? `qty-${idx}` : `debit-${idx}`)}
                      ref={(el) => { if (el) inputRefs.current.set(`desc-${idx}`, el); }}
                      placeholder="Line description"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="bc-input text-right"
                      value={line.quantity || ''}
                      onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                      onKeyDown={(e) => handleInputKeyDown(e, `debit-${idx}`)}
                      ref={(el) => { if (el) inputRefs.current.set(`qty-${idx}`, el); }}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="bc-input text-right"
                      value={line.debit || ''}
                      onChange={(e) => updateLine(line.id, 'debit', parseFloat(e.target.value) || 0)}
                      onKeyDown={(e) => handleInputKeyDown(e, `credit-${idx}`)}
                      ref={(el) => { if (el) inputRefs.current.set(`debit-${idx}`, el); }}
                      placeholder="0.00"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      className="bc-input text-right"
                      value={line.credit || ''}
                      onChange={(e) => updateLine(line.id, 'credit', parseFloat(e.target.value) || 0)}
                      onKeyDown={(e) => handleInputKeyDown(e, idx < lines.length - 1 ? `acc-${idx + 1}` : undefined)}
                      ref={(el) => { if (el) inputRefs.current.set(`credit-${idx}`, el); }}
                      placeholder="0.00"
                    />
                  </td>
                  <td>
                    <button onClick={() => removeLine(line.id)} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-semibold">
                <td colSpan={(voucherType === 'sales_invoice' || voucherType === 'purchase_invoice') ? 4 : 3} className="text-right">Totals:</td>
                <td></td>
                <td className="text-right">{formatCurrency(totalDebit, cur)}</td>
                <td className="text-right">{formatCurrency(totalCredit, cur)}</td>
                <td></td>
              </tr>
              <tr className="bg-gray-100">
                <td colSpan={(voucherType === 'sales_invoice' || voucherType === 'purchase_invoice') ? 5 : 4} className="text-right font-semibold">Difference:</td>
                <td colSpan={(voucherType === 'sales_invoice' || voucherType === 'purchase_invoice') ? 3 : 2} className={isBalanced ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                  {formatCurrency(totalDebit - totalCredit, cur)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-400 flex gap-4">
        <span><kbd className="px-1 bg-gray-100 border border-gray-300 rounded">Enter</kbd> Move to next field</span>
        <span><kbd className="px-1 bg-gray-100 border border-gray-300 rounded">F2</kbd> Post voucher</span>
        <span><kbd className="px-1 bg-gray-100 border border-gray-300 rounded">F3</kbd> Add new line</span>
      </div>
    </div>
  );
}

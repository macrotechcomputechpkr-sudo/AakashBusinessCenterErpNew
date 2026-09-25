import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import type { ChartOfAccount, AccountType, AccountSubType, DebitCredit } from '@/types/erp';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS, ACCOUNT_SUB_TYPE_LABELS } from '@/types/erp';
import {
  ChevronRight, ChevronDown, Plus, BookOpen, Wallet, TrendingDown, TrendingUp,
  DollarSign, Layers, Search, Pencil, Trash2, X, FileText, Download, ArrowLeft,
  Lock, Unlock, PieChart, Tag, Building2, Globe, Banknote, AlertTriangle,
} from 'lucide-react';

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-base font-semibold text-gray-800">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

const TYPE_ICONS: Record<AccountType, typeof Wallet> = {
  asset: Wallet,
  liability: TrendingDown,
  equity: TrendingUp,
  revenue: DollarSign,
  expense: Layers,
};

const TYPE_FILTERS: { key: AccountType | 'all'; label: string }[] = [
  { key: 'all', label: 'All Types' },
  { key: 'asset', label: 'Assets' },
  { key: 'liability', label: 'Liabilities' },
  { key: 'equity', label: 'Equity' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'expense', label: 'Expenses' },
];

const SUB_TYPE_OPTIONS: AccountSubType[] = [
  'cash','bank','receivable','payable','inventory','fixed_asset',
  'accumulated_dep','tax','equity_capital','retained_earnings',
  'sales','purchase','salary','rent','utility','transport','other',
];

const NEPAL_TEMPLATE: {
  account_no: string; name: string; type: AccountType; is_posting: boolean;
  description: string; debit_credit: DebitCredit; sub_type: AccountSubType;
  tax_rate: number; is_tax_account: boolean; is_reconcilable: boolean;
}[] = [
  { account_no: '1000', name: 'Current Assets', type: 'asset', is_posting: false, description: 'Group for short-term assets', debit_credit: 'debit', sub_type: 'other', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '1010', name: 'Cash in Hand', type: 'asset', is_posting: true, description: 'Physical cash on premises', debit_credit: 'debit', sub_type: 'cash', tax_rate: 0, is_tax_account: false, is_reconcilable: true },
  { account_no: '1020', name: 'Bank Account - NIC Asia', type: 'asset', is_posting: true, description: 'NIC Asia Bank current account', debit_credit: 'debit', sub_type: 'bank', tax_rate: 0, is_tax_account: false, is_reconcilable: true },
  { account_no: '1030', name: 'Bank Account - Global IME', type: 'asset', is_posting: true, description: 'Global IME Bank current account', debit_credit: 'debit', sub_type: 'bank', tax_rate: 0, is_tax_account: false, is_reconcilable: true },
  { account_no: '1100', name: 'Accounts Receivable', type: 'asset', is_posting: true, description: 'Money owed by customers', debit_credit: 'debit', sub_type: 'receivable', tax_rate: 0, is_tax_account: false, is_reconcilable: true },
  { account_no: '1200', name: 'TDS Receivable', type: 'asset', is_posting: true, description: 'TDS deducted at source, recoverable', debit_credit: 'debit', sub_type: 'other', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '1500', name: 'Inventory', type: 'asset', is_posting: true, description: 'Goods in stock', debit_credit: 'debit', sub_type: 'inventory', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '1600', name: 'Fixed Assets', type: 'asset', is_posting: false, description: 'Group for long-term assets', debit_credit: 'debit', sub_type: 'fixed_asset', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '1610', name: 'Office Equipment', type: 'asset', is_posting: true, description: 'Computers, furniture, etc.', debit_credit: 'debit', sub_type: 'fixed_asset', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '1620', name: 'Accumulated Depreciation', type: 'asset', is_posting: true, description: 'Contra-asset for depreciation', debit_credit: 'credit', sub_type: 'accumulated_dep', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '2000', name: 'Current Liabilities', type: 'liability', is_posting: false, description: 'Group for short-term liabilities', debit_credit: 'credit', sub_type: 'other', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '2010', name: 'Accounts Payable', type: 'liability', is_posting: true, description: 'Money owed to suppliers', debit_credit: 'credit', sub_type: 'payable', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '2020', name: 'VAT Payable (13%)', type: 'liability', is_posting: true, description: 'VAT collected, payable to IRD', debit_credit: 'credit', sub_type: 'tax', tax_rate: 13, is_tax_account: true, is_reconcilable: false },
  { account_no: '2030', name: 'TDS Payable', type: 'liability', is_posting: true, description: 'TDS deducted, payable to IRD', debit_credit: 'credit', sub_type: 'tax', tax_rate: 0, is_tax_account: true, is_reconcilable: false },
  { account_no: '2040', name: 'Salary Payable', type: 'liability', is_posting: true, description: 'Salaries owed to employees', debit_credit: 'credit', sub_type: 'salary', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '2050', name: 'Excise Duty Payable', type: 'liability', is_posting: true, description: 'Excise duty owed to customs', debit_credit: 'credit', sub_type: 'tax', tax_rate: 0, is_tax_account: true, is_reconcilable: false },
  { account_no: '3000', name: 'Equity', type: 'equity', is_posting: false, description: 'Group for owner equity', debit_credit: 'credit', sub_type: 'equity_capital', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '3010', name: 'Owner Capital', type: 'equity', is_posting: true, description: 'Initial and additional capital invested', debit_credit: 'credit', sub_type: 'equity_capital', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '3020', name: 'Retained Earnings', type: 'equity', is_posting: true, description: 'Accumulated profits', debit_credit: 'credit', sub_type: 'retained_earnings', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '3030', name: 'Drawings', type: 'equity', is_posting: true, description: 'Owner withdrawals', debit_credit: 'debit', sub_type: 'other', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '4000', name: 'Revenue', type: 'revenue', is_posting: false, description: 'Group for income accounts', debit_credit: 'credit', sub_type: 'sales', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '4010', name: 'Sales Revenue', type: 'revenue', is_posting: true, description: 'Income from goods sold', debit_credit: 'credit', sub_type: 'sales', tax_rate: 13, is_tax_account: false, is_reconcilable: false },
  { account_no: '4020', name: 'Sales Returns', type: 'revenue', is_posting: true, description: 'Returned goods (contra-revenue)', debit_credit: 'debit', sub_type: 'sales', tax_rate: 13, is_tax_account: false, is_reconcilable: false },
  { account_no: '4030', name: 'Service Income', type: 'revenue', is_posting: true, description: 'Income from services rendered', debit_credit: 'credit', sub_type: 'sales', tax_rate: 13, is_tax_account: false, is_reconcilable: false },
  { account_no: '4040', name: 'Interest Income', type: 'revenue', is_posting: true, description: 'Bank interest earned', debit_credit: 'credit', sub_type: 'other', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '5000', name: 'Operating Expenses', type: 'expense', is_posting: false, description: 'Group for expense accounts', debit_credit: 'debit', sub_type: 'other', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '5010', name: 'Cost of Goods Sold', type: 'expense', is_posting: true, description: 'Direct cost of items sold', debit_credit: 'debit', sub_type: 'purchase', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '5020', name: 'Rent Expense', type: 'expense', is_posting: true, description: 'Office/shop rent', debit_credit: 'debit', sub_type: 'rent', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '5030', name: 'Salary Expense', type: 'expense', is_posting: true, description: 'Employee salaries', debit_credit: 'debit', sub_type: 'salary', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '5040', name: 'Utility Expense', type: 'expense', is_posting: true, description: 'Electricity, water, internet', debit_credit: 'debit', sub_type: 'utility', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '5050', name: 'Transportation Expense', type: 'expense', is_posting: true, description: 'Delivery and travel costs', debit_credit: 'debit', sub_type: 'transport', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '5060', name: 'Depreciation Expense', type: 'expense', is_posting: true, description: 'Periodic depreciation', debit_credit: 'debit', sub_type: 'other', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '5070', name: 'Bank Charges', type: 'expense', is_posting: true, description: 'Bank fees and commissions', debit_credit: 'debit', sub_type: 'bank', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
  { account_no: '5080', name: 'Office Supplies', type: 'expense', is_posting: true, description: 'Stationery and consumables', debit_credit: 'debit', sub_type: 'other', tax_rate: 0, is_tax_account: false, is_reconcilable: false },
];

export default function ChartOfAccounts() {
  const { currentCompany } = useAuth();
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AccountType | 'all'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany?.id]);

  async function loadData() {
    if (!currentCompany) return;
    setLoading(true);
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from('chart_of_accounts')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('account_no');
      if (error) {
        setLoadError(error.message);
        setAccounts([]);
      } else if (data) {
        setAccounts(data as ChartOfAccount[]);
        const roots = (data as ChartOfAccount[]).filter((a) => a.parent_id === null);
        setExpanded(new Set(roots.map((a) => a.id)));
      }
    } catch (err: any) {
      setLoadError(err?.message || 'Unexpected error loading accounts');
      setAccounts([]);
    }
    setLoading(false);
  }

  function buildTree(flat: ChartOfAccount[]): ChartOfAccount[] {
    const map = new Map<string, ChartOfAccount>();
    const roots: ChartOfAccount[] = [];
    flat.forEach((a) => map.set(a.id, { ...a, children: [] }));
    flat.forEach((a) => {
      if (a.parent_id && map.has(a.parent_id)) {
        map.get(a.parent_id)!.children!.push(map.get(a.id)!);
      } else {
        roots.push(map.get(a.id)!);
      }
    });
    return roots;
  }

  function filterNode(node: ChartOfAccount, type: AccountType | 'all', q: string): ChartOfAccount | null {
    const matches = (type === 'all' || node.type === type) &&
      (!q || node.name.toLowerCase().includes(q) || node.account_no.toLowerCase().includes(q) ||
       (node.sub_type || '').toLowerCase().includes(q) || (node.cost_center || '').toLowerCase().includes(q));
    const children = (node.children || []).map((c) => filterNode(c, type, q)).filter(Boolean) as ChartOfAccount[];
    if (matches || children.length > 0) return { ...node, children };
    return null;
  }

  const tree = buildTree(accounts);
  let filteredTree = tree;
  if (typeFilter !== 'all' || search) {
    const q = search.toLowerCase();
    filteredTree = tree.map((n) => filterNode(n, typeFilter, q)).filter(Boolean) as ChartOfAccount[];
  }
  const filteredList = accounts.filter((a) => {
    const typeMatch = typeFilter === 'all' || a.type === typeFilter;
    const q = search.toLowerCase();
    const searchMatch = !q || a.name.toLowerCase().includes(q) || a.account_no.toLowerCase().includes(q) ||
      (a.sub_type || '').toLowerCase().includes(q) || (a.cost_center || '').toLowerCase().includes(q);
    return typeMatch && searchMatch;
  });

  const stats: Record<string, { count: number; balance: number; budget: number }> = {};
  for (const a of accounts) {
    if (!stats[a.type]) stats[a.type] = { count: 0, balance: 0, budget: 0 };
    stats[a.type].count++;
    if (a.is_posting) {
      stats[a.type].balance += Number(a.balance);
      stats[a.type].budget += Number(a.budget_amount);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function deleteAccount(account: ChartOfAccount) {
    const hasChildren = accounts.some((a) => a.parent_id === account.id);
    if (hasChildren) { alert('Cannot delete: this account has child accounts. Delete or move them first.'); return; }
    if (!confirm(`Delete account "${account.account_no} - ${account.name}"? This cannot be undone.`)) return;
    await supabase.from('chart_of_accounts').delete().eq('id', account.id);
    if (selectedAccount?.id === account.id) setSelectedAccount(null);
    loadData();
  }

  async function toggleBlock(account: ChartOfAccount) {
    await supabase.from('chart_of_accounts').update({ is_blocked: !account.is_blocked }).eq('id', account.id);
    loadData();
  }

  async function loadTemplate() {
    if (!currentCompany) return;
    if (!confirm('This will add the standard Nepal chart of accounts template with full tax, sub-type, and reconciliation settings. Existing accounts with the same number will be skipped. Continue?')) return;
    setTemplateLoading(true);
    const existingNos = new Set(accounts.map((a) => a.account_no));
    const toInsert = NEPAL_TEMPLATE
      .filter((t) => !existingNos.has(t.account_no))
      .map((t) => ({
        company_id: currentCompany.id,
        account_no: t.account_no, name: t.name, type: t.type, parent_id: null,
        is_posting: t.is_posting, balance: 0, description: t.description, is_active: true,
        opening_balance: 0, debit_credit: t.debit_credit, sub_type: t.sub_type,
        tax_rate: t.tax_rate, is_tax_account: t.is_tax_account, currency: null,
        budget_amount: 0, is_reconcilable: t.is_reconcilable, cost_center: null, is_blocked: false,
      }));
    if (toInsert.length > 0) {
      const { error } = await supabase.from('chart_of_accounts').insert(toInsert);
      if (error) alert('Error loading template: ' + error.message);
    }
    setTemplateLoading(false);
    setShowTemplate(false);
    loadData();
  }

  function exportCSV() {
    const headers = ['Account No','Name','Type','Sub-Type','Debit/Credit','Posting','Active','Balance','Opening Balance','Budget','Tax Rate','Tax Account','Reconcilable','Currency','Cost Center','Blocked','Description'];
    const rows = accounts.map((a) => [
      a.account_no, a.name, a.type, a.sub_type || '', a.debit_credit,
      a.is_posting ? 'Yes' : 'No', a.is_active ? 'Yes' : 'No',
      a.balance, a.opening_balance, a.budget_amount, a.tax_rate,
      a.is_tax_account ? 'Yes' : 'No', a.is_reconcilable ? 'Yes' : 'No',
      a.currency || '', a.cost_center || '', a.is_blocked ? 'Yes' : 'No',
      (a.description || '').replace(/,/g, ';'),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `chart_of_accounts_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const cur = currentCompany?.currency || 'NPR';

  function renderNode(node: ChartOfAccount, level: number): React.ReactNode {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const Icon = node.parent_id === null ? TYPE_ICONS[node.type] : BookOpen;
    const isSelected = selectedAccount?.id === node.id;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors ${isSelected ? 'bg-blue-100' : 'hover:bg-blue-50'} ${level === 0 ? 'bg-gray-50 font-medium' : ''} ${node.is_blocked ? 'opacity-50' : ''}`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => setSelectedAccount(node)}
        >
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} className="p-0.5 hover:bg-gray-200 rounded">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : <span className="w-4" />}
          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${ACCOUNT_TYPE_COLORS[node.type]}`} />
          <span className="text-xs font-mono w-16">{node.account_no}</span>
          <span className="text-xs flex-1 truncate">{node.name}</span>
          {node.is_blocked && <Lock className="w-3 h-3 text-red-500 flex-shrink-0" />}
          {node.is_tax_account && <span className="bc-badge bc-badge-warning text-[10px]"><Tag className="w-2.5 h-2.5 inline" /> Tax</span>}
          {node.is_reconcilable && <Banknote className="w-3 h-3 text-green-600 flex-shrink-0" />}
          {!node.is_active && <span className="bc-badge-gray text-[10px]">Inactive</span>}
          {node.sub_type && <span className="text-[10px] text-gray-400 hidden md:inline w-20 truncate">{ACCOUNT_SUB_TYPE_LABELS[node.sub_type] || node.sub_type}</span>}
          {node.is_posting && (
            <span className="text-xs text-gray-700 tabular-nums w-28 text-right">{formatCurrency(Number(node.balance), cur)}</span>
          )}
          {!node.is_posting && <span className="text-xs text-gray-400 italic w-28 text-right">(group)</span>}
          <span className={`bc-badge ml-1 text-[10px] ${node.is_posting ? 'bc-badge-info' : 'bc-badge-gray'}`}>
            {node.debit_credit === 'debit' ? 'Dr' : 'Cr'}
          </span>
          <div className="flex items-center gap-0.5 ml-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setEditingAccount(node); setShowForm(true); }} className="p-1 hover:bg-blue-100 text-gray-400 hover:text-[#0078d4] rounded" title="Edit">
              <Pencil className="w-3 h-3" />
            </button>
            <button onClick={() => toggleBlock(node)} className="p-1 hover:bg-amber-50 text-gray-400 hover:text-amber-600 rounded" title={node.is_blocked ? 'Unblock' : 'Block'}>
              {node.is_blocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            </button>
            <button onClick={() => deleteAccount(node)} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded" title="Delete">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        {isExpanded && hasChildren && node.children!.map((child) => renderNode(child, level + 1))}
      </div>
    );
  }

  if (!currentCompany) return <div className="p-6 text-xs text-gray-400">No company selected.</div>;

  return (
    <div className="p-4">
      <PageHeader title="Chart of Accounts" subtitle="Full ledger account management with tax, budget, reconciliation & cost centers" />

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
        {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type) => {
          const s = stats[type] || { count: 0, balance: 0, budget: 0 };
          const Icon = TYPE_ICONS[type];
          return (
            <div key={type} className="bc-card p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 flex items-center justify-center bg-gray-50">
                <Icon className={`w-4 h-4 ${ACCOUNT_TYPE_COLORS[type]}`} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{ACCOUNT_TYPE_LABELS[type]}</div>
                <div className="text-xs font-semibold text-gray-700">{s.count} accounts</div>
                <div className="text-[11px] text-gray-500 tabular-nums">{formatCurrency(s.balance, cur)}</div>
                {s.budget > 0 && <div className="text-[10px] text-blue-500 tabular-nums">Budget: {formatCurrency(s.budget, cur)}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="bc-card mt-3">
        {/* Toolbar */}
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <button onClick={() => { setEditingAccount(null); setShowForm(true); }} className="bc-btn-primary">
              <Plus className="w-3.5 h-3.5" /> New Account
            </button>
            <button onClick={() => setShowTemplate(!showTemplate)} className="bc-btn-secondary">
              <Download className="w-3.5 h-3.5" /> Nepal Template
            </button>
            <button onClick={exportCSV} className="bc-btn-secondary">
              <FileText className="w-3.5 h-3.5" /> Export CSV
            </button>
          </div>

          <div className="w-px h-5 bg-gray-300" />

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="bc-input pl-7 w-48" placeholder="Search no, name, sub-type, cost center..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <select className="bc-input w-32" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as AccountType | 'all')}>
            {TYPE_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>

          <div className="flex items-center gap-1 ml-auto">
            <div className="flex border border-gray-300 rounded">
              <button onClick={() => setViewMode('tree')} className={`px-2 py-1 text-[11px] ${viewMode === 'tree' ? 'bg-[#0078d4] text-white' : 'text-gray-600'}`}>Tree</button>
              <button onClick={() => setViewMode('list')} className={`px-2 py-1 text-[11px] ${viewMode === 'list' ? 'bg-[#0078d4] text-white' : 'text-gray-600'}`}>List</button>
            </div>
            {viewMode === 'tree' && <>
              <button onClick={() => setExpanded(new Set(accounts.map((a) => a.id)))} className="bc-btn-secondary text-[11px]">Expand All</button>
              <button onClick={() => setExpanded(new Set())} className="bc-btn-secondary text-[11px]">Collapse All</button>
            </>}
          </div>
        </div>

        {/* Template banner */}
        {showTemplate && (
          <div className="px-4 py-3 border-b border-gray-200 bg-blue-50/50 flex items-center gap-3 animate-fade-in">
            <FileText className="w-4 h-4 text-[#0078d4] flex-shrink-0" />
            <div className="flex-1 text-xs text-gray-700">
              Load the standard Nepal chart of accounts template with {NEPAL_TEMPLATE.length} accounts — including VAT 13%, TDS,
              excise duty, bank reconciliation flags, debit/credit nature, and sub-type classification. Accounts that already exist will be skipped.
            </div>
            <button onClick={loadTemplate} disabled={templateLoading} className="bc-btn-primary">
              {templateLoading ? 'Loading...' : 'Load Template'}
            </button>
            <button onClick={() => setShowTemplate(false)} className="p-1 hover:bg-gray-200 rounded">
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        )}

        {/* Add/Edit form */}
        {showForm && (
          <AccountForm currentCompany={currentCompany} accounts={accounts} editing={editingAccount}
            onDone={() => { setShowForm(false); setEditingAccount(null); loadData(); }}
            onCancel={() => { setShowForm(false); setEditingAccount(null); }}
          />
        )}

        {/* Content area */}
        <div className="max-h-[55vh] overflow-y-auto bc-scroll">
          {loading ? (
            <div className="py-8 text-center text-xs text-gray-400">Loading accounts...</div>
          ) : loadError ? (
            <div className="py-8 text-center">
              <div className="text-xs text-red-600 mb-2">{loadError}</div>
              <button onClick={() => loadData()} className="bc-btn-primary">Retry</button>
            </div>
          ) : viewMode === 'tree' ? (
            <>
              <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-200 bg-gray-100 text-xs font-semibold text-gray-500">
                <span className="w-4" /><span className="w-3.5" /><span className="w-16">Account No</span>
                <span className="flex-1">Account Name</span>
                <span className="w-20 hidden md:inline">Sub-Type</span>
                <span className="w-28 text-right">Balance</span>
                <span className="w-10 ml-1 text-center">Dr/Cr</span>
                <span className="w-20 ml-1">Actions</span>
              </div>
              {filteredTree.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  {accounts.length === 0
                    ? 'No accounts yet. Click "Nepal Template" to load the standard set, or "New Account" to create one.'
                    : 'No accounts match your search.'}
                </div>
              ) : filteredTree.map((node) => renderNode(node, 0))}
            </>
          ) : (
            <>
              <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-200 bg-gray-100 text-xs font-semibold text-gray-500">
                <span className="w-16">Account No</span>
                <span className="flex-1">Name</span>
                <span className="w-20">Type</span>
                <span className="w-24 hidden md:inline">Sub-Type</span>
                <span className="w-10 text-center">Dr/Cr</span>
                <span className="w-16 text-center">Posting</span>
                <span className="w-16 text-center">Tax</span>
                <span className="w-16 text-center">Recon</span>
                <span className="w-16 text-center">Blocked</span>
                <span className="w-28 text-right">Balance</span>
                <span className="w-20 ml-1">Actions</span>
              </div>
              {filteredList.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">No accounts match your search.</div>
              ) : filteredList.map((a) => (
                <div key={a.id} className={`flex items-center gap-1 px-3 py-1 border-b border-gray-100 cursor-pointer hover:bg-blue-50 ${selectedAccount?.id === a.id ? 'bg-blue-100' : ''} ${a.is_blocked ? 'opacity-50' : ''}`}
                  onClick={() => setSelectedAccount(a)}>
                  <span className="text-xs font-mono w-16">{a.account_no}</span>
                  <span className="text-xs flex-1 truncate">{a.name}</span>
                  <span className="text-xs w-20">{ACCOUNT_TYPE_LABELS[a.type]}</span>
                  <span className="text-[10px] text-gray-500 w-24 hidden md:inline truncate">{a.sub_type ? (ACCOUNT_SUB_TYPE_LABELS[a.sub_type] || a.sub_type) : '-'}</span>
                  <span className={`bc-badge text-[10px] w-10 text-center ${a.debit_credit === 'debit' ? 'bc-badge-info' : 'bc-badge-warning'}`}>{a.debit_credit === 'debit' ? 'Dr' : 'Cr'}</span>
                  <span className="text-[10px] w-16 text-center">{a.is_posting ? 'Yes' : 'Group'}</span>
                  <span className="text-[10px] w-16 text-center">{a.is_tax_account ? `${a.tax_rate}%` : '-'}</span>
                  <span className="text-[10px] w-16 text-center">{a.is_reconcilable ? 'Yes' : '-'}</span>
                  <span className="text-[10px] w-16 text-center">{a.is_blocked ? 'Yes' : '-'}</span>
                  <span className="text-xs text-gray-700 tabular-nums w-28 text-right">{a.is_posting ? formatCurrency(Number(a.balance), cur) : '-'}</span>
                  <div className="flex items-center gap-0.5 w-20 ml-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setEditingAccount(a); setShowForm(true); }} className="p-1 hover:bg-blue-100 text-gray-400 hover:text-[#0078d4] rounded" title="Edit"><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => toggleBlock(a)} className="p-1 hover:bg-amber-50 text-gray-400 hover:text-amber-600 rounded" title={a.is_blocked ? 'Unblock' : 'Block'}>{a.is_blocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}</button>
                    <button onClick={() => deleteAccount(a)} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded" title="Delete"><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex flex-wrap justify-between gap-2 text-xs font-semibold">
          <span>Total Accounts: {accounts.length}</span>
          <span>Posting: {accounts.filter((a) => a.is_posting).length}</span>
          <span>Tax Accounts: {accounts.filter((a) => a.is_tax_account).length}</span>
          <span>Reconcilable: {accounts.filter((a) => a.is_reconcilable).length}</span>
          <span>Blocked: {accounts.filter((a) => a.is_blocked).length}</span>
          <span>Total Balance: {formatCurrency(accounts.filter((a) => a.is_posting).reduce((s, a) => s + Number(a.balance), 0), cur)}</span>
        </div>
      </div>

      {selectedAccount && (
        <AccountDetail account={selectedAccount} currency={cur}
          onClose={() => setSelectedAccount(null)}
          onEdit={() => { setEditingAccount(selectedAccount); setShowForm(true); setSelectedAccount(null); }}
        />
      )}
    </div>
  );
}

function AccountForm({
  currentCompany, accounts, editing, onDone, onCancel,
}: {
  currentCompany: any; accounts: ChartOfAccount[]; editing: ChartOfAccount | null;
  onDone: () => void; onCancel: () => void;
}) {
  const [accountNo, setAccountNo] = useState(editing?.account_no || '');
  const [name, setName] = useState(editing?.name || '');
  const [type, setType] = useState<AccountType>(editing?.type || 'asset');
  const [parentId, setParentId] = useState(editing?.parent_id || '');
  const [isPosting, setIsPosting] = useState(editing?.is_posting ?? true);
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [description, setDescription] = useState(editing?.description || '');
  const [debitCredit, setDebitCredit] = useState<DebitCredit>(editing?.debit_credit || 'debit');
  const [subType, setSubType] = useState<AccountSubType | ''>(editing?.sub_type || '');
  const [taxRate, setTaxRate] = useState(String(editing?.tax_rate ?? 0));
  const [isTaxAccount, setIsTaxAccount] = useState(editing?.is_tax_account ?? false);
  const [currency, setCurrency] = useState(editing?.currency || '');
  const [budgetAmount, setBudgetAmount] = useState(String(editing?.budget_amount ?? 0));
  const [isReconcilable, setIsReconcilable] = useState(editing?.is_reconcilable ?? false);
  const [costCenter, setCostCenter] = useState(editing?.cost_center || '');
  const [openingBalance, setOpeningBalance] = useState(String(editing?.opening_balance ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableParents = accounts.filter((a) => !editing || a.id !== editing.id).filter((a) => a.parent_id === null || !a.is_posting);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountNo || !name) { setError('Account No and Name are required'); return; }
    if (!currentCompany) return;
    setSaving(true); setError(null);
    const payload = {
      company_id: currentCompany.id, account_no: accountNo, name, type,
      parent_id: parentId || null, is_posting: isPosting, is_active: isActive,
      description: description || null,
      opening_balance: parseFloat(openingBalance) || 0,
      debit_credit: debitCredit,
      sub_type: subType || null,
      tax_rate: parseFloat(taxRate) || 0,
      is_tax_account: isTaxAccount,
      currency: currency || null,
      budget_amount: parseFloat(budgetAmount) || 0,
      is_reconcilable: isReconcilable,
      cost_center: costCenter || null,
      is_blocked: false,
    };
    let result;
    if (editing) result = await supabase.from('chart_of_accounts').update(payload).eq('id', editing.id);
    else result = await supabase.from('chart_of_accounts').insert({ ...payload, balance: 0 });
    if (result.error) setError(result.error.message); else onDone();
    setSaving(false);
  }

  return (
    <div className="border-b border-gray-300 bg-blue-50">
      <div className="px-4 py-2 bg-[#0078d4] text-white flex items-center justify-between">
        <span className="text-sm font-semibold">
          {editing ? `Edit Account: ${editing.account_no} - ${editing.name}` : 'Create New Account'}
        </span>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-white/20 rounded">
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="p-4">
        {error && <div className="text-xs text-red-600 mb-3 bg-red-50 border border-red-200 px-3 py-2">{error}</div>}

        {/* Row 1: Basic fields */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
          <div>
            <label className="bc-label">Account No *</label>
            <input className="bc-input" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} placeholder="e.g. 1030" />
          </div>
          <div className="md:col-span-2">
            <label className="bc-label">Name *</label>
            <input className="bc-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name" />
          </div>
          <div>
            <label className="bc-label">Type</label>
            <select className="bc-input" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              <option value="asset">Asset</option><option value="liability">Liability</option>
              <option value="equity">Equity</option><option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="bc-label">Sub-Type</label>
            <select className="bc-input" value={subType} onChange={(e) => setSubType(e.target.value as AccountSubType | '')}>
              <option value="">(none)</option>
              {SUB_TYPE_OPTIONS.map((s) => <option key={s} value={s}>{ACCOUNT_SUB_TYPE_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="bc-label">Parent Account</label>
            <select className="bc-input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">(none - root)</option>
              {availableParents.map((a) => <option key={a.id} value={a.id}>{a.account_no} - {a.name}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: Nature & financial fields */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3">
          <div>
            <label className="bc-label">Debit/Credit Nature</label>
            <select className="bc-input" value={debitCredit} onChange={(e) => setDebitCredit(e.target.value as DebitCredit)}>
              <option value="debit">Debit (Dr)</option>
              <option value="credit">Credit (Cr)</option>
            </select>
          </div>
          <div>
            <label className="bc-label">Opening Balance</label>
            <input className="bc-input" type="number" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="bc-label">Budget Amount</label>
            <input className="bc-input" type="number" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="bc-label">Tax Rate %</label>
            <input className="bc-input" type="number" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="bc-label">Currency</label>
            <input className="bc-input" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="Company default" />
          </div>
          <div>
            <label className="bc-label">Cost Center</label>
            <input className="bc-input" value={costCenter} onChange={(e) => setCostCenter(e.target.value)} placeholder="e.g. SALES-01" />
          </div>
        </div>

        {/* Row 3: Checkboxes */}
        <div className="flex flex-wrap items-center gap-4 mb-3">
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={isPosting} onChange={(e) => setIsPosting(e.target.checked)} className="w-3.5 h-3.5 accent-[#0078d4]" />
            Posting Account
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-3.5 h-3.5 accent-[#0078d4]" />
            Active
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={isTaxAccount} onChange={(e) => setIsTaxAccount(e.target.checked)} className="w-3.5 h-3.5 accent-[#0078d4]" />
            <Tag className="w-3 h-3" /> Tax/VAT Account
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={isReconcilable} onChange={(e) => setIsReconcilable(e.target.checked)} className="w-3.5 h-3.5 accent-[#0078d4]" />
            <Banknote className="w-3 h-3" /> Reconcilable (Bank/Cash)
          </label>
        </div>

        {/* Description */}
        <div className="mb-3">
          <label className="bc-label">Description (optional)</label>
          <input className="bc-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes about this account" />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
          <button type="button" onClick={onCancel} className="bc-btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="bc-btn-primary">
            {saving ? 'Saving...' : editing ? 'Update' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AccountDetail({
  account, currency, onClose, onEdit,
}: {
  account: ChartOfAccount; currency: string; onClose: () => void; onEdit: () => void;
}) {
  return (
    <div className="fixed bottom-0 right-0 w-full md:w-[480px] bg-white border-t md:border-l md:border-t-0 border-gray-300 shadow-2xl z-40 animate-slide-in md:rounded-tl-lg overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-[#0f172a] to-[#1e293b] text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-slate-300">Account Detail</div>
            <div className="text-sm font-semibold">{account.account_no} — {account.name}</div>
          </div>
        </div>
        <button onClick={onEdit} className="bc-btn-secondary text-[11px]">
          <Pencil className="w-3 h-3" /> Edit
        </button>
      </div>
      <div className="p-4 space-y-3 max-h-[55vh] overflow-y-auto bc-scroll">
        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Account Number" value={account.account_no} />
          <DetailField label="Type" value={ACCOUNT_TYPE_LABELS[account.type]} />
          <DetailField label="Sub-Type" value={account.sub_type ? (ACCOUNT_SUB_TYPE_LABELS[account.sub_type] || account.sub_type) : '-'} />
          <DetailField label="Nature" value={account.debit_credit === 'debit' ? 'Debit (Dr)' : 'Credit (Cr)'} />
          <DetailField label="Posting Type" value={account.is_posting ? 'Posting Account' : 'Group Account'} />
          <DetailField label="Status" value={account.is_active ? 'Active' : 'Inactive'} />
          <DetailField label="Current Balance" value={formatCurrency(Number(account.balance), currency)} highlight />
          <DetailField label="Opening Balance" value={formatCurrency(Number(account.opening_balance), currency)} />
          <DetailField label="Budget" value={formatCurrency(Number(account.budget_amount), currency)} />
          <DetailField label="Budget vs Actual" value={formatCurrency(Number(account.budget_amount) - Number(account.balance), currency)} />
          <DetailField label="Tax Rate" value={account.is_tax_account ? `${account.tax_rate}%` : 'N/A'} />
          <DetailField label="Reconcilable" value={account.is_reconcilable ? 'Yes' : 'No'} />
          <DetailField label="Currency" value={account.currency || 'Company Default'} />
          <DetailField label="Cost Center" value={account.cost_center || '-'} />
          <DetailField label="Blocked" value={account.is_blocked ? 'Yes — posting blocked' : 'No'} />
          <DetailField label="Created" value={new Date(account.created_at).toLocaleDateString()} />
        </div>
        {account.description && (
          <div>
            <div className="bc-label mb-1">Description</div>
            <div className="text-xs text-gray-700 bg-gray-50 p-2 border border-gray-200">{account.description}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="bc-label">{label}</div>
      <div className={`text-xs ${highlight ? 'font-semibold text-[#0078d4] tabular-nums' : 'text-gray-700'}`}>{value}</div>
    </div>
  );
}

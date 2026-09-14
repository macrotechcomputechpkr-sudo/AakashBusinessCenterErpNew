import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import type { ChartOfAccount, AccountType } from '@/types/erp';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS } from '@/types/erp';
import {
  ChevronRight, ChevronDown, Plus, BookOpen, Wallet, TrendingDown, TrendingUp,
  DollarSign, Layers, Search, Pencil, Trash2, X, FileText, Download,
  Building2, ArrowLeft,
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

const NEPAL_TEMPLATE: Omit<ChartOfAccount, 'id' | 'company_id' | 'created_at' | 'children'>[] = [
  { account_no: '1000', name: 'Current Assets', type: 'asset', parent_id: null, is_posting: false, balance: 0, description: 'Group for short-term assets', is_active: true },
  { account_no: '1010', name: 'Cash in Hand', type: 'asset', parent_id: null, is_posting: true, balance: 0, description: 'Physical cash on premises', is_active: true },
  { account_no: '1020', name: 'Bank Account - NIC Asia', type: 'asset', parent_id: null, is_posting: true, balance: 0, description: 'NIC Asia Bank current account', is_active: true },
  { account_no: '1030', name: 'Bank Account - Global IME', type: 'asset', parent_id: null, is_posting: true, balance: 0, description: 'Global IME Bank current account', is_active: true },
  { account_no: '1100', name: 'Accounts Receivable', type: 'asset', parent_id: null, is_posting: true, balance: 0, description: 'Money owed by customers', is_active: true },
  { account_no: '1200', name: 'TDS Receivable', type: 'asset', parent_id: null, is_posting: true, balance: 0, description: 'TDS deducted at source, recoverable', is_active: true },
  { account_no: '1500', name: 'Inventory', type: 'asset', parent_id: null, is_posting: true, balance: 0, description: 'Goods in stock', is_active: true },
  { account_no: '1600', name: 'Fixed Assets', type: 'asset', parent_id: null, is_posting: false, balance: 0, description: 'Group for long-term assets', is_active: true },
  { account_no: '1610', name: 'Office Equipment', type: 'asset', parent_id: null, is_posting: true, balance: 0, description: 'Computers, furniture, etc.', is_active: true },
  { account_no: '1620', name: 'Accumulated Depreciation', type: 'asset', parent_id: null, is_posting: true, balance: 0, description: 'Contra-asset for depreciation', is_active: true },

  { account_no: '2000', name: 'Current Liabilities', type: 'liability', parent_id: null, is_posting: false, balance: 0, description: 'Group for short-term liabilities', is_active: true },
  { account_no: '2010', name: 'Accounts Payable', type: 'liability', parent_id: null, is_posting: true, balance: 0, description: 'Money owed to suppliers', is_active: true },
  { account_no: '2020', name: 'VAT Payable (13%)', type: 'liability', parent_id: null, is_posting: true, balance: 0, description: 'VAT collected, payable to IRD', is_active: true },
  { account_no: '2030', name: 'TDS Payable', type: 'liability', parent_id: null, is_posting: true, balance: 0, description: 'TDS deducted, payable to IRD', is_active: true },
  { account_no: '2040', name: 'Salary Payable', type: 'liability', parent_id: null, is_posting: true, balance: 0, description: 'Salaries owed to employees', is_active: true },
  { account_no: '2050', name: 'Excise Duty Payable', type: 'liability', parent_id: null, is_posting: true, balance: 0, description: 'Excise duty owed to customs', is_active: true },

  { account_no: '3000', name: 'Equity', type: 'equity', parent_id: null, is_posting: false, balance: 0, description: 'Group for owner equity', is_active: true },
  { account_no: '3010', name: 'Owner Capital', type: 'equity', parent_id: null, is_posting: true, balance: 0, description: 'Initial and additional capital invested', is_active: true },
  { account_no: '3020', name: 'Retained Earnings', type: 'equity', parent_id: null, is_posting: true, balance: 0, description: 'Accumulated profits', is_active: true },
  { account_no: '3030', name: 'Drawings', type: 'equity', parent_id: null, is_posting: true, balance: 0, description: 'Owner withdrawals', is_active: true },

  { account_no: '4000', name: 'Revenue', type: 'revenue', parent_id: null, is_posting: false, balance: 0, description: 'Group for income accounts', is_active: true },
  { account_no: '4010', name: 'Sales Revenue', type: 'revenue', parent_id: null, is_posting: true, balance: 0, description: 'Income from goods sold', is_active: true },
  { account_no: '4020', name: 'Sales Returns', type: 'revenue', parent_id: null, is_posting: true, balance: 0, description: 'Returned goods (contra-revenue)', is_active: true },
  { account_no: '4030', name: 'Service Income', type: 'revenue', parent_id: null, is_posting: true, balance: 0, description: 'Income from services rendered', is_active: true },
  { account_no: '4040', name: 'Interest Income', type: 'revenue', parent_id: null, is_posting: true, balance: 0, description: 'Bank interest earned', is_active: true },

  { account_no: '5000', name: 'Operating Expenses', type: 'expense', parent_id: null, is_posting: false, balance: 0, description: 'Group for expense accounts', is_active: true },
  { account_no: '5010', name: 'Cost of Goods Sold', type: 'expense', parent_id: null, is_posting: true, balance: 0, description: 'Direct cost of items sold', is_active: true },
  { account_no: '5020', name: 'Rent Expense', type: 'expense', parent_id: null, is_posting: true, balance: 0, description: 'Office/shop rent', is_active: true },
  { account_no: '5030', name: 'Salary Expense', type: 'expense', parent_id: null, is_posting: true, balance: 0, description: 'Employee salaries', is_active: true },
  { account_no: '5040', name: 'Utility Expense', type: 'expense', parent_id: null, is_posting: true, balance: 0, description: 'Electricity, water, internet', is_active: true },
  { account_no: '5050', name: 'Transportation Expense', type: 'expense', parent_id: null, is_posting: true, balance: 0, description: 'Delivery and travel costs', is_active: true },
  { account_no: '5060', name: 'Depreciation Expense', type: 'expense', parent_id: null, is_posting: true, balance: 0, description: 'Periodic depreciation', is_active: true },
  { account_no: '5070', name: 'Bank Charges', type: 'expense', parent_id: null, is_posting: true, balance: 0, description: 'Bank fees and commissions', is_active: true },
  { account_no: '5080', name: 'Office Supplies', type: 'expense', parent_id: null, is_posting: true, balance: 0, description: 'Stationery and consumables', is_active: true },
];

export default function ChartOfAccounts() {
  const { currentCompany } = useAuth();
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AccountType | 'all'>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<ChartOfAccount | null>(null);
  const [showTemplate, setShowTemplate] = useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany?.id]);

  async function loadData() {
    if (!currentCompany) return;
    setLoading(true);
    setLoadError(null);
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
    setLoading(false);
  }

  const tree = useMemo(() => buildTree(accounts), [accounts]);

  const filteredTree = useMemo(() => {
    if (typeFilter === 'all' && !search) return tree;
    const q = search.toLowerCase();
    return tree
      .map((node) => filterNode(node, typeFilter, q))
      .filter(Boolean) as ChartOfAccount[];
  }, [tree, typeFilter, search]);

  const stats = useMemo(() => {
    const byType: Record<string, { count: number; balance: number }> = {};
    for (const a of accounts) {
      if (!byType[a.type]) byType[a.type] = { count: 0, balance: 0 };
      byType[a.type].count++;
      if (a.is_posting) byType[a.type].balance += Number(a.balance);
    }
    return byType;
  }, [accounts]);

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
      (!q || node.name.toLowerCase().includes(q) || node.account_no.toLowerCase().includes(q));
    const children = (node.children || []).map((c) => filterNode(c, type, q)).filter(Boolean) as ChartOfAccount[];
    if (matches || children.length > 0) {
      return { ...node, children };
    }
    return null;
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(accounts.map((a) => a.id)));
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  async function deleteAccount(account: ChartOfAccount) {
    const hasChildren = accounts.some((a) => a.parent_id === account.id);
    if (hasChildren) {
      alert('Cannot delete: this account has child accounts. Delete or move them first.');
      return;
    }
    if (!confirm(`Delete account "${account.account_no} - ${account.name}"? This cannot be undone.`)) return;
    await supabase.from('chart_of_accounts').delete().eq('id', account.id);
    if (selectedAccount?.id === account.id) setSelectedAccount(null);
    loadData();
  }

  async function loadTemplate() {
    if (!currentCompany) return;
    if (!confirm('This will add the standard Nepal chart of accounts template to this company. Existing accounts with the same number will be skipped. Continue?')) return;
    setTemplateLoading(true);
    const existingNos = new Set(accounts.map((a) => a.account_no));
    const toInsert = NEPAL_TEMPLATE
      .filter((t) => !existingNos.has(t.account_no))
      .map((t) => ({
        company_id: currentCompany.id,
        account_no: t.account_no,
        name: t.name,
        type: t.type,
        parent_id: t.parent_id,
        is_posting: t.is_posting,
        balance: 0,
        description: t.description,
        is_active: true,
      }));
    if (toInsert.length > 0) {
      const { error } = await supabase.from('chart_of_accounts').insert(toInsert);
      if (error) {
        alert('Error loading template: ' + error.message);
      }
    }
    setTemplateLoading(false);
    setShowTemplate(false);
    loadData();
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
          className={`flex items-center gap-1 px-2 py-1 cursor-pointer transition-colors ${isSelected ? 'bg-blue-100' : 'hover:bg-blue-50'} ${level === 0 ? 'bg-gray-50 font-medium' : ''}`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => setSelectedAccount(node)}
        >
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); toggleExpand(node.id); }} className="p-0.5 hover:bg-gray-200 rounded">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${ACCOUNT_TYPE_COLORS[node.type]}`} />
          <span className="text-xs font-mono w-16">{node.account_no}</span>
          <span className="text-xs flex-1 truncate">{node.name}</span>
          {!node.is_active && <span className="bc-badge-gray text-[10px]">Inactive</span>}
          {node.is_posting && (
            <span className="text-xs text-gray-700 tabular-nums w-28 text-right">
              {formatCurrency(Number(node.balance), cur)}
            </span>
          )}
          {!node.is_posting && <span className="text-xs text-gray-400 italic w-28 text-right">(group)</span>}
          <span className={`bc-badge ml-2 text-[10px] ${node.is_posting ? 'bc-badge-info' : 'bc-badge-gray'}`}>
            {node.is_posting ? 'Posting' : 'Group'}
          </span>
          <div className="flex items-center gap-0.5 ml-1" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setEditingAccount(node); setShowForm(true); }} className="p-1 hover:bg-blue-100 text-gray-400 hover:text-[#0078d4] rounded" title="Edit">
              <Pencil className="w-3 h-3" />
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

  if (loading) return <div className="p-6 text-xs text-gray-400">Loading chart of accounts...</div>;
  if (loadError) return (
    <div className="p-6">
      <PageHeader title="Chart of Accounts" subtitle="Tree structure of all ledger accounts for this company" />
      <div className="bc-card mt-3 p-6 text-center">
        <div className="text-sm text-red-600 font-medium mb-2">Could not load accounts</div>
        <div className="text-xs text-gray-500 mb-4">{loadError}</div>
        <button onClick={() => loadData()} className="bc-btn-primary">Retry</button>
      </div>
    </div>
  );
  if (!currentCompany) return <div className="p-6 text-xs text-gray-400">No company selected.</div>;

  return (
    <div className="p-4">
      <PageHeader title="Chart of Accounts" subtitle="Tree structure of all ledger accounts for this company" />

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
        {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((type) => {
          const s = stats[type] || { count: 0, balance: 0 };
          const Icon = TYPE_ICONS[type];
          return (
            <div key={type} className="bc-card p-3 flex items-center gap-2.5">
              <div className={`w-8 h-8 flex items-center justify-center bg-gray-50`}>
                <Icon className={`w-4 h-4 ${ACCOUNT_TYPE_COLORS[type]}`} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">{ACCOUNT_TYPE_LABELS[type]}</div>
                <div className="text-xs font-semibold text-gray-700">{s.count} accounts</div>
                <div className="text-[11px] text-gray-500 tabular-nums">{formatCurrency(s.balance, cur)}</div>
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
          </div>

          <div className="w-px h-5 bg-gray-300" />

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="bc-input pl-7 w-48"
              placeholder="Search account no or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="bc-input w-32"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AccountType | 'all')}
          >
            {TYPE_FILTERS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
          </select>

          <div className="flex items-center gap-1 ml-auto">
            <button onClick={expandAll} className="bc-btn-secondary text-[11px]">Expand All</button>
            <button onClick={collapseAll} className="bc-btn-secondary text-[11px]">Collapse All</button>
          </div>
        </div>

        {/* Template banner */}
        {showTemplate && (
          <div className="px-4 py-3 border-b border-gray-200 bg-blue-50/50 flex items-center gap-3 animate-fade-in">
            <FileText className="w-4 h-4 text-[#0078d4] flex-shrink-0" />
            <div className="flex-1 text-xs text-gray-700">
              Load the standard Nepal chart of accounts template with {NEPAL_TEMPLATE.length} accounts covering
              assets, liabilities, equity, revenue, and expenses — including VAT, TDS, and excise duty accounts.
              Accounts that already exist will be skipped.
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
          <AccountForm
            currentCompany={currentCompany}
            accounts={accounts}
            editing={editingAccount}
            onDone={() => { setShowForm(false); setEditingAccount(null); loadData(); }}
            onCancel={() => { setShowForm(false); setEditingAccount(null); }}
          />
        )}

        {/* Tree header */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-200 bg-gray-100 text-xs font-semibold text-gray-500">
          <span className="w-4" />
          <span className="w-3.5" />
          <span className="w-16">Account No</span>
          <span className="flex-1">Account Name</span>
          <span className="w-28 text-right">Balance</span>
          <span className="w-16 ml-2">Type</span>
          <span className="w-14 ml-1">Actions</span>
        </div>

        {/* Tree body */}
        <div className="max-h-[55vh] overflow-y-auto bc-scroll">
          {filteredTree.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              {accounts.length === 0
                ? 'No accounts yet. Click "Nepal Template" to load the standard set, or "New Account" to create one.'
                : 'No accounts match your search.'}
            </div>
          ) : (
            filteredTree.map((node) => renderNode(node, 0))
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex justify-between text-xs font-semibold">
          <span>Total Accounts: {accounts.length}</span>
          <span>Posting Accounts: {accounts.filter((a) => a.is_posting).length}</span>
          <span>Total Balance: {formatCurrency(accounts.filter((a) => a.is_posting).reduce((s, a) => s + Number(a.balance), 0), cur)}</span>
        </div>
      </div>

      {/* Detail panel */}
      {selectedAccount && (
        <AccountDetail
          account={selectedAccount}
          currency={cur}
          onClose={() => setSelectedAccount(null)}
          onEdit={() => { setEditingAccount(selectedAccount); setShowForm(true); setSelectedAccount(null); }}
        />
      )}
    </div>
  );
}

function AccountForm({
  currentCompany,
  accounts,
  editing,
  onDone,
  onCancel,
}: {
  currentCompany: any;
  accounts: ChartOfAccount[];
  editing: ChartOfAccount | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [accountNo, setAccountNo] = useState(editing?.account_no || '');
  const [name, setName] = useState(editing?.name || '');
  const [type, setType] = useState<AccountType>(editing?.type || 'asset');
  const [parentId, setParentId] = useState(editing?.parent_id || '');
  const [isPosting, setIsPosting] = useState(editing?.is_posting ?? true);
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [description, setDescription] = useState(editing?.description || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableParents = accounts.filter((a) =>
    !editing || a.id !== editing.id
  ).filter((a) =>
    a.parent_id === null || !a.is_posting
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountNo || !name) { setError('Account No and Name are required'); return; }
    if (!currentCompany) return;
    setSaving(true);
    setError(null);

    const payload = {
      company_id: currentCompany.id,
      account_no: accountNo,
      name,
      type,
      parent_id: parentId || null,
      is_posting: isPosting,
      is_active: isActive,
      description: description || null,
    };

    let result;
    if (editing) {
      result = await supabase.from('chart_of_accounts').update(payload).eq('id', editing.id);
    } else {
      result = await supabase.from('chart_of_accounts').insert({ ...payload, balance: 0 });
    }

    if (result.error) setError(result.error.message);
    else onDone();
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 border-b border-gray-200 bg-blue-50/50 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-700">
          {editing ? `Edit: ${editing.account_no} - ${editing.name}` : 'Create New Account'}
        </span>
        <button type="button" onClick={onCancel} className="p-1 hover:bg-gray-200 rounded">
          <X className="w-3.5 h-3.5 text-gray-500" />
        </button>
      </div>
      {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <div>
          <label className="bc-label">Account No</label>
          <input className="bc-input" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} placeholder="e.g. 1030" />
        </div>
        <div className="md:col-span-2">
          <label className="bc-label">Name</label>
          <input className="bc-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Account name" />
        </div>
        <div>
          <label className="bc-label">Type</label>
          <select className="bc-input" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
            <option value="asset">Asset</option>
            <option value="liability">Liability</option>
            <option value="equity">Equity</option>
            <option value="revenue">Revenue</option>
            <option value="expense">Expense</option>
          </select>
        </div>
        <div>
          <label className="bc-label">Parent Account</label>
          <select className="bc-input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">(none - root)</option>
            {availableParents.map((a) => (
              <option key={a.id} value={a.id}>{a.account_no} - {a.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={isPosting} onChange={(e) => setIsPosting(e.target.checked)} className="w-3.5 h-3.5 accent-[#0078d4]" />
            Posting
          </label>
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-3.5 h-3.5 accent-[#0078d4]" />
            Active
          </label>
        </div>
        <div className="md:col-span-6">
          <label className="bc-label">Description (optional)</label>
          <input className="bc-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Notes about this account" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-2">
        <button type="button" onClick={onCancel} className="bc-btn-secondary">Cancel</button>
        <button type="submit" disabled={saving} className="bc-btn-primary">
          {saving ? 'Saving...' : editing ? 'Update' : 'Save'}
        </button>
      </div>
    </form>
  );
}

function AccountDetail({
  account,
  currency,
  onClose,
  onEdit,
}: {
  account: ChartOfAccount;
  currency: string;
  onClose: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed bottom-0 right-0 w-full md:w-[400px] bg-white border-t md:border-l md:border-t-0 border-gray-300 shadow-2xl z-40 animate-slide-in md:rounded-tl-lg overflow-hidden">
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
      <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto bc-scroll">
        <div className="grid grid-cols-2 gap-3">
          <DetailField label="Account Number" value={account.account_no} />
          <DetailField label="Type" value={ACCOUNT_TYPE_LABELS[account.type]} />
          <DetailField label="Posting Type" value={account.is_posting ? 'Posting Account' : 'Group Account'} />
          <DetailField label="Status" value={account.is_active ? 'Active' : 'Inactive'} />
          <DetailField label="Current Balance" value={formatCurrency(Number(account.balance), currency)} highlight />
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

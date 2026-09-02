import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import type { ChartOfAccount, AccountType } from '@/types/erp';
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_COLORS } from '@/types/erp';
import { ChevronRight, ChevronDown, Plus, BookOpen, Wallet, TrendingDown, TrendingUp, DollarSign, Layers } from 'lucide-react';

export default function ChartOfAccounts() {
  const { currentCompany } = useAuth();
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [tree, setTree] = useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany?.id]);

  async function loadData() {
    if (!currentCompany) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('chart_of_accounts')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('account_no');
    if (!error && data) {
      setAccounts(data);
      setTree(buildTree(data));
      const rootIds = data.filter((a: any) => a.parent_id === null).map((a: any) => a.id);
      setExpanded(new Set(rootIds));
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

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const cur = currentCompany?.currency || 'NPR';
  const typeIcons: Record<AccountType, any> = {
    asset: Wallet,
    liability: TrendingDown,
    equity: TrendingUp,
    revenue: DollarSign,
    expense: Layers,
  };

  function renderNode(node: ChartOfAccount, level: number) {
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const Icon = node.parent_id === null ? typeIcons[node.type] : BookOpen;

    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-1 px-2 py-1 hover:bg-blue-50 cursor-pointer ${level === 0 ? 'bg-gray-50' : ''}`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
        >
          {hasChildren ? (
            <button onClick={() => toggleExpand(node.id)} className="p-0.5 hover:bg-gray-200">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <span className="w-4" />
          )}
          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${ACCOUNT_TYPE_COLORS[node.type]}`} />
          <span className="text-xs font-mono w-16">{node.account_no}</span>
          <span className="text-xs flex-1 truncate">{node.name}</span>
          <span className={`text-xs ${node.is_posting ? 'text-gray-700' : 'text-gray-400 italic'}`}>
            {node.is_posting ? formatCurrency(node.balance, cur) : '(group)'}
          </span>
          <span className="bc-badge-gray ml-2">{ACCOUNT_TYPE_LABELS[node.type]}</span>
        </div>
        {isExpanded && hasChildren && node.children!.map((child) => renderNode(child, level + 1))}
      </div>
    );
  }

  if (loading) return <div className="p-6 text-xs text-gray-400">Loading chart of accounts...</div>;

  return (
    <div className="p-4">
      <PageHeader title="Chart of Accounts" subtitle="Tree structure of all ledger accounts" />

      <div className="bc-card mt-3">
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-xs font-semibold text-gray-600">Account Tree</h2>
          <button onClick={() => setShowAddForm(!showAddForm)} className="bc-btn-primary">
            <Plus className="w-3.5 h-3.5" /> New Account
          </button>
        </div>

        {showAddForm && <AddAccountForm currentCompany={currentCompany} accounts={accounts} onDone={() => { setShowAddForm(false); loadData(); }} />}

        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-gray-200 bg-gray-100 text-xs font-semibold text-gray-500">
          <span className="w-4" />
          <span className="w-3.5" />
          <span className="w-16">Account No</span>
          <span className="flex-1">Account Name</span>
          <span className="w-32 text-right">Balance</span>
          <span className="w-24 ml-2">Type</span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto bc-scroll">
          {tree.map((node) => renderNode(node, 0))}
        </div>

        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex justify-between text-xs font-semibold">
          <span>Total Accounts: {accounts.length}</span>
          <span>Total Balance: {formatCurrency(accounts.filter(a => a.is_posting).reduce((s, a) => s + a.balance, 0), cur)}</span>
        </div>
      </div>
    </div>
  );
}

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

function AddAccountForm({ currentCompany, accounts, onDone }: { currentCompany: any; accounts: ChartOfAccount[]; onDone: () => void }) {
  const [accountNo, setAccountNo] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('asset');
  const [parentId, setParentId] = useState('');
  const [isPosting, setIsPosting] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountNo || !name) { setError('Account No and Name are required'); return; }
    setSaving(true);
    setError(null);
    const { error } = await supabase.from('chart_of_accounts').insert({
      company_id: currentCompany.id,
      account_no: accountNo,
      name,
      type,
      parent_id: parentId || null,
      is_posting: isPosting,
      balance: 0,
    });
    if (error) setError(error.message);
    else onDone();
    setSaving(false);
  }

  return (
    <form onSubmit={handleSubmit} className="p-3 border-b border-gray-200 bg-blue-50/50">
      {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <div>
          <label className="bc-label">Account No</label>
          <input className="bc-input" value={accountNo} onChange={(e) => setAccountNo(e.target.value)} placeholder="e.g. 1030" />
        </div>
        <div>
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
            <option value="">(none)</option>
            {accounts.filter((a) => !a.is_posting || a.parent_id === null).map((a) => (
              <option key={a.id} value={a.id}>{a.account_no} - {a.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-1 text-xs">
            <input type="checkbox" checked={isPosting} onChange={(e) => setIsPosting(e.target.checked)} className="w-3.5 h-3.5" />
            Posting
          </label>
          <button type="submit" disabled={saving} className="bc-btn-primary">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </form>
  );
}

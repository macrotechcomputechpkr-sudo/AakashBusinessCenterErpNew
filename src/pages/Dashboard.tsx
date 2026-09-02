import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import { Wallet, Users, Package, FileText, TrendingUp, TrendingDown, Building2, Calendar } from 'lucide-react';

export default function Dashboard() {
  const { currentCompany, currentBranch, tenant } = useAuth();
  const [stats, setStats] = useState({
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    customerCount: 0,
    itemCount: 0,
    voucherCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany?.id, currentBranch?.id]);

  async function loadData() {
    if (!currentCompany) return;
    setLoading(true);
    try {
      const { data: coa } = await supabase
        .from('chart_of_accounts')
        .select('type, balance, is_posting')
        .eq('company_id', currentCompany.id)
        .eq('is_posting', true);

      let custQuery = supabase.from('customers').select('id').eq('company_id', currentCompany.id);
      if (currentBranch) custQuery = custQuery.or(`branch_id.eq.${currentBranch.id},branch_id.is.null`);
      const { data: customers } = await custQuery;

      let itemQuery = supabase.from('items').select('id').eq('company_id', currentCompany.id);
      if (currentBranch) itemQuery = itemQuery.or(`branch_id.eq.${currentBranch.id},branch_id.is.null`);
      const { data: items } = await itemQuery;

      let voucherQuery = supabase.from('vouchers').select('id').eq('company_id', currentCompany.id);
      if (currentBranch) voucherQuery = voucherQuery.eq('branch_id', currentBranch.id);
      const { data: vouchers } = await voucherQuery;

      const coaData = coa || [];
      setStats({
        totalAssets: coaData.filter((a: any) => a.type === 'asset').reduce((s: number, a: any) => s + (a.balance || 0), 0),
        totalLiabilities: coaData.filter((a: any) => a.type === 'liability').reduce((s: number, a: any) => s + (a.balance || 0), 0),
        totalEquity: coaData.filter((a: any) => a.type === 'equity').reduce((s: number, a: any) => s + (a.balance || 0), 0),
        totalRevenue: coaData.filter((a: any) => a.type === 'revenue').reduce((s: number, a: any) => s + (a.balance || 0), 0),
        totalExpenses: coaData.filter((a: any) => a.type === 'expense').reduce((s: number, a: any) => s + (a.balance || 0), 0),
        customerCount: customers?.length || 0,
        itemCount: items?.length || 0,
        voucherCount: vouchers?.length || 0,
      });
    } catch (err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6 text-xs text-gray-400">Loading dashboard...</div>;

  const cur = currentCompany?.currency || 'NPR';
  const netProfit = stats.totalRevenue - stats.totalExpenses;

  return (
    <div className="p-4 space-y-4">
      {/* Company Info Banner */}
      <div className="bc-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#deecf9] flex items-center justify-center">
            <Building2 className="w-6 h-6 text-[#0078d4]" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-gray-800">{currentCompany?.name}</h1>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
              <span>PAN: {currentCompany?.pan_number}</span>
              <span>&middot;</span>
              <span>FY: {currentCompany?.fiscal_year_label}</span>
              <span>&middot;</span>
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {currentCompany?.address}</span>
              {currentBranch && <><span>&middot;</span><span className="text-[#0078d4] font-medium">{currentBranch.name}</span></>}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Tenant</div>
          <div className="text-sm font-medium text-[#0078d4]">{tenant?.tenant_code}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard icon={Wallet} label="Total Assets" value={formatCurrency(stats.totalAssets, cur)} color="blue" />
        <KpiCard icon={TrendingDown} label="Total Liabilities" value={formatCurrency(stats.totalLiabilities, cur)} color="amber" />
        <KpiCard icon={TrendingUp} label="Total Equity" value={formatCurrency(stats.totalEquity, cur)} color="green" />
        <KpiCard icon={TrendingUp} label="Net Profit" value={formatCurrency(netProfit, cur)} color={netProfit >= 0 ? 'green' : 'red'} />
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bc-card">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-600">Balance Sheet Summary</h2>
          </div>
          <div className="p-4 space-y-2">
            <BalanceRow label="Total Assets" value={stats.totalAssets} cur={cur} />
            <BalanceRow label="Total Liabilities" value={stats.totalLiabilities} cur={cur} />
            <BalanceRow label="Total Equity" value={stats.totalEquity} cur={cur} />
            <div className="border-t border-gray-200 pt-2 flex justify-between text-xs font-semibold">
              <span>Liabilities + Equity</span>
              <span className={stats.totalLiabilities + stats.totalEquity === stats.totalAssets ? 'text-green-700' : 'text-red-700'}>
                {formatCurrency(stats.totalLiabilities + stats.totalEquity, cur)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Balanced:</span>
              <span className={stats.totalLiabilities + stats.totalEquity === stats.totalAssets ? 'bc-badge-success' : 'bc-badge-danger'}>
                {stats.totalLiabilities + stats.totalEquity === stats.totalAssets ? 'Yes' : 'No'}
              </span>
            </div>
          </div>
        </div>

        <div className="bc-card">
          <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
            <h2 className="text-xs font-semibold text-gray-600">Profit & Loss Summary</h2>
          </div>
          <div className="p-4 space-y-2">
            <BalanceRow label="Revenue" value={stats.totalRevenue} cur={cur} />
            <BalanceRow label="Expenses" value={stats.totalExpenses} cur={cur} />
            <div className="border-t border-gray-200 pt-2 flex justify-between text-xs font-semibold">
              <span>Net Profit / (Loss)</span>
              <span className={netProfit >= 0 ? 'text-green-700' : 'text-red-700'}>
                {formatCurrency(netProfit, cur)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={Users} label="Customers" value={stats.customerCount} />
        <MiniStat icon={Package} label="Inventory Items" value={stats.itemCount} />
        <MiniStat icon={FileText} label="Vouchers" value={stats.voucherCount} />
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
  };
  return (
    <div className="bc-card p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 flex items-center justify-center border ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <div className="text-sm font-semibold text-gray-800">{value}</div>
    </div>
  );
}

function BalanceRow({ label, value, cur }: { label: string; value: number; cur: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium">{formatCurrency(value, cur)}</span>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="bc-card p-3 flex items-center gap-3">
      <div className="w-10 h-10 bg-[#deecf9] flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#0078d4]" />
      </div>
      <div>
        <div className="text-lg font-bold text-gray-800">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}

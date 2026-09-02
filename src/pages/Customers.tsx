import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/format';
import type { Customer } from '@/types/erp';
import { PageHeader } from './ChartOfAccounts';
import { Plus, Trash2, Users, AlertCircle } from 'lucide-react';

export default function Customers() {
  const { currentCompany, currentBranch } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', address: '', phone: '', email: '', credit_limit: '100000' });

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany?.id, currentBranch?.id]);

  async function loadData() {
    if (!currentCompany) return;
    setLoading(true);
    let query = supabase.from('customers').select('*').eq('company_id', currentCompany.id);
    if (currentBranch) query = query.or(`branch_id.eq.${currentBranch.id},branch_id.is.null`);
    const { data } = await query.order('code');
    setCustomers(data || []);
    setLoading(false);
  }

  async function addCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCompany || !form.code || !form.name) return;
    setError(null);
    const { error } = await supabase.from('customers').insert({
      company_id: currentCompany.id,
      branch_id: currentBranch?.id || null,
      code: form.code,
      name: form.name,
      address: form.address || null,
      phone: form.phone || null,
      email: form.email || null,
      credit_limit: parseFloat(form.credit_limit) || 0,
      balance: 0,
    });
    if (error) { setError(error.message); return; }
    setForm({ code: '', name: '', address: '', phone: '', email: '', credit_limit: '100000' });
    setShowForm(false);
    loadData();
  }

  async function deleteCustomer(id: string) {
    if (!confirm('Delete this customer?')) return;
    await supabase.from('customers').delete().eq('id', id);
    loadData();
  }

  const cur = currentCompany?.currency || 'NPR';

  if (loading) return <div className="p-6 text-xs text-gray-400">Loading customers...</div>;

  return (
    <div className="p-4">
      <PageHeader title="Customers" subtitle="Customer master data and balances" />

      <div className="bc-card mt-3">
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0078d4]" />
            <h2 className="text-xs font-semibold text-gray-600">Customer List ({customers.length})</h2>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bc-btn-primary">
            <Plus className="w-3.5 h-3.5" /> New Customer
          </button>
        </div>

        {showForm && (
          <form onSubmit={addCustomer} className="p-3 border-b border-gray-200 bg-blue-50/50">
            {error && <div className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</div>}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
              <input className="bc-input" placeholder="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <input className="bc-input md:col-span-2" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="bc-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input className="bc-input" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input className="bc-input" type="number" placeholder="Credit Limit" value={form.credit_limit} onChange={(e) => setForm({ ...form, credit_limit: e.target.value })} />
              <div className="md:col-span-5" />
              <button type="submit" className="bc-btn-primary">Save</button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto bc-scroll">
          <table className="bc-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th className="text-right">Credit Limit</th>
                <th className="text-right">Balance</th>
                <th className="text-right">Available</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-400 py-4">No customers found</td></tr>
              ) : customers.map((c) => {
                const available = c.credit_limit - c.balance;
                return (
                  <tr key={c.id}>
                    <td className="font-mono">{c.code}</td>
                    <td className="font-medium">{c.name}</td>
                    <td>{c.phone || '-'}</td>
                    <td className="text-gray-500">{c.email || '-'}</td>
                    <td className="text-right">{formatCurrency(c.credit_limit, cur)}</td>
                    <td className="text-right font-medium">{formatCurrency(c.balance, cur)}</td>
                    <td className={`text-right font-medium ${available >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(available, cur)}
                    </td>
                    <td>
                      <button onClick={() => deleteCustomer(c.id)} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500">
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

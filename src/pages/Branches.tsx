import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Branch } from '@/types/erp';
import { PageHeader } from './ChartOfAccounts';
import { Plus, Trash2, GitBranch, AlertCircle, Building2, Check } from 'lucide-react';

export default function Branches() {
  const { currentCompany, branches, switchBranch, currentBranch } = useAuth();
  const [list, setList] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ code: '', name: '', address: '', phone: '', is_head_office: false });

  useEffect(() => {
    if (currentCompany) loadData();
  }, [currentCompany?.id, branches.length]);

  async function loadData() {
    if (!currentCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from('branches')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('is_head_office', { ascending: false })
      .order('code');
    setList(data || []);
    setLoading(false);
  }

  async function addBranch(e: React.FormEvent) {
    e.preventDefault();
    if (!currentCompany || !form.code || !form.name) return;
    setError(null);
    const { error } = await supabase.from('branches').insert({
      company_id: currentCompany.id,
      code: form.code,
      name: form.name,
      address: form.address || null,
      phone: form.phone || null,
      is_head_office: form.is_head_office,
      is_active: true,
    });
    if (error) { setError(error.message); return; }
    setForm({ code: '', name: '', address: '', phone: '', is_head_office: false });
    setShowForm(false);
    loadData();
  }

  async function toggleActive(b: Branch) {
    await supabase.from('branches').update({ is_active: !b.is_active }).eq('id', b.id);
    loadData();
  }

  async function deleteBranch(id: string) {
    if (!confirm('Delete this branch? Transactions linked to it will remain but lose their branch tag.')) return;
    await supabase.from('branches').delete().eq('id', id);
    loadData();
  }

  if (loading) return <div className="p-6 text-xs text-gray-400">Loading branches...</div>;

  return (
    <div className="p-4">
      <PageHeader title="Branches" subtitle="Manage physical locations for this company" />

      <div className="bc-card mt-3">
        <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#0078d4]" />
            <h2 className="text-xs font-semibold text-gray-600">Branch List ({list.length})</h2>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="bc-btn-primary">
            <Plus className="w-3.5 h-3.5" /> New Branch
          </button>
        </div>

        {showForm && (
          <form onSubmit={addBranch} className="p-3 border-b border-gray-200 bg-blue-50/50">
            {error && <div className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</div>}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <input className="bc-input" placeholder="Code (e.g. BR1)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <input className="bc-input md:col-span-2" placeholder="Branch Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className="bc-input" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <input className="bc-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <label className="flex items-center gap-1.5 text-xs text-slate-700">
                <input type="checkbox" checked={form.is_head_office} onChange={(e) => setForm({ ...form, is_head_office: e.target.checked })} className="accent-[#0078d4] w-4 h-4" />
                Head Office
              </label>
              <div className="md:col-span-4" />
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
                <th>Address</th>
                <th>Phone</th>
                <th>Type</th>
                <th>Status</th>
                <th>Active</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-gray-400 py-4">No branches found</td></tr>
              ) : list.map((b) => (
                <tr key={b.id} className={currentBranch?.id === b.id ? 'bg-blue-50' : ''}>
                  <td className="font-mono">{b.code}</td>
                  <td className="font-medium flex items-center gap-1.5">
                    {b.is_head_office && <Building2 className="w-3.5 h-3.5 text-[#0078d4]" />}
                    {b.name}
                  </td>
                  <td>{b.address || '-'}</td>
                  <td>{b.phone || '-'}</td>
                  <td>{b.is_head_office ? <span className="bc-badge-info">Head Office</span> : <span className="bc-badge-gray">Branch</span>}</td>
                  <td>
                    <button onClick={() => toggleActive(b)} className={`px-2 py-0.5 text-[11px] ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td>
                    {currentBranch?.id === b.id ? (
                      <span className="text-[#0078d4] flex items-center gap-1 text-[11px]"><Check className="w-3 h-3" /> Selected</span>
                    ) : (
                      <button onClick={() => switchBranch(b)} className="text-[11px] text-[#0078d4] hover:underline">Select</button>
                    )}
                  </td>
                  <td>
                    <button onClick={() => deleteBranch(b.id)} className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Building2, ChevronDown, LogOut, Check, Keyboard, GitBranch } from 'lucide-react';
import type { PageKey } from '@/types/nav';

interface TopBarProps {
  currentPage: PageKey;
  onNavigate: (page: PageKey) => void;
}

export default function TopBar({ onNavigate }: TopBarProps) {
  const { tenant, companies, currentCompany, switchCompany, branches, currentBranch, switchBranch, erpUser, signOut } = useAuth();
  const [companyMenuOpen, setCompanyMenuOpen] = useState(false);
  const [branchMenuOpen, setBranchMenuOpen] = useState(false);
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);
  const shortcutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setCompanyMenuOpen(false);
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) setBranchMenuOpen(false);
      if (shortcutRef.current && !shortcutRef.current.contains(e.target as Node)) setShortcutOpen(false);
      setOpenMenu(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bg-[#0078d4] text-white flex items-center h-10 px-3 gap-3 flex-shrink-0">
      <div className="flex items-center gap-2">
        <Building2 className="w-5 h-5" />
        <span className="text-sm font-semibold">Sahayak ERP</span>
      </div>

      <div className="w-px h-6 bg-white/20" />

      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-blue-100">Tenant:</span>
        <span className="bc-badge bg-white/15 text-white">{tenant?.tenant_code}</span>
      </div>

      <div className="w-px h-6 bg-white/20" />

      {/* Company Switcher */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setCompanyMenuOpen(!companyMenuOpen)}
          className="flex items-center gap-2 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 transition-colors"
        >
          <Building2 className="w-3.5 h-3.5" />
          <span className="max-w-[200px] truncate">{currentCompany?.name || 'Select Company'}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {companyMenuOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white text-gray-800 shadow-xl border border-gray-200 min-w-[280px] z-50 animate-fade-in">
            <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500">
              Switch Company
            </div>
            {companies.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  switchCompany(c);
                  setCompanyMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-blue-50 transition-colors text-left"
              >
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-gray-400 text-[11px]">PAN: {c.pan_number} &middot; FY: {c.fiscal_year_label}</div>
                </div>
                {currentCompany?.id === c.id && <Check className="w-4 h-4 text-[#0078d4]" />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-white/20" />

      {/* Branch Switcher */}
      <div className="relative" ref={branchRef}>
        <button
          onClick={() => setBranchMenuOpen(!branchMenuOpen)}
          className="flex items-center gap-2 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 transition-colors"
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span className="max-w-[160px] truncate">{currentBranch?.name || 'All Branches'}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>

        {branchMenuOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white text-gray-800 shadow-xl border border-gray-200 min-w-[240px] z-50 animate-fade-in">
            <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500">
              Switch Branch
            </div>
            {branches.map((b) => (
              <button
                key={b.id}
                onClick={() => {
                  switchBranch(b);
                  setBranchMenuOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-blue-50 transition-colors text-left"
              >
                <div>
                  <div className="font-medium flex items-center gap-1.5">
                    {b.is_head_office && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">HO</span>}
                    {b.name}
                  </div>
                  <div className="text-gray-400 text-[11px]">{b.code}{b.address ? ` · ${b.address}` : ''}</div>
                </div>
                {currentBranch?.id === b.id && <Check className="w-4 h-4 text-[#0078d4]" />}
              </button>
            ))}
            {branches.length === 0 && (
              <div className="px-3 py-3 text-xs text-gray-400">No branches configured</div>
            )}
          </div>
        )}
      </div>

      <div className="w-px h-6 bg-white/20" />

      <div className="flex items-center gap-0.5 h-full">
        {[
          { label: 'Home', items: [{ label: 'Dashboard', page: 'dashboard' as PageKey }] },
          { label: 'Masters', items: [{ label: 'Chart of Accounts', page: 'chart_of_accounts' as PageKey }, { label: 'Customers', page: 'customers' as PageKey }, { label: 'Branches', page: 'branches' as PageKey }] },
          { label: 'Transactions', items: [{ label: 'Voucher Entry', page: 'voucher_entry' as PageKey }] },
          { label: 'Registers', items: [{ label: 'Posted Vouchers', page: 'vouchers_list' as PageKey }, { label: 'General Ledger', page: 'gl_entries' as PageKey }] },
          { label: 'Receivables', items: [{ label: 'Customers', page: 'customers' as PageKey }] },
          { label: 'Stock', items: [{ label: 'Item Master', page: 'inventory' as PageKey }, { label: 'Stock Ledger', page: 'stock_ledger' as PageKey }] },
          { label: 'Reports', items: [{ label: 'Dashboard', page: 'dashboard' as PageKey }] },
          { label: 'Admin', items: [{ label: 'Database Backup', page: 'backup' as PageKey }, { label: 'Control Panel', page: 'system_control' as PageKey }] },
          { label: 'Help', items: [{ label: 'Keyboard Shortcuts', page: null }] },
        ].map((menu) => (
          <div key={menu.label} className="relative h-full flex items-center">
            <button onClick={() => setOpenMenu(openMenu === menu.label ? null : menu.label)} className="top-menu-button">
              {menu.label}
            </button>
            {openMenu === menu.label && (
              <div className="absolute top-full left-0 mt-0 min-w-[180px] bg-white text-gray-800 border border-gray-200 shadow-xl z-50 py-1 animate-fade-in">
                {menu.items.map((item) => (
                  <button key={item.label} onClick={() => { if (item.page) onNavigate(item.page); setOpenMenu(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 hover:text-[#0078d4]">
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="w-px h-6 bg-white/20" />

      <div className="flex items-center gap-1.5 text-xs">
        <span className="bc-badge-success">Online</span>
        <span className="bc-badge bg-white/15 text-white">FY: {currentCompany?.fiscal_year_label}</span>
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-3">
        {/* Shortcut Legend */}
        <div className="relative" ref={shortcutRef}>
          <button
            onClick={() => setShortcutOpen(!shortcutOpen)}
            className="flex items-center gap-1.5 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span>Shortcuts</span>
          </button>
          {shortcutOpen && (
            <div className="absolute top-full right-0 mt-1 bg-white text-gray-800 shadow-xl border border-gray-200 min-w-[260px] z-50 animate-fade-in">
              <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500">
                Keyboard Shortcuts
              </div>
              <div className="p-3 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span>Move to next field</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[11px]">Enter</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Post voucher / invoice</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[11px]">F2</kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span>Insert new line item</span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[11px]">F3</kbd>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-blue-100">{erpUser?.full_name}</span>
          <span className="bc-badge bg-white/15 text-white">{erpUser?.role}</span>
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-1.5 px-2 py-1 text-xs bg-white/10 hover:bg-red-500 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

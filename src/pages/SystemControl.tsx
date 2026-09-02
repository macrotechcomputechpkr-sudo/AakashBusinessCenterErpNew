import { useEffect, useState } from 'react';
import { AlertTriangle, Check, Database, FileCheck2, Package, Printer, Save, Settings2, ShieldCheck, SlidersHorizontal, Building2, Receipt, CalendarDays, Globe, Bell, Lock, Percent, FileText, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type TabKey = 'core' | 'sales' | 'inventory' | 'control' | 'tax' | 'output';
type Policy = 'allow' | 'warn' | 'block';

type PreferenceState = {
  backupReminder: string;
  backupRetention: string;
  auditTrail: boolean;
  dayLocking: boolean;
  multiCurrency: boolean;
  productCompanyWise: boolean;
  customerRestricted: boolean;
  supplierRestricted: boolean;
  salesDiscount: boolean;
  purchaseDiscount: boolean;
  showLastDate: boolean;
  enableAttachment: boolean;
  autoPopListing: boolean;
  enablePickListSearch: boolean;
  approvalRequired: boolean;
  printAfterPost: boolean;
  printerName: string;
  numberOfCopies: number;
  duplicateNamePolicy: Policy;
  negativeStockPolicy: Policy;
  creditLimitPolicy: Policy;
  backDatePolicy: Policy;
  unbalancedVoucherPolicy: Policy;
  postedEditPolicy: Policy;
  fiscalPeriodPolicy: Policy;
  priceBelowCostPolicy: Policy;
  attachmentRequired: boolean;
  notifyApproval: boolean;
  notifyBackup: boolean;
  vatEnabled: boolean;
  vatRate: number;
  tdsEnabled: boolean;
  tdsThreshold: number;
  nepaliDateFormat: boolean;
  fiscalYearStart: string;
  irdIntegration: boolean;
  irdAutoPush: boolean;
  branchConsolidation: boolean;
  exciseDuty: boolean;
  roundOffEnabled: boolean;
  eInvoiceEnabled: boolean;
  bilingualInvoice: boolean;
  printFooterNote: string;
  notifyLowStock: boolean;
  notifyCreditLimit: boolean;
};

const DEFAULTS: PreferenceState = {
  backupReminder: 'Daily', backupRetention: '90 days', auditTrail: true, dayLocking: true, multiCurrency: false,
  productCompanyWise: true, customerRestricted: true, supplierRestricted: false, salesDiscount: true,
  purchaseDiscount: true, showLastDate: false, enableAttachment: true, autoPopListing: true,
  enablePickListSearch: true, approvalRequired: false, printAfterPost: false, printerName: '', numberOfCopies: 1,
  duplicateNamePolicy: 'warn', negativeStockPolicy: 'block', creditLimitPolicy: 'warn', backDatePolicy: 'warn',
  unbalancedVoucherPolicy: 'block', postedEditPolicy: 'block', fiscalPeriodPolicy: 'block', priceBelowCostPolicy: 'warn',
  attachmentRequired: false, notifyApproval: true, notifyBackup: true,
  vatEnabled: true, vatRate: 13, tdsEnabled: false, tdsThreshold: 50000,
  nepaliDateFormat: true, fiscalYearStart: 'Shrawan', irdIntegration: false, irdAutoPush: false,
  branchConsolidation: true, exciseDuty: false, roundOffEnabled: true, eInvoiceEnabled: false,
  bilingualInvoice: false, printFooterNote: '', notifyLowStock: true, notifyCreditLimit: true,
};

const TABS: { key: TabKey; label: string; icon: typeof Settings2; description: string }[] = [
  { key: 'core', label: 'Core Setup', icon: Settings2, description: 'Company, database and entry behavior' },
  { key: 'tax', label: 'Tax & IRD', icon: Receipt, description: 'VAT, TDS, fiscal year and IRD integration' },
  { key: 'sales', label: 'Sales & Receivables', icon: FileCheck2, description: 'Document, customer and pricing rules' },
  { key: 'inventory', label: 'Purchase & Stock', icon: Package, description: 'Items, suppliers and stock movement' },
  { key: 'control', label: 'Control Center', icon: ShieldCheck, description: 'Warnings, approvals and hard stops' },
  { key: 'output', label: 'Print & Alerts', icon: Printer, description: 'Output, notifications and localization' },
];

export default function SystemControl() {
  const { currentCompany, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('core');
  const [settings, setSettings] = useState<PreferenceState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentCompany) return;
    let mounted = true;
    async function loadSettings() {
      setLoading(true);
      const { data, error: loadError } = await supabase.from('company_preferences').select('settings').eq('company_id', currentCompany!.id).maybeSingle();
      if (!mounted) return;
      if (loadError) setError('Settings could not be loaded.');
      if (data?.settings && typeof data.settings === 'object') setSettings({ ...DEFAULTS, ...(data.settings as Partial<PreferenceState>) });
      setLoading(false);
    }
    loadSettings();
    return () => { mounted = false; };
  }, [currentCompany?.id]);

  function update<K extends keyof PreferenceState>(key: K, value: PreferenceState[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  async function saveSettings() {
    if (!currentCompany || !user) return;
    setSaving(true); setError(null);
    const { error: saveError } = await supabase.from('company_preferences').upsert({ company_id: currentCompany.id, settings, updated_by: user.id, updated_at: new Date().toISOString() }, { onConflict: 'company_id' });
    setSaving(false);
    if (saveError) { setError('Settings could not be saved.'); return; }
    setSaved(true);
  }

  if (loading) return <div className="p-6 text-xs text-gray-500">Loading control panel...</div>;

  const active = TABS.find((tab) => tab.key === activeTab) || TABS[0];
  return (
    <div className="p-4 min-h-full">
      <div className="system-control-shell">
        <header className="system-control-header">
          <div className="flex items-start gap-3">
            <div className="system-control-mark"><SlidersHorizontal className="w-5 h-5" /></div>
            <div>
              <div className="system-eyebrow">ADMINISTRATION / {currentCompany?.name}</div>
              <h1>Control Panel</h1>
              <p>Configure tax rules, operational guardrails and Nepal-specific compliance for this company.</p>
            </div>
          </div>
          <div className="system-health">
            <span className="system-health-dot" /> Configuration active
            <div className="text-[10px] text-slate-300">Saved per company</div>
          </div>
        </header>
        <div className="system-control-tabs">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`system-control-tab ${activeTab === key ? 'active' : ''}`}>
              <Icon className="w-4 h-4" /><span>{label}</span>
            </button>
          ))}
        </div>
        <div className="px-5 py-4 border-b border-slate-200 bg-white">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-[#0078d4]">{active.label}</div>
          <div className="text-xs text-slate-500 mt-1">{active.description}</div>
        </div>
        <div className="system-control-body">
          {activeTab === 'core' && <CorePanel settings={settings} update={update} />}
          {activeTab === 'tax' && <TaxPanel settings={settings} update={update} />}
          {activeTab === 'sales' && <SalesPanel settings={settings} update={update} />}
          {activeTab === 'inventory' && <InventoryPanel settings={settings} update={update} />}
          {activeTab === 'control' && <ControlPanel settings={settings} update={update} />}
          {activeTab === 'output' && <OutputPanel settings={settings} update={update} />}
        </div>
        <footer className="system-control-footer">
          <div className={error ? 'text-red-600' : saved ? 'text-emerald-700' : 'text-slate-500'}>
            {error || (saved ? 'All changes saved for this company.' : 'Review changes before applying them to daily work.')}
          </div>
          <button onClick={saveSettings} disabled={saving} className="bc-btn-primary min-w-[122px]">
            {saving ? 'Saving...' : saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Apply Changes</>}
          </button>
        </footer>
      </div>
    </div>
  );
}

type PanelProps = { settings: PreferenceState; update: <K extends keyof PreferenceState>(key: K, value: PreferenceState[K]) => void };

function CorePanel({ settings, update }: PanelProps) {
  return <PanelGrid>
    <SettingSection title="Data Protection" icon={Database}>
      <SelectField label="Backup reminder" value={settings.backupReminder} options={['Daily', 'Weekly', 'Monthly', 'Never']} onChange={(value) => update('backupReminder', value)} />
      <SelectField label="Backup retention" value={settings.backupRetention} options={['30 days', '90 days', '180 days', '1 year']} onChange={(value) => update('backupRetention', value)} />
      <CheckField label="Keep an audit trail of all changes" checked={settings.auditTrail} onChange={(value) => update('auditTrail', value)} />
      <CheckField label="Lock completed business days" checked={settings.dayLocking} onChange={(value) => update('dayLocking', value)} />
    </SettingSection>
    <SettingSection title="Entry Defaults" icon={Settings2}>
      <SelectField label="Off day (holiday)" value="Saturday" options={['Saturday', 'Sunday', 'None']} onChange={() => undefined} />
      <SelectField label="Number format" value="1,234.00" options={['1,234.00', '1.234,00', '1 234.00']} onChange={() => undefined} />
      <CheckField label="Multi-currency entries" checked={settings.multiCurrency} onChange={(value) => update('multiCurrency', value)} />
      <CheckField label="Show previous transaction date" checked={settings.showLastDate} onChange={(value) => update('showLastDate', value)} />
    </SettingSection>
    <SettingSection title="Multi-Branch" icon={Building2}>
      <CheckField label="Consolidate reports across branches" checked={settings.branchConsolidation} onChange={(value) => update('branchConsolidation', value)} />
      <CheckField label="Product-wise company restriction" checked={settings.productCompanyWise} onChange={(value) => update('productCompanyWise', value)} />
      <div className="pt-1"><button className="bc-btn-secondary">Manage branch permissions</button></div>
    </SettingSection>
  </PanelGrid>;
}

function TaxPanel({ settings, update }: PanelProps) {
  return <PanelGrid>
    <SettingSection title="VAT Configuration" icon={Percent}>
      <CheckField label="Enable VAT on sales and purchases" checked={settings.vatEnabled} onChange={(value) => update('vatEnabled', value)} />
      <NumberField label="VAT rate (%)" value={settings.vatRate} onChange={(value) => update('vatRate', value)} />
      <CheckField label="Round off tax amounts" checked={settings.roundOffEnabled} onChange={(value) => update('roundOffEnabled', value)} />
      <CheckField label="Enable excise duty on specific items" checked={settings.exciseDuty} onChange={(value) => update('exciseDuty', value)} />
    </SettingSection>
    <SettingSection title="TDS Configuration" icon={Receipt}>
      <CheckField label="Enable TDS deduction on payments" checked={settings.tdsEnabled} onChange={(value) => update('tdsEnabled', value)} />
      <NumberField label="TDS threshold amount (NPR)" value={settings.tdsThreshold} onChange={(value) => update('tdsThreshold', value)} />
      <div className="pt-1"><button className="bc-btn-secondary">Configure TDS rates by nature</button></div>
    </SettingSection>
    <SettingSection title="Fiscal Year" icon={CalendarDays}>
      <SelectField label="Fiscal year starts" value={settings.fiscalYearStart} options={['Shrawen', 'Chaitra', 'Baisakh', 'January']} onChange={(value) => update('fiscalYearStart', value)} />
      <PolicyField label="Posting outside fiscal period" value={settings.fiscalPeriodPolicy} onChange={(value) => update('fiscalPeriodPolicy', value)} />
      <CheckField label="Display dates in Bikram Sambat (BS)" checked={settings.nepaliDateFormat} onChange={(value) => update('nepaliDateFormat', value)} />
    </SettingSection>
    <SettingSection title="IRD Integration" icon={FileText}>
      <CheckField label="Enable IRD (Inland Revenue) integration" checked={settings.irdIntegration} onChange={(value) => update('irdIntegration', value)} />
      <CheckField label="Auto-push sales invoices to IRD" checked={settings.irdAutoPush} onChange={(value) => update('irdAutoPush', value)} />
      <CheckField label="Enable e-Invoice (electronic billing)" checked={settings.eInvoiceEnabled} onChange={(value) => update('eInvoiceEnabled', value)} />
      <div className="pt-1"><button className="bc-btn-secondary">Configure IRD credentials</button></div>
    </SettingSection>
  </PanelGrid>;
}

function SalesPanel({ settings, update }: PanelProps) {
  return <PanelGrid>
    <SettingSection title="Sales Documents" icon={FileCheck2}>
      <CheckField label="Sales discount enabled" checked={settings.salesDiscount} onChange={(value) => update('salesDiscount', value)} />
      <CheckField label="Require document attachment" checked={settings.attachmentRequired} onChange={(value) => update('attachmentRequired', value)} />
      <CheckField label="Allow attachments on entries" checked={settings.enableAttachment} onChange={(value) => update('enableAttachment', value)} />
      <PolicyField label="Duplicate customer or ledger name" value={settings.duplicateNamePolicy} onChange={(value) => update('duplicateNamePolicy', value)} />
    </SettingSection>
    <SettingSection title="Customer Rules">
      <CheckField label="Customer-wise restricted entry" checked={settings.customerRestricted} onChange={(value) => update('customerRestricted', value)} />
      <PolicyField label="Credit limit exceeded" value={settings.creditLimitPolicy} onChange={(value) => update('creditLimitPolicy', value)} />
      <PolicyField label="Sales price below cost" value={settings.priceBelowCostPolicy} onChange={(value) => update('priceBelowCostPolicy', value)} />
    </SettingSection>
  </PanelGrid>;
}

function InventoryPanel({ settings, update }: PanelProps) {
  return <PanelGrid>
    <SettingSection title="Purchase & Inventory" icon={Package}>
      <CheckField label="Purchase discount enabled" checked={settings.purchaseDiscount} onChange={(value) => update('purchaseDiscount', value)} />
      <CheckField label="Supplier-wise restricted entry" checked={settings.supplierRestricted} onChange={(value) => update('supplierRestricted', value)} />
      <CheckField label="Open item list automatically" checked={settings.autoPopListing} onChange={(value) => update('autoPopListing', value)} />
      <CheckField label="Wild search in pick lists" checked={settings.enablePickListSearch} onChange={(value) => update('enablePickListSearch', value)} />
      <PolicyField label="Negative stock issue" value={settings.negativeStockPolicy} onChange={(value) => update('negativeStockPolicy', value)} />
    </SettingSection>
    <SettingSection title="Stock Intelligence">
      <SelectField label="Stock valuation method" value="Weighted Average" options={['Weighted Average', 'FIFO', 'Standard Cost']} onChange={() => undefined} />
      <SelectField label="Reorder reminder" value="At reorder point" options={['At reorder point', '7 days before', 'Never']} onChange={() => undefined} />
      <CheckField label="Show available quantity during entry" checked={settings.productCompanyWise} onChange={(value) => update('productCompanyWise', value)} />
    </SettingSection>
  </PanelGrid>;
}

function ControlPanel({ settings, update }: PanelProps) {
  return <PanelGrid>
    <SettingSection title="Action Guardrails" icon={ShieldCheck}>
      <PolicyField label="Back-dated document" value={settings.backDatePolicy} onChange={(value) => update('backDatePolicy', value)} />
      <PolicyField label="Unbalanced voucher" value={settings.unbalancedVoucherPolicy} onChange={(value) => update('unbalancedVoucherPolicy', value)} />
      <PolicyField label="Editing a posted document" value={settings.postedEditPolicy} onChange={(value) => update('postedEditPolicy', value)} />
    </SettingSection>
    <SettingSection title="Approval Flow" icon={Lock}>
      <CheckField label="Approval required before posting" checked={settings.approvalRequired} onChange={(value) => update('approvalRequired', value)} />
      <CheckField label="Notify approvers on pending request" checked={settings.notifyApproval} onChange={(value) => update('notifyApproval', value)} />
      <div className="pt-1"><button className="bc-btn-secondary">Configure approval stages</button></div>
    </SettingSection>
  </PanelGrid>;
}

function OutputPanel({ settings, update }: PanelProps) {
  return <PanelGrid>
    <SettingSection title="Print Configuration" icon={Printer}>
      <CheckField label="Print after posting" checked={settings.printAfterPost} onChange={(value) => update('printAfterPost', value)} />
      <TextField label="Default printer" value={settings.printerName} placeholder="Select printer" onChange={(value) => update('printerName', value)} />
      <NumberField label="Number of copies" value={settings.numberOfCopies} onChange={(value) => update('numberOfCopies', value)} />
      <CheckField label="Bilingual invoice (English + Nepali)" checked={settings.bilingualInvoice} onChange={(value) => update('bilingualInvoice', value)} />
      <TextField label="Invoice footer note" value={settings.printFooterNote} placeholder="e.g. Thank you for your business" onChange={(value) => update('printFooterNote', value)} />
    </SettingSection>
    <SettingSection title="Notifications" icon={Bell}>
      <CheckField label="Notify on backup reminder" checked={settings.notifyBackup} onChange={(value) => update('notifyBackup', value)} />
      <CheckField label="Notify on blocked action" checked={settings.notifyApproval} onChange={(value) => update('notifyApproval', value)} />
      <CheckField label="Notify on low stock" checked={settings.notifyLowStock} onChange={(value) => update('notifyLowStock', value)} />
      <CheckField label="Notify on credit limit breach" checked={settings.notifyCreditLimit} onChange={(value) => update('notifyCreditLimit', value)} />
      <SelectField label="Notification tone" value="Standard" options={['Quiet', 'Standard', 'Urgent']} onChange={() => undefined} />
    </SettingSection>
  </PanelGrid>;
}

function PanelGrid({ children }: { children: React.ReactNode }) { return <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{children}</div>; }
function SettingSection({ title, icon: Icon, children }: { title: string; icon?: typeof Database; children: React.ReactNode }) { return <section className="system-section"><h2>{Icon && <Icon className="w-4 h-4 text-[#0078d4]" />}{title}</h2><div className="space-y-3 p-4">{children}</div></section>; }
function CheckField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center justify-between gap-4 text-xs text-slate-700 cursor-pointer"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-[#0078d4] w-4 h-4" /></label>; }
function PolicyField({ label, value, onChange }: { label: string; value: Policy; onChange: (value: Policy) => void }) { return <div className="flex items-center justify-between gap-3 text-xs text-slate-700"><span>{label}</span><div className="policy-picker">{(['allow', 'warn', 'block'] as Policy[]).map((policy) => <button key={policy} onClick={() => onChange(policy)} className={`policy-chip ${policy} ${value === policy ? 'selected' : ''}`}>{policy === 'allow' ? 'Allow' : policy === 'warn' ? 'Warn' : 'Block'}</button>)}</div></div>; }
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) { return <label className="flex items-center justify-between gap-4 text-xs text-slate-700"><span>{label}</span><select className="bc-input max-w-[180px]" value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>; }
function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) { return <label className="flex items-center justify-between gap-4 text-xs text-slate-700"><span>{label}</span><input className="bc-input max-w-[220px]" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>; }
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="flex items-center justify-between gap-4 text-xs text-slate-700"><span>{label}</span><input type="number" min="0" max="100" className="bc-input max-w-[100px]" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>; }

export interface Tenant {
  id: string;
  tenant_code: string;
  name: string;
  status: string;
  created_at: string;
}

export interface ErpUser {
  id: string;
  tenant_id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

export interface Company {
  id: string;
  tenant_id: string;
  name: string;
  pan_number: string | null;
  fiscal_year_label: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  currency: string;
  status: string;
  created_at: string;
}

export interface FiscalYear {
  id: string;
  company_id: string;
  fiscal_year_label: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export interface Branch {
  id: string;
  company_id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  is_head_office: boolean;
  created_at: string;
}

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface ChartOfAccount {
  id: string;
  company_id: string;
  account_no: string;
  name: string;
  type: AccountType;
  parent_id: string | null;
  is_posting: boolean;
  balance: number;
  created_at: string;
  children?: ChartOfAccount[];
}

export interface Customer {
  id: string;
  company_id: string;
  branch_id: string | null;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  credit_limit: number;
  balance: number;
  created_at: string;
}

export interface Vendor {
  id: string;
  company_id: string;
  branch_id: string | null;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  balance: number;
  created_at: string;
}

export interface Item {
  id: string;
  company_id: string;
  branch_id: string | null;
  code: string;
  description: string;
  unit_cost: number;
  sales_price: number;
  category: string | null;
  reorder_point: number;
  quantity_on_hand: number;
  created_at: string;
}

export interface Warehouse {
  id: string;
  company_id: string;
  branch_id: string | null;
  code: string;
  name: string;
  address: string | null;
  created_at: string;
}

export type VoucherType = 'sales_invoice' | 'purchase_invoice' | 'journal' | 'receipt' | 'payment';
export type VoucherStatus = 'draft' | 'posted';

export interface Voucher {
  id: string;
  company_id: string;
  branch_id: string | null;
  voucher_no: string;
  voucher_type: VoucherType;
  posting_date: string;
  description: string | null;
  total_amount: number;
  status: VoucherStatus;
  customer_id: string | null;
  vendor_id: string | null;
  created_at: string;
}

export interface VoucherLine {
  id: string;
  voucher_id: string;
  account_id: string | null;
  item_id: string | null;
  description: string | null;
  debit: number;
  credit: number;
  quantity: number;
  line_no: number;
}

export interface GlEntry {
  id: string;
  company_id: string;
  voucher_id: string;
  account_id: string;
  posting_date: string;
  debit: number;
  credit: number;
  description: string | null;
  source: string;
  created_at: string;
}

export interface StockLedgerEntry {
  id: string;
  company_id: string;
  branch_id: string | null;
  item_id: string;
  warehouse_id: string | null;
  movement_type: 'inward' | 'outward' | 'transfer';
  quantity: number;
  reference: string | null;
  posting_date: string;
  balance_after: number;
  created_at: string;
}

export const VOUCHER_TYPE_LABELS: Record<VoucherType, string> = {
  sales_invoice: 'Sales Invoice',
  purchase_invoice: 'Purchase Invoice',
  journal: 'Journal Voucher',
  receipt: 'Receipt Voucher',
  payment: 'Payment Voucher',
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  expense: 'Expenses',
};

export const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  asset: 'text-blue-700',
  liability: 'text-amber-700',
  equity: 'text-purple-700',
  revenue: 'text-green-700',
  expense: 'text-red-700',
};

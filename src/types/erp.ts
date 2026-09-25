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
export type DebitCredit = 'debit' | 'credit';
export type AccountSubType =
  | 'cash' | 'bank' | 'receivable' | 'payable' | 'inventory' | 'fixed_asset'
  | 'accumulated_dep' | 'tax' | 'equity_capital' | 'retained_earnings'
  | 'sales' | 'purchase' | 'salary' | 'rent' | 'utility' | 'transport' | 'other';

export interface ChartOfAccount {
  id: string;
  company_id: string;
  account_no: string;
  name: string;
  type: AccountType;
  parent_id: string | null;
  is_posting: boolean;
  balance: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  children?: ChartOfAccount[];
  opening_balance: number;
  debit_credit: DebitCredit;
  sub_type: AccountSubType | null;
  tax_rate: number;
  is_tax_account: boolean;
  currency: string | null;
  budget_amount: number;
  is_reconcilable: boolean;
  cost_center: string | null;
  is_blocked: boolean;
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
  uom: string;
  item_type: 'goods' | 'service' | 'non-inventory' | 'assembly';
  hsn_code: string | null;
  barcode: string | null;
  tax_category: 'standard' | 'zero_rated' | 'exempt' | 'nil_rated' | 'special';
  gst_rate: number;
  mrp: number;
  wholesale_price: number;
  discount_percent: number;
  brand: string | null;
  valuation_method: 'fifo' | 'lifo' | 'weighted_avg' | 'standard_cost';
  weight: number | null;
  weight_unit: string | null;
  min_stock: number;
  max_stock: number;
  reorder_qty: number;
  opening_stock: number;
  batch_tracked: boolean;
  expiry_tracked: boolean;
  supplier_id: string | null;
  is_active: boolean;
}

export const ITEM_TYPE_LABELS: Record<string, string> = {
  goods: 'Goods / Inventory',
  service: 'Service',
  'non-inventory': 'Non-Inventory',
  assembly: 'Assembly / BOM',
};

export const TAX_CATEGORY_LABELS: Record<string, string> = {
  standard: 'Standard (13% VAT)',
  zero_rated: 'Zero Rated',
  exempt: 'Exempt',
  nil_rated: 'Nil Rated',
  special: 'Special Rate',
};

export const VALUATION_METHOD_LABELS: Record<string, string> = {
  fifo: 'FIFO (First In First Out)',
  lifo: 'LIFO (Last In First Out)',
  weighted_avg: 'Weighted Average',
  standard_cost: 'Standard Cost',
};

export const UOM_OPTIONS = [
  'PCS', 'KG', 'G', 'LTR', 'ML', 'BOX', 'PKT', 'DOZEN', 'SET', 'MTR', 'CM',
  'SQM', 'CUB_M', 'ROLL', 'BAG', 'BOTTLE', 'PAIR', 'CARTON', 'BUNDLE', 'NOS',
];

export const ACCOUNT_SUB_TYPE_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank: 'Bank',
  receivable: 'Accounts Receivable',
  payable: 'Accounts Payable',
  inventory: 'Inventory',
  fixed_asset: 'Fixed Asset',
  accumulated_dep: 'Accumulated Depreciation',
  tax: 'Tax / VAT',
  equity_capital: 'Equity Capital',
  retained_earnings: 'Retained Earnings',
  sales: 'Sales Revenue',
  purchase: 'Purchase / COGS',
  salary: 'Salary & Wages',
  rent: 'Rent',
  utility: 'Utilities',
  transport: 'Transportation',
  other: 'Other',
};

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

export type PageKey =
  | 'dashboard'
  | 'chart_of_accounts'
  | 'voucher_entry'
  | 'vouchers_list'
  | 'customers'
  | 'inventory'
  | 'stock_ledger'
  | 'gl_entries'
  | 'backup'
  | 'system_control'
  | 'branches';

export interface NavItem {
  key: PageKey;
  label: string;
  icon: string;
}

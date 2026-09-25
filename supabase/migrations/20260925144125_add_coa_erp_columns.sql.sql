-- Add ERP-grade columns to chart_of_accounts
-- Features: opening balance, debit/credit nature, tax rate, currency, budget,
-- reconciliation flag, cost center tracking, sub-type, blocking flag

ALTER TABLE chart_of_accounts
  ADD COLUMN IF NOT EXISTS opening_balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS debit_credit text NOT NULL DEFAULT 'debit'
    CHECK (debit_credit IN ('debit','credit')),
  ADD COLUMN IF NOT EXISTS sub_type text DEFAULT NULL
    CHECK (sub_type IS NULL OR sub_type IN (
      'cash','bank','receivable','payable','inventory','fixed_asset',
      'accumulated_dep','tax','equity_capital','retained_earnings',
      'sales','purchase','salary','rent','utility','transport','other'
    )),
  ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_tax_account boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS currency text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS budget_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_reconcilable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cost_center text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_blocked boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN chart_of_accounts.opening_balance IS 'Opening balance at start of fiscal year';
COMMENT ON COLUMN chart_of_accounts.debit_credit IS 'Nature of account: debit or credit';
COMMENT ON COLUMN chart_of_accounts.sub_type IS 'Sub-classification for reporting (cash, bank, receivable, etc.)';
COMMENT ON COLUMN chart_of_accounts.tax_rate IS 'Default tax rate percentage for this account';
COMMENT ON COLUMN chart_of_accounts.is_tax_account IS 'Whether this is a tax/VAT account';
COMMENT ON COLUMN chart_of_accounts.currency IS 'Account currency if different from company currency';
COMMENT ON COLUMN chart_of_accounts.budget_amount IS 'Annual budget allocated to this account';
COMMENT ON COLUMN chart_of_accounts.is_reconcilable IS 'Whether this account supports bank reconciliation';
COMMENT ON COLUMN chart_of_accounts.cost_center IS 'Cost center / department code for this account';
COMMENT ON COLUMN chart_of_accounts.is_blocked IS 'Whether posting to this account is blocked';

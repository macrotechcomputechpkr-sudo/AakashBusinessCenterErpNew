/*
# Multi-Branch Support

## Overview
Adds a `branches` table so each company can have multiple physical branches (e.g., Head Office, Warehouse Branch, Retail Outlet). Transactional tables gain an optional `branch_id` column so entries can be tagged to a specific branch, enabling branch-level filtering and reporting.

## New Tables
- `branches`
  - `id` (uuid, primary key)
  - `company_id` (uuid, FK to companies, NOT NULL)
  - `code` (text, NOT NULL) — short branch code like "HO", "BR1"
  - `name` (text, NOT NULL) — full branch name
  - `address` (text, nullable)
  - `phone` (text, nullable)
  - `is_active` (boolean, default true)
  - `is_head_office` (boolean, default false) — marks the main branch
  - `created_at` (timestamptz, default now())
  - Unique constraint on (company_id, code)

## Modified Tables (new nullable `branch_id` column added)
- `vouchers` — branch_id (uuid, nullable, FK to branches)
- `stock_ledger` — branch_id (uuid, nullable, FK to branches)
- `warehouses` — branch_id (uuid, nullable, FK to branches)
- `items` — branch_id (uuid, nullable, FK to branches) — null means shared across branches
- `customers` — branch_id (uuid, nullable, FK to branches) — null means shared
- `vendors` — branch_id (uuid, nullable, FK to branches) — null means shared

## Indexes
- `idx_branches_company` on branches(company_id)
- `idx_vouchers_branch` on vouchers(branch_id)
- `idx_stock_ledger_branch` on stock_ledger(branch_id)

## Security (RLS)
- RLS enabled on `branches`.
- 4 CRUD policies scoped to `authenticated` users, ownership checked via `user_companies` join (user must belong to the company that owns the branch).
- Existing tables with new `branch_id` columns: no policy changes needed since RLS already checks `company_id` ownership.

## Seed Data
- Creates a "Head Office" branch for each existing company and sets `is_head_office = true`.
- Updates existing vouchers and stock_ledger rows to point to their company's Head Office branch.
*/

-- ===== Create branches table =====
CREATE TABLE IF NOT EXISTS branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  address text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  is_head_office boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (company_id, code)
);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_branches_company ON branches(company_id);

-- RLS policies for branches: user must belong to the company that owns the branch
DROP POLICY IF EXISTS "select_branches" ON branches;
CREATE POLICY "select_branches" ON branches FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_companies uc WHERE uc.company_id = branches.company_id AND uc.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_branches" ON branches;
CREATE POLICY "insert_branches" ON branches FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM user_companies uc WHERE uc.company_id = branches.company_id AND uc.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_branches" ON branches;
CREATE POLICY "update_branches" ON branches FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_companies uc WHERE uc.company_id = branches.company_id AND uc.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM user_companies uc WHERE uc.company_id = branches.company_id AND uc.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_branches" ON branches;
CREATE POLICY "delete_branches" ON branches FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM user_companies uc WHERE uc.company_id = branches.company_id AND uc.user_id = auth.uid())
  );

-- ===== Add branch_id to transactional tables =====
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE warehouses ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE items ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vouchers_branch ON vouchers(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_branch ON stock_ledger(branch_id);

-- ===== Seed: create Head Office branch for each company =====
INSERT INTO branches (company_id, code, name, is_head_office)
SELECT id, 'HO', 'Head Office', true
FROM companies
WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.company_id = companies.id AND b.is_head_office = true)
ON CONFLICT DO NOTHING;

-- ===== Backfill: tag existing vouchers with their company's Head Office branch =====
UPDATE vouchers v
SET branch_id = (SELECT id FROM branches b WHERE b.company_id = v.company_id AND b.is_head_office = true LIMIT 1)
WHERE v.branch_id IS NULL;

-- ===== Backfill: tag existing stock_ledger entries =====
UPDATE stock_ledger s
SET branch_id = (SELECT id FROM branches b WHERE b.company_id = s.company_id AND b.is_head_office = true LIMIT 1)
WHERE s.branch_id IS NULL;

-- ===== Backfill: tag existing warehouses =====
UPDATE warehouses w
SET branch_id = (SELECT id FROM branches b WHERE b.company_id = w.company_id AND b.is_head_office = true LIMIT 1)
WHERE w.branch_id IS NULL;

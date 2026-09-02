/*
# Add branch_id to gl_entries

## Overview
Adds an optional `branch_id` column to `gl_entries` so GL entries can be filtered by branch, matching the branch tagging already on vouchers.

## Modified Tables
- `gl_entries` — new `branch_id` (uuid, nullable, FK to branches ON DELETE SET NULL)

## Backfill
- Sets gl_entries.branch_id from the linked voucher's branch_id.

## Index
- `idx_gl_entries_branch` on gl_entries(branch_id)
*/

ALTER TABLE gl_entries ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gl_entries_branch ON gl_entries(branch_id);

UPDATE gl_entries g
SET branch_id = (SELECT v.branch_id FROM vouchers v WHERE v.id = g.voucher_id)
WHERE g.branch_id IS NULL;

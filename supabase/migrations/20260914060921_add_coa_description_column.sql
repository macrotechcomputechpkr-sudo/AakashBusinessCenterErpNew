/*
# Add description column to chart_of_accounts

1. Modified Tables
   - `chart_of_accounts`
     - Added `description` (text, nullable) — optional human-readable note for each account
     - Added `is_active` (boolean, default true) — allows soft-deactivating accounts without losing history

2. Security
   - No RLS policy changes — existing policies already cover the new columns.

3. Notes
   - Both columns are additive and nullable/defaulted, so existing rows are unaffected.
*/

ALTER TABLE chart_of_accounts
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

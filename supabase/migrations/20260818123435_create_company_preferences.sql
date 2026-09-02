/*
# Create company preferences

1. New Tables
- `company_preferences` stores configurable ERP behavior for each company.
- `company_id` identifies the company whose settings are being edited.
- `settings` stores the preference groups as validated JSON data.
- `updated_by` records the authenticated user who last saved the settings.
- `created_at` and `updated_at` track changes.

2. Security
- Row level security is enabled.
- Signed-in users may read, create, update, or delete settings only for companies assigned to them through `user_companies`.
- The settings table does not store passwords or external service secrets.

3. Notes
- One preference row exists per company.
- Settings are intentionally company-scoped so changing one company does not affect another.
*/

CREATE TABLE IF NOT EXISTS company_preferences (
  company_id uuid PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE company_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_company_preferences" ON company_preferences;
CREATE POLICY "users_read_company_preferences" ON company_preferences
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = company_preferences.company_id
      AND user_companies.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "users_insert_company_preferences" ON company_preferences;
CREATE POLICY "users_insert_company_preferences" ON company_preferences
  FOR INSERT TO authenticated
  WITH CHECK (
    updated_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = company_preferences.company_id
        AND user_companies.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_update_company_preferences" ON company_preferences;
CREATE POLICY "users_update_company_preferences" ON company_preferences
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = company_preferences.company_id
      AND user_companies.user_id = auth.uid()
  ))
  WITH CHECK (
    updated_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM user_companies
      WHERE user_companies.company_id = company_preferences.company_id
        AND user_companies.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_delete_company_preferences" ON company_preferences;
CREATE POLICY "users_delete_company_preferences" ON company_preferences
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_companies
    WHERE user_companies.company_id = company_preferences.company_id
      AND user_companies.user_id = auth.uid()
  ));

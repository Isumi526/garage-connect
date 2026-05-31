-- ============================================================
-- Garage Connect — Row Level Security
-- 全テーブルでテナント完全分離を強制する。
-- ============================================================

-- ------------------------------------------------------------
-- ヘルパー関数
--   auth_tenant_id() は shop_users を参照するため、shop_users 自身の
--   RLS ポリシー内から呼ぶと無限再帰する。これを避けるため
--   SECURITY DEFINER でRLSをバイパスして読む。
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM shop_users WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM shop_users WHERE id = auth.uid()
$$;

-- ------------------------------------------------------------
-- RLS 有効化（全テーブル）
-- ------------------------------------------------------------
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE corporate_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- tenants: 自テナントのみ参照 / owner・admin のみ更新
--   INSERT は handle_new_user()(SECURITY DEFINER) のみが行う = ポリシー無し
-- ------------------------------------------------------------
CREATE POLICY "tenant self - select" ON tenants
  FOR SELECT USING (id = auth_tenant_id());
CREATE POLICY "tenant self - update" ON tenants
  FOR UPDATE USING (id = auth_tenant_id() AND auth_role() IN ('owner', 'admin'))
  WITH CHECK (id = auth_tenant_id());

-- ------------------------------------------------------------
-- shop_users: 同一テナントのメンバーを参照
--   招待(INSERT)・権限変更(UPDATE)・削除(DELETE) は owner/admin のみ
--   ※ owner 行の初期 INSERT は handle_new_user()(SECURITY DEFINER) が実施
-- ------------------------------------------------------------
CREATE POLICY "shop_users - select" ON shop_users
  FOR SELECT USING (tenant_id = auth_tenant_id());
CREATE POLICY "shop_users - insert" ON shop_users
  FOR INSERT WITH CHECK (tenant_id = auth_tenant_id() AND auth_role() IN ('owner', 'admin'));
CREATE POLICY "shop_users - update" ON shop_users
  FOR UPDATE USING (tenant_id = auth_tenant_id() AND auth_role() IN ('owner', 'admin'))
  WITH CHECK (tenant_id = auth_tenant_id());
CREATE POLICY "shop_users - delete" ON shop_users
  FOR DELETE USING (tenant_id = auth_tenant_id() AND auth_role() IN ('owner', 'admin'));

-- ------------------------------------------------------------
-- 標準テナント分離テーブル: 4 操作とも tenant_id = auth_tenant_id()
--   DO ブロックで同一パターンを一括展開する。
-- ------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  standard_tables TEXT[] := ARRAY[
    'customers', 'corporate_contacts', 'line_connections', 'vehicles',
    'inspections', 'notification_templates', 'notification_logs',
    'bookings', 'documents', 'subscriptions'
  ];
BEGIN
  FOREACH t IN ARRAY standard_tables LOOP
    EXECUTE format(
      'CREATE POLICY "tenant isolation - select" ON %I FOR SELECT USING (tenant_id = auth_tenant_id())', t);
    EXECUTE format(
      'CREATE POLICY "tenant isolation - insert" ON %I FOR INSERT WITH CHECK (tenant_id = auth_tenant_id())', t);
    EXECUTE format(
      'CREATE POLICY "tenant isolation - update" ON %I FOR UPDATE USING (tenant_id = auth_tenant_id()) WITH CHECK (tenant_id = auth_tenant_id())', t);
    EXECUTE format(
      'CREATE POLICY "tenant isolation - delete" ON %I FOR DELETE USING (tenant_id = auth_tenant_id())', t);
  END LOOP;
END;
$$;

-- ============================================================
-- Garage Connect — 初期スキーマ
-- マルチテナント (Shared DB / Shared Schema + RLS)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. テナント
-- ============================================
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  business_type TEXT,
  line_channel_id TEXT,
  line_channel_secret_encrypted TEXT,
  line_channel_access_token_encrypted TEXT,
  liff_id TEXT,
  logo_url TEXT,
  brand_color TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 2. 店舗ユーザー（Supabase Auth と連携）
-- ============================================
CREATE TABLE shop_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff', -- 'owner' | 'admin' | 'staff'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shop_users_tenant ON shop_users(tenant_id);

-- ============================================
-- 3. 顧客
-- ============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_type TEXT NOT NULL DEFAULT 'individual', -- 'individual' | 'corporate'
  name TEXT NOT NULL,
  name_kana TEXT,
  postal_code TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  birthday DATE,
  corporate_name TEXT,
  representative_name TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_phone ON customers(tenant_id, phone);

-- ============================================
-- 4. 法人連絡先
-- ============================================
CREATE TABLE corporate_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'manager' | 'accounting' | 'driver'
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  line_user_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_corporate_contacts_customer ON corporate_contacts(customer_id);

-- ============================================
-- 5. LINE 連携
-- ============================================
CREATE TABLE line_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  line_user_id TEXT NOT NULL,
  display_name TEXT,
  picture_url TEXT,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, line_user_id)
);
CREATE INDEX idx_line_connections_customer ON line_connections(customer_id);

-- ============================================
-- 6. 車両
-- ============================================
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_number TEXT,
  vin TEXT,
  vehicle_name TEXT,
  model_code TEXT,
  first_registration_date DATE,
  registration_date DATE,
  inspection_expiry_date DATE,
  liability_insurance_expiry_date DATE,
  voluntary_insurance_expiry_date DATE,
  voluntary_insurance_company TEXT,
  body_shape TEXT,
  vehicle_weight INTEGER,
  total_weight INTEGER,
  capacity INTEGER,
  displacement INTEGER,
  fuel_type TEXT,
  current_mileage INTEGER,
  last_mileage_recorded_at DATE,
  inspection_certificate_image_path TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vehicles_tenant ON vehicles(tenant_id);
CREATE INDEX idx_vehicles_customer ON vehicles(customer_id);
CREATE INDEX idx_vehicles_expiry ON vehicles(tenant_id, inspection_expiry_date)
  WHERE status = 'active';

-- ============================================
-- 7. 整備履歴
-- ============================================
CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  inspection_type TEXT NOT NULL,
  performed_at DATE NOT NULL,
  next_due_date DATE,
  mileage INTEGER,
  amount INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inspections_vehicle ON inspections(vehicle_id);

-- ============================================
-- 8. 通知テンプレ
-- ============================================
CREATE TABLE notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'line',
  title TEXT,
  body TEXT NOT NULL,
  flex_message_json JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, trigger_type, channel)
);

-- ============================================
-- 9. 通知配信ログ
-- ============================================
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,
  channel TEXT NOT NULL,
  recipient TEXT,
  status TEXT NOT NULL,
  error_message TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ
);
CREATE INDEX idx_notification_logs_tenant ON notification_logs(tenant_id, sent_at DESC);
CREATE INDEX idx_notification_logs_vehicle ON notification_logs(vehicle_id);

-- ============================================
-- 10. 予約
-- ============================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  booking_type TEXT NOT NULL,
  preferred_date DATE NOT NULL,
  preferred_time_slot TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_tenant ON bookings(tenant_id, preferred_date);

-- ============================================
-- 11. 書類
-- ============================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  uploaded_by UUID REFERENCES shop_users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_customer ON documents(customer_id);

-- ============================================
-- 12. サブスクリプション
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- updated_at 自動更新
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_shop_users_updated_at BEFORE UPDATE ON shop_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

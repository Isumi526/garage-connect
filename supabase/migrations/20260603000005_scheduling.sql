-- ============================================================
-- スケジュール管理：営業時間・定休日・スケジュールイベント・予約枠設定
-- ============================================================

-- 予約枠設定（テナント共通）
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slot_minutes INT NOT NULL DEFAULT 30;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slot_capacity INT NOT NULL DEFAULT 1;

-- 営業時間（曜日別・定休日含む）。weekday: 0=日 .. 6=土
CREATE TABLE business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  open_time TIME NOT NULL DEFAULT '09:00',
  close_time TIME NOT NULL DEFAULT '18:00',
  is_closed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, weekday)
);
CREATE INDEX idx_business_hours_tenant ON business_hours(tenant_id);

-- スケジュールイベント（臨時休業 / 臨時営業 / その他の用事）
CREATE TABLE schedule_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL DEFAULT 'other', -- 'closure' | 'open' | 'other'
  title TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_schedule_events_tenant ON schedule_events(tenant_id, start_at);

-- updated_at
CREATE TRIGGER update_business_hours_updated_at BEFORE UPDATE ON business_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_events_updated_at BEFORE UPDATE ON schedule_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_events ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['business_hours', 'schedule_events'] LOOP
    EXECUTE format('CREATE POLICY "tenant isolation - select" ON %I FOR SELECT USING (tenant_id = auth_tenant_id())', t);
    EXECUTE format('CREATE POLICY "tenant isolation - insert" ON %I FOR INSERT WITH CHECK (tenant_id = auth_tenant_id())', t);
    EXECUTE format('CREATE POLICY "tenant isolation - update" ON %I FOR UPDATE USING (tenant_id = auth_tenant_id()) WITH CHECK (tenant_id = auth_tenant_id())', t);
    EXECUTE format('CREATE POLICY "tenant isolation - delete" ON %I FOR DELETE USING (tenant_id = auth_tenant_id())', t);
  END LOOP;
END $$;

-- テナント作成時に既定の営業時間を生成（月〜土 09:00-18:00、日曜定休）
CREATE OR REPLACE FUNCTION public.seed_business_hours()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO business_hours (tenant_id, weekday, open_time, close_time, is_closed)
  SELECT NEW.id, wd, '09:00', '18:00', (wd = 0)
  FROM generate_series(0, 6) AS wd;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_tenant_created_seed_hours
  AFTER INSERT ON tenants
  FOR EACH ROW EXECUTE FUNCTION public.seed_business_hours();

-- 既存テナントにも既定の営業時間をバックフィル
INSERT INTO business_hours (tenant_id, weekday, open_time, close_time, is_closed)
SELECT t.id, wd, '09:00', '18:00', (wd = 0)
FROM tenants t CROSS JOIN generate_series(0, 6) AS wd
ON CONFLICT (tenant_id, weekday) DO NOTHING;

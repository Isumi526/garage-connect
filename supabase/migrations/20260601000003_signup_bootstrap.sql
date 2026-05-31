-- ============================================================
-- Garage Connect — サインアップ時のテナント自動作成
-- auth.users への INSERT を契機に SECURITY DEFINER 関数で
-- テナント・オーナーユーザー・既定テンプレ・トライアル課金を作成する。
-- 招待された場合は新規テナントを作らず既存テナントに参加させる。
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_invited_tenant TEXT;
  v_base_slug TEXT;
  v_slug TEXT;
  v_suffix INT := 0;
  v_name TEXT;
  v_display TEXT;
BEGIN
  v_invited_tenant := NULLIF(NEW.raw_user_meta_data ->> 'invited_tenant_id', '');
  v_display := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'display_name', ''),
    split_part(NEW.email, '@', 1)
  );

  -- --- 招待フロー: 新規テナントは作らず、指定テナントに参加 ---
  IF v_invited_tenant IS NOT NULL THEN
    INSERT INTO public.shop_users (id, tenant_id, email, display_name, role)
    VALUES (
      NEW.id,
      v_invited_tenant::uuid,
      NEW.email,
      v_display,
      COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'invited_role', ''), 'staff')
    );
    RETURN NEW;
  END IF;

  -- --- 通常フロー: 新規テナントを作成しオーナーとして登録 ---
  v_name := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'tenant_name', ''), 'My Garage');

  v_base_slug := COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'slug', ''), 'garage');
  v_base_slug := lower(regexp_replace(v_base_slug, '[^a-zA-Z0-9-]', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  IF v_base_slug = '' THEN
    v_base_slug := 'garage';
  END IF;

  v_slug := v_base_slug;
  WHILE EXISTS (SELECT 1 FROM public.tenants WHERE slug = v_slug) LOOP
    v_suffix := v_suffix + 1;
    v_slug := v_base_slug || '-' || v_suffix;
  END LOOP;

  INSERT INTO public.tenants (name, slug, status, trial_ends_at)
  VALUES (v_name, v_slug, 'active', now() + interval '30 days')
  RETURNING id INTO v_tenant_id;

  INSERT INTO public.shop_users (id, tenant_id, email, display_name, role)
  VALUES (NEW.id, v_tenant_id, NEW.email, v_display, 'owner');

  INSERT INTO public.subscriptions (tenant_id, plan, status, current_period_start, current_period_end)
  VALUES (v_tenant_id, 'free_trial', 'trialing', now(), now() + interval '30 days');

  INSERT INTO public.notification_templates (tenant_id, trigger_type, channel, title, body)
  VALUES
    (v_tenant_id, 'inspection_expiry', 'line', '車検満了のお知らせ',
     E'{{customer_name}} 様\n\nいつもご利用ありがとうございます。\nお車（{{vehicle_name}}）の車検が {{expiry_date}} に満了します。\nお早めのご予約をおすすめします。'),
    (v_tenant_id, 'inspection_12month', 'line', '12ヶ月点検のお知らせ',
     E'{{customer_name}} 様\n\nお車（{{vehicle_name}}）の法定12ヶ月点検の時期が近づいています。\nご予約をお待ちしております。'),
    (v_tenant_id, 'liability_insurance_expiry', 'line', '自賠責保険満了のお知らせ',
     E'{{customer_name}} 様\n\nお車（{{vehicle_name}}）の自賠責保険が {{expiry_date}} に満了します。\n継続のお手続きについてご連絡ください。');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';
import { redirect } from 'next/navigation';

type ShopUser = Database['public']['Tables']['shop_users']['Row'];
type Tenant = Database['public']['Tables']['tenants']['Row'];

export type AuthContext = {
  userId: string;
  email: string;
  shopUser: ShopUser;
  tenant: Tenant;
};

/**
 * 現在ログイン中のユーザー・所属テナントを取得する。
 * 未ログイン、またはテナント未割当ての場合は /login へリダイレクトする。
 * Server Component / Server Action から呼ぶこと。
 */
export async function requireAuth(): Promise<AuthContext> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // RLS により自テナントの行のみ返る
  const { data: shopUser } = await supabase
    .from('shop_users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!shopUser) {
    // Auth ユーザーは居るが shop_users 未作成（異常系）
    redirect('/login');
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', shopUser.tenant_id)
    .single();

  if (!tenant) {
    redirect('/login');
  }

  return {
    userId: user.id,
    email: user.email ?? shopUser.email,
    shopUser,
    tenant,
  };
}

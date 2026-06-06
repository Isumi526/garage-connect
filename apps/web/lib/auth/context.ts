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

  // shop_users と tenants を 1 クエリ（join）で取得し、DB 往復を 2→1 に削減。
  // RLS により自テナントの行のみ返る。
  const { data: row } = await supabase
    .from('shop_users')
    .select('*, tenant:tenants(*)')
    .eq('id', user.id)
    .single();

  const tenant = (Array.isArray(row?.tenant) ? row?.tenant[0] : row?.tenant) as Tenant | undefined;
  if (!row || !tenant) {
    // Auth ユーザーは居るが shop_users 未作成 or テナント無し（異常系）
    redirect('/login');
  }

  const { tenant: _omit, ...shopUser } = row;
  return {
    userId: user.id,
    email: user.email ?? shopUser.email,
    shopUser: shopUser as ShopUser,
    tenant,
  };
}

import type { Database } from '@/types/database.types';
import { createBrowserClient } from '@supabase/ssr';

/** ブラウザ(Client Component)用 Supabase クライアント。Anon Key + RLS で動作。 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  );
}

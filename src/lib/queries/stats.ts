import { supabase } from '@/lib/supabase';
import type { UserStats } from '@/lib/types';

// Aggregates over every registered user, which `profiles` RLS blocks reading
// row by row — `app_user_stats()` is a SECURITY DEFINER function that returns
// counts only (see supabase/schema.sql).
export async function getUserStats(): Promise<UserStats> {
  const { data, error } = await supabase.rpc('app_user_stats').single<UserStats>();

  if (error) throw error;
  return data;
}

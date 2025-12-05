import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../constants';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn("Supabase credentials missing. Persistence will be disabled.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
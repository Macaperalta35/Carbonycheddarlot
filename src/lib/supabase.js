import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isConfigured = !!(
  SUPABASE_URL  && !SUPABASE_URL.includes('TU_PROJECT_ID') &&
  SUPABASE_KEY  && !SUPABASE_KEY.includes('TU_ANON_KEY')
);

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

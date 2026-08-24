import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Isso aparece no console do navegador se o .env não estiver preenchido.
  console.error(
    'Faltam VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY no seu arquivo .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

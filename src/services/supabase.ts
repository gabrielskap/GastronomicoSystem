import { createClient } from '@supabase/supabase-js';

// No Vite, variáveis públicas precisam ser prefixadas com VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// O banco agora é obrigatório (não há mais fallback mockado).
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.error(
    'Supabase: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são obrigatórios. ' +
      'Configure o arquivo .env para conectar ao banco de dados.'
  );
}

// Cliente único do Supabase, com persistência de sessão do Auth habilitada.
export const supabase = createClient(
  supabaseUrl || 'http://localhost',
  supabaseAnonKey || 'anon',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'gastronomico_auth',
    },
  }
);

/**
 * Valida se uma string é um UUID (padrão do PostgreSQL/Supabase).
 */
export function isValidUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

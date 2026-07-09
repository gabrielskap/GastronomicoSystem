import { createClient } from '@supabase/supabase-js';

// No Vite, variáveis públicas precisam ser prefixadas com VITE_
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isPlaceholder = (val: string) => {
  if (!val) return true;
  const v = val.toLowerCase().trim();
  return (
    v === '' ||
    v.includes('placeholder') ||
    v.includes('your_') ||
    v.includes('your-') ||
    v.includes('sua_') ||
    v.includes('chave_')
  );
};

// Verifica se o Supabase está propriamente configurado e não usa chaves genéricas/placeholders
export const isSupabaseConfigured = !!(
  supabaseUrl &&
  supabaseAnonKey &&
  !isPlaceholder(supabaseUrl) &&
  !isPlaceholder(supabaseAnonKey)
);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase: Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas ou são placeholders. O aplicativo usará os dados mockados como fallback.'
  );
}

// Cria o cliente Supabase. Caso não existam as chaves, usamos placeholders seguros para evitar travamento na inicialização
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project-url.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key'
);

/**
 * Valida se uma string é um UUID válido no formato v4 (padrão do PostgreSQL/Supabase)
 */
export function isValidUuid(id: string | null | undefined): boolean {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}


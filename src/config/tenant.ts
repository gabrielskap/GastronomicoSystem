/**
 * Resolução de "tenant" (marca/unidade) do sistema multi-unidade.
 *
 * - Equipe (logada): a unidade vem do perfil em Gastronomico_usuarios
 *   (ver AuthContext) — não passa por aqui.
 * - Cliente (anônimo na mesa): a unidade é resolvida pelo slug na URL
 *   (?unidade=<slug>) e a mesa pelo número (?mesa=<numero> ou ?table=).
 */
import { supabase } from '../services/supabase';
import { TB } from '../services/api/tables';
import { DbUnidade, DbRestaurante, DbMesa } from '../services/api/types';

export interface UnidadeTenant {
  unidadeId: string;
  unidadeNome: string;
  unidadeSlug: string;
  restauranteId: string;
  corTema: string;
  taxaServicoPadrao: number;
}

/** Lê o slug da unidade da URL, com fallback opcional em VITE_DEFAULT_UNIDADE_SLUG. */
export function getUnidadeSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('unidade') || params.get('unit');
  if (slug) return slug;
  const envSlug = import.meta.env.VITE_DEFAULT_UNIDADE_SLUG as string | undefined;
  return envSlug || null;
}

/** Lê o número da mesa da URL, normalizando para 2 dígitos quando numérico. */
export function getTableNumberFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('mesa') || params.get('table');
  if (!raw) return null;
  const n = parseInt(raw, 10);
  if (!isNaN(n) && n > 0) return String(n).padStart(2, '0');
  return raw;
}

/** Resolve a unidade (e a marca) a partir de um slug. */
export async function resolveUnidadeBySlug(slug: string): Promise<UnidadeTenant | null> {
  const { data: unidade, error } = await supabase
    .from(TB.unidades)
    .select('*')
    .eq('slug', slug)
    .eq('ativa', true)
    .maybeSingle<DbUnidade>();

  if (error || !unidade) {
    if (error) console.error('Tenant: erro ao resolver unidade por slug:', error);
    return null;
  }

  const { data: restaurante } = await supabase
    .from(TB.restaurantes)
    .select('*')
    .eq('id', unidade.restaurante_id)
    .maybeSingle<DbRestaurante>();

  return {
    unidadeId: unidade.id,
    unidadeNome: unidade.nome,
    unidadeSlug: unidade.slug,
    restauranteId: unidade.restaurante_id,
    corTema: restaurante?.cor_tema || 'red',
    taxaServicoPadrao: Number(restaurante?.taxa_servico_padrao ?? 10),
  };
}

/** Carrega os dados de tenant a partir do id da unidade (para a equipe logada). */
export async function resolveUnidadeById(unidadeId: string): Promise<UnidadeTenant | null> {
  const { data: unidade, error } = await supabase
    .from(TB.unidades)
    .select('*')
    .eq('id', unidadeId)
    .maybeSingle<DbUnidade>();

  if (error || !unidade) return null;

  const { data: restaurante } = await supabase
    .from(TB.restaurantes)
    .select('*')
    .eq('id', unidade.restaurante_id)
    .maybeSingle<DbRestaurante>();

  return {
    unidadeId: unidade.id,
    unidadeNome: unidade.nome,
    unidadeSlug: unidade.slug,
    restauranteId: unidade.restaurante_id,
    corTema: restaurante?.cor_tema || 'red',
    taxaServicoPadrao: Number(restaurante?.taxa_servico_padrao ?? 10),
  };
}

/** Busca uma mesa pelo número dentro de uma unidade. */
export async function resolveMesaByNumero(
  unidadeId: string,
  numero: string
): Promise<DbMesa | null> {
  const { data, error } = await supabase
    .from(TB.mesas)
    .select('*')
    .eq('unidade_id', unidadeId)
    .eq('numero', numero)
    .maybeSingle<DbMesa>();
  if (error) {
    console.error('Tenant: erro ao resolver mesa por número:', error);
    return null;
  }
  return data;
}

import { supabase } from '../supabase';
import { TB } from './tables';
import { DbMesa, MesaStatusDb } from './types';

/**
 * Busca todas as mesas de uma unidade.
 */
export async function fetchMesas(unidadeId: string): Promise<DbMesa[]> {
  if (!unidadeId) return [];
  const { data, error } = await supabase
    .from(TB.mesas)
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('numero');
  if (error) {
    console.error('Supabase: erro ao buscar mesas:', error);
    return [];
  }
  return (data || []) as DbMesa[];
}

/**
 * Cria uma nova mesa na unidade.
 */
export async function createMesa(
  unidadeId: string,
  numero: string,
  capacidade: number
): Promise<DbMesa | null> {
  const { data, error } = await supabase
    .from(TB.mesas)
    .insert({ unidade_id: unidadeId, numero, capacidade })
    .select()
    .single();
  if (error) {
    console.error('Supabase: erro ao criar mesa:', error);
    return null;
  }
  return data as DbMesa;
}

/**
 * Atualiza campos de uma mesa (capacidade, pessoas, número, ativa, status).
 */
export async function updateMesa(
  mesaId: string,
  updates: Partial<Pick<DbMesa, 'capacidade' | 'quantidade_pessoas' | 'numero' | 'ativa' | 'status'>>
): Promise<boolean> {
  const { error } = await supabase.from(TB.mesas).update(updates).eq('id', mesaId);
  if (error) {
    console.error('Supabase: erro ao atualizar mesa:', error);
    return false;
  }
  return true;
}

/**
 * Atualiza o status (e opcionalmente a lotação) de uma mesa.
 */
export async function updateMesaStatus(
  mesaId: string,
  status: MesaStatusDb,
  quantidadePessoas?: number
): Promise<boolean> {
  const updates: Partial<DbMesa> = { status };
  if (quantidadePessoas !== undefined) updates.quantidade_pessoas = quantidadePessoas;
  return updateMesa(mesaId, updates);
}

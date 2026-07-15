import { supabase, isValidUuid } from '../supabase';
import { TB } from './tables';
import { DbComanda, DbComandaParticipante, ComandaStatus } from './types';

/**
 * Busca comandas de uma unidade por status (e opcionalmente por mesa).
 */
export async function fetchComandas(
  unidadeId: string,
  opts: { mesaId?: string; status?: ComandaStatus } = {}
): Promise<DbComanda[]> {
  if (!unidadeId) return [];
  const status = opts.status ?? 'active';
  let query = supabase.from(TB.comandas).select('*').eq('unidade_id', unidadeId).eq('status', status);
  if (opts.mesaId) query = query.eq('mesa_id', opts.mesaId);
  const { data, error } = await query.order('aberta_em', { ascending: false });
  if (error) {
    console.error('Supabase: erro ao buscar comandas:', error);
    return [];
  }
  return (data || []) as DbComanda[];
}

/**
 * Busca a comanda ativa de uma mesa (se houver).
 */
export async function fetchActiveTableComanda(
  unidadeId: string,
  mesaId: string
): Promise<DbComanda | null> {
  if (!unidadeId || !mesaId) return null;
  const comandas = await fetchComandas(unidadeId, { mesaId, status: 'active' });
  return comandas.length > 0 ? comandas[0] : null;
}

/**
 * Abre uma nova comanda para uma mesa e adiciona o autor como participante.
 */
export async function createComanda(
  unidadeId: string,
  mesaId: string,
  nomeCliente?: string
): Promise<DbComanda | null> {
  const finalName = nomeCliente || 'Cliente';
  const { data, error } = await supabase
    .from(TB.comandas)
    .insert({
      unidade_id: unidadeId,
      mesa_id: mesaId,
      nome_cliente: finalName,
      status: 'active',
      aberta_em: new Date().toISOString(),
      valor_total: 0,
    })
    .select()
    .single();

  if (error || !data) {
    console.error('Supabase: erro ao abrir comanda:', error);
    return null;
  }

  await addParticipantToComanda(data.id, finalName);
  return data as DbComanda;
}

/**
 * Lista os participantes de uma comanda.
 */
export async function fetchTabParticipants(comandaId: string): Promise<DbComandaParticipante[]> {
  if (!isValidUuid(comandaId)) return [];
  const { data, error } = await supabase
    .from(TB.participantes)
    .select('*')
    .eq('comanda_id', comandaId)
    .order('entrou_em', { ascending: true });
  if (error) {
    console.error('Supabase: erro ao buscar participantes:', error);
    return [];
  }
  return (data || []) as DbComandaParticipante[];
}

/**
 * Adiciona um participante à comanda (evitando duplicados).
 */
export async function addParticipantToComanda(
  comandaId: string,
  nome: string
): Promise<DbComandaParticipante | null> {
  const trimmed = nome.trim();
  if (!trimmed || !isValidUuid(comandaId)) return null;

  const { data: existing } = await supabase
    .from(TB.participantes)
    .select('*')
    .eq('comanda_id', comandaId)
    .eq('nome', trimmed)
    .maybeSingle();
  if (existing) return existing as DbComandaParticipante;

  const { data, error } = await supabase
    .from(TB.participantes)
    .insert({ comanda_id: comandaId, nome: trimmed })
    .select()
    .single();
  if (error) {
    console.error('Supabase: erro ao adicionar participante:', error);
    return null;
  }
  return data as DbComandaParticipante;
}

/**
 * Remove um participante da comanda.
 */
export async function removeParticipantFromComanda(comandaId: string, nome: string): Promise<boolean> {
  if (!isValidUuid(comandaId)) return false;
  const { error } = await supabase
    .from(TB.participantes)
    .delete()
    .eq('comanda_id', comandaId)
    .eq('nome', nome);
  if (error) {
    console.error('Supabase: erro ao remover participante:', error);
    return false;
  }
  return true;
}

/**
 * Atualiza o total acumulado de uma comanda.
 */
export async function updateComandaTotal(comandaId: string, novoTotal: number): Promise<boolean> {
  if (!isValidUuid(comandaId)) return false;
  const { error } = await supabase
    .from(TB.comandas)
    .update({ valor_total: novoTotal })
    .eq('id', comandaId);
  if (error) {
    console.error('Supabase: erro ao atualizar total da comanda:', error);
    return false;
  }
  return true;
}

/**
 * Fecha a comanda como paga.
 */
export async function fecharComandaPaga(comandaId: string): Promise<boolean> {
  if (!isValidUuid(comandaId)) return false;
  const { error } = await supabase
    .from(TB.comandas)
    .update({ status: 'paid', fechada_em: new Date().toISOString() })
    .eq('id', comandaId);
  if (error) {
    console.error('Supabase: erro ao fechar comanda:', error);
    return false;
  }
  return true;
}

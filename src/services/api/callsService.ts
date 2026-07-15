import { supabase, isValidUuid } from '../supabase';
import { TB } from './tables';
import { DbChamado, ChamadoMotivo, ChamadoStatus } from './types';

/**
 * Busca chamados de garçom de uma unidade (opcionalmente por status).
 */
export async function fetchCalls(unidadeId: string, status?: ChamadoStatus): Promise<DbChamado[]> {
  if (!unidadeId) return [];
  let query = supabase.from(TB.chamados).select('*').eq('unidade_id', unidadeId);
  if (status) query = query.eq('status', status);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    console.error('Supabase: erro ao buscar chamados:', error);
    return [];
  }
  return (data || []) as DbChamado[];
}

/**
 * Registra um novo chamado de garçom.
 */
export async function createCall(
  unidadeId: string,
  mesaId: string,
  motivo: ChamadoMotivo,
  notaPersonalizada?: string
): Promise<DbChamado | null> {
  const { data, error } = await supabase
    .from(TB.chamados)
    .insert({
      unidade_id: unidadeId,
      mesa_id: mesaId,
      motivo,
      nota_personalizada: notaPersonalizada ?? null,
      status: 'pending',
    })
    .select()
    .single();
  if (error) {
    console.error('Supabase: erro ao criar chamado:', error);
    return null;
  }
  return data as DbChamado;
}

/**
 * Resolve um chamado de garçom.
 */
export async function resolveCall(callId: string): Promise<boolean> {
  if (!isValidUuid(callId)) return false;
  const { error } = await supabase.from(TB.chamados).update({ status: 'resolved' }).eq('id', callId);
  if (error) {
    console.error('Supabase: erro ao resolver chamado:', error);
    return false;
  }
  return true;
}

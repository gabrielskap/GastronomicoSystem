import { supabase, isSupabaseConfigured, isValidUuid } from '../supabase';
import { DbWaiterCall } from './types';

const mockCalls: DbWaiterCall[] = [
  {
    id: 'CALL-1',
    restaurant_id: '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01',
    table_id: '09',
    reason: 'payment',
    custom_note: 'Deseja pagar com Pix, trazer maquininha.',
    status: 'pending',
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString()
  },
  {
    id: 'CALL-2',
    restaurant_id: '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01',
    table_id: '05',
    reason: 'utensils',
    custom_note: 'Falta um garfo e prato adicional.',
    status: 'pending',
    created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString()
  }
];

/**
 * Busca todos os chamados de garçom em andamento ou todos.
 * @param status Filtro opcional de status do chamado.
 * @returns Lista de chamados de garçom.
 */
export async function fetchCalls(status?: DbWaiterCall['status']): Promise<DbWaiterCall[]> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('waiter_calls').select('*');
      if (status) {
        query = query.eq('status', status);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      if (data) return data as DbWaiterCall[];
    } catch (err) {
      console.warn('Supabase: Erro ao buscar chamados, utilizando fallback:', err);
    }
  }

  if (status) {
    return mockCalls.filter((c) => c.status === status);
  }
  return mockCalls;
}

/**
 * Registra um novo chamado de garçom para uma mesa.
 */
export async function createCall(tableId: string, reason: DbWaiterCall['reason'], customNote?: string): Promise<DbWaiterCall> {
  const newCall: DbWaiterCall = {
    id: `CALL-${Math.floor(Math.random() * 900) + 100}`,
    restaurant_id: '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01',
    table_id: tableId,
    reason,
    custom_note: customNote || undefined,
    status: 'pending',
    created_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && isValidUuid(tableId)) {
    try {
      const { data, error } = await supabase
        .from('waiter_calls')
        .insert({
          restaurant_id: newCall.restaurant_id,
          table_id: newCall.table_id,
          reason: newCall.reason,
          custom_note: newCall.custom_note,
          status: newCall.status
        })
        .select()
        .single();
      if (error) throw error;
      if (data) return data as DbWaiterCall;
    } catch (err) {
      console.warn('Supabase: Erro ao criar chamado de atendimento:', err);
    }
  }

  return newCall;
}

/**
 * Resolve ou cancela um chamado de garçom.
 */
export async function resolveCall(callId: string): Promise<boolean> {
  if (isSupabaseConfigured && isValidUuid(callId)) {
    try {
      const { error } = await supabase
        .from('waiter_calls')
        .update({ status: 'resolved' })
        .eq('id', callId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn(`Supabase: Erro ao resolver chamado ${callId}:`, err);
    }
  }
  return true;
}

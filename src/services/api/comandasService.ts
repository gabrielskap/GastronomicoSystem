import { supabase, isSupabaseConfigured, isValidUuid } from '../supabase';
import { DbComanda, DbTabParticipant } from './types';

// Banco de dados em memória para quando o Supabase não estiver configurado
let mockComandasDb: DbComanda[] = [
  {
    id: 'comanda-02',
    restaurant_id: '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01',
    table_id: '02',
    customer_name: 'Gabriel e Família',
    status: 'active',
    opened_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    total_amount: 136.00,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: 'comanda-05',
    restaurant_id: '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01',
    table_id: '05',
    customer_name: 'Mesa de Casal 5',
    status: 'active',
    opened_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    total_amount: 0.00,
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString()
  },
  {
    id: 'comanda-09',
    restaurant_id: '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01',
    table_id: '09',
    customer_name: 'Comanda Coletiva 09',
    status: 'active',
    opened_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    total_amount: 326.50,
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  }
];

let mockTabParticipantsDb: DbTabParticipant[] = [
  {
    id: 'part-1',
    comanda_id: 'comanda-02',
    name: 'Gabriel Gustavo',
    joined_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: 'part-2',
    comanda_id: 'comanda-02',
    name: 'Carlos Santos',
    joined_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString()
  },
  {
    id: 'part-3',
    comanda_id: 'comanda-05',
    name: 'Mesa de Casal 5',
    joined_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString()
  },
  {
    id: 'part-4',
    comanda_id: 'comanda-09',
    name: 'Carlos',
    joined_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
  },
  {
    id: 'part-5',
    comanda_id: 'comanda-09',
    name: 'Mariana Lima',
    joined_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 55 * 60 * 1000).toISOString()
  }
];

/**
 * Busca comandas dependendo do status e mesa.
 */
export async function fetchComandas(tableId?: string, status: 'active' | 'closed' | 'paid' = 'active'): Promise<DbComanda[]> {
  if (isSupabaseConfigured) {
    try {
      if (tableId && !isValidUuid(tableId)) {
        return mockComandasDb.filter((c) => c.table_id === tableId && c.status === status);
      }
      let query = supabase.from('comandas').select('*').eq('status', status);
      if (tableId) {
        query = query.eq('table_id', tableId);
      }
      const { data, error } = await query.order('opened_at', { ascending: false });
      if (error) throw error;
      if (data) {
        return data as DbComanda[];
      }
    } catch (err) {
      console.warn('Supabase: Erro ao buscar comandas, utilizando fallback:', err);
    }
  }

  if (tableId) {
    return mockComandasDb.filter((c) => c.table_id === tableId && c.status === status);
  }
  return mockComandasDb.filter((c) => c.status === status);
}

/**
 * Busca uma comanda ativa específica para uma mesa.
 */
export async function fetchActiveTableComanda(tableId: string): Promise<DbComanda | null> {
  const comandas = await fetchComandas(tableId, 'active');
  return comandas.length > 0 ? comandas[0] : null;
}

/**
 * Cria uma nova comanda para uma mesa
 */
export async function createComanda(tableId: string, customerName?: string): Promise<DbComanda> {
  const restaurant_id = '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01';
  const finalName = customerName || `Cliente da Mesa ${tableId}`;

  if (isSupabaseConfigured && isValidUuid(tableId)) {
    try {
      const { data, error } = await supabase
        .from('comandas')
        .insert({
          restaurant_id,
          table_id: tableId,
          customer_name: finalName,
          status: 'active',
          opened_at: new Date().toISOString(),
          total_amount: 0
        })
        .select()
        .single();
      
      if (error) throw error;
      if (data) {
        // Inicializa o primeiro participante automaticamente no Supabase
        await addParticipantToComanda(data.id, finalName);
        return data as DbComanda;
      }
    } catch (err) {
      console.warn('Supabase: Erro ao abrir comanda, usando mock:', err);
    }
  }

  const newComanda: DbComanda = {
    id: `comanda-${Math.random().toString(36).substring(2, 9)}`,
    restaurant_id,
    table_id: tableId,
    customer_name: finalName,
    status: 'active',
    opened_at: new Date().toISOString(),
    total_amount: 0,
    created_at: new Date().toISOString()
  };

  mockComandasDb.push(newComanda);
  
  // Adiciona o autor da comanda ao banco local de participantes
  mockTabParticipantsDb.push({
    id: `part-${Math.random().toString(36).substring(2, 9)}`,
    comanda_id: newComanda.id,
    name: finalName,
    joined_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  });

  return newComanda;
}

/**
 * Busca participantes associados a uma comanda específica.
 */
export async function fetchTabParticipants(comandaId: string): Promise<DbTabParticipant[]> {
  if (isSupabaseConfigured && isValidUuid(comandaId)) {
    try {
      const { data, error } = await supabase
        .from('tab_participants')
        .select('*')
        .eq('comanda_id', comandaId)
        .order('joined_at', { ascending: true });
      if (error) throw error;
      if (data) return data as DbTabParticipant[];
    } catch (err) {
      console.warn(`Supabase: Erro ao buscar participantes da comanda ${comandaId}:`, err);
    }
  }

  return mockTabParticipantsDb.filter(p => p.comanda_id === comandaId);
}

/**
 * Adiciona um participante a uma comanda ativa.
 */
export async function addParticipantToComanda(comandaId: string, name: string): Promise<DbTabParticipant | null> {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  if (isSupabaseConfigured && isValidUuid(comandaId)) {
    try {
      // Verifica se o participante já está inserido (para evitar violações de chave única)
      const { data: existing } = await supabase
        .from('tab_participants')
        .select('*')
        .eq('comanda_id', comandaId)
        .eq('name', trimmedName)
        .maybeSingle();

      if (existing) {
        return existing as DbTabParticipant;
      }

      const { data, error } = await supabase
        .from('tab_participants')
        .insert({
          comanda_id: comandaId,
          name: trimmedName
        })
        .select()
        .single();
      
      if (error) throw error;
      if (data) return data as DbTabParticipant;
    } catch (err) {
      console.warn(`Supabase: Erro ao adicionar participante ${trimmedName} à comanda ${comandaId}:`, err);
    }
  }

  // Fallback em memória
  const exists = mockTabParticipantsDb.some(p => p.comanda_id === comandaId && p.name.toLowerCase() === trimmedName.toLowerCase());
  if (exists) {
    return mockTabParticipantsDb.find(p => p.comanda_id === comandaId && p.name.toLowerCase() === trimmedName.toLowerCase()) || null;
  }

  const newParticipant: DbTabParticipant = {
    id: `part-${Math.random().toString(36).substring(2, 9)}`,
    comanda_id: comandaId,
    name: trimmedName,
    joined_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  mockTabParticipantsDb.push(newParticipant);
  return newParticipant;
}

/**
 * Remove um participante de uma comanda ativa.
 */
export async function removeParticipantFromComanda(comandaId: string, name: string): Promise<boolean> {
  if (isSupabaseConfigured && isValidUuid(comandaId)) {
    try {
      const { error } = await supabase
        .from('tab_participants')
        .delete()
        .eq('comanda_id', comandaId)
        .eq('name', name);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn(`Supabase: Erro ao remover participante ${name} da comanda ${comandaId}:`, err);
    }
  }

  mockTabParticipantsDb = mockTabParticipantsDb.filter(p => !(p.comanda_id === comandaId && p.name === name));
  return true;
}

/**
 * Atualiza o valor acumulado (total) de uma comanda específica.
 */
export async function updateComandaTotal(comandaId: string, newTotal: number): Promise<boolean> {
  if (isSupabaseConfigured && isValidUuid(comandaId)) {
    try {
      const { error } = await supabase
        .from('comandas')
        .update({ total_amount: newTotal })
        .eq('id', comandaId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn(`Supabase: Erro ao atualizar total da comanda ${comandaId}:`, err);
    }
  }

  mockComandasDb = mockComandasDb.map(c => c.id === comandaId ? { ...c, total_amount: newTotal } : c);
  return true;
}

import { supabase, isSupabaseConfigured, isValidUuid } from '../supabase';
import { DbTable } from './types';

/**
 * Busca a configuração de todas as mesas no restaurante.
 * @returns Lista de mesas seguindo a estrutura do banco de dados.
 */
export async function fetchTables(restaurantId?: string): Promise<DbTable[]> {
  if (isSupabaseConfigured) {
    try {
      if (restaurantId && !isValidUuid(restaurantId)) {
        throw new Error('restaurantId is not a valid UUID');
      }
      let query = supabase.from('tables').select('*');
      if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
      }
      const { data, error } = await query.order('number');
      if (error) throw error;
      if (data) {
        return data as DbTable[];
      }
    } catch (err) {
      console.warn('Supabase: Erro ao buscar mesas, usando dados mockados como fallback:', err);
    }
  }

  // Fallback baseado no cache do localStorage do applet ou carregamento inicial de 12 mesas
  const cached = localStorage.getItem('menumesa_tables_config');
  let tablesListObj = [];
  if (cached) {
    try {
      tablesListObj = JSON.parse(cached);
    } catch (e) {
      console.error(e);
    }
  }

  if (!tablesListObj || tablesListObj.length === 0) {
    tablesListObj = Array.from({ length: 12 }, (_, i) => {
      const tableId = String(i + 1).padStart(2, '0');
      const initialPeople = tableId === '02' ? 4 : tableId === '05' ? 2 : tableId === '08' ? 0 : tableId === '09' ? 3 : tableId === '11' ? 2 : 0;
      return {
        id: tableId,
        capacity: 4,
        isActive: true,
        peopleCount: initialPeople
      };
    });
  }

  return tablesListObj.map((t: any) => ({
    id: t.id,
    restaurant_id: restaurantId || '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01',
    number: t.id,
    capacity: t.capacity || 4,
    people_count: t.peopleCount || 0,
    status: t.peopleCount > 0 ? 'ocupada' : 'livre',
    is_active: t.isActive !== undefined ? t.isActive : true,
    created_at: new Date().toISOString()
  }));
}

/**
 * Atualiza o status de uma mesa no Supabase ou simula modificação.
 */
export async function updateTableStatus(tableId: string, status: DbTable['status'], peopleCount?: number): Promise<boolean> {
  if (isSupabaseConfigured) {
    try {
      const updates: Partial<DbTable> = { status };
      if (peopleCount !== undefined) {
        updates.people_count = peopleCount;
      }
      const { error } = await supabase
        .from('tables')
        .update(updates)
        .eq('number', tableId); // Ou id dependendo de como as tabelas são mapeadas
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase: Erro ao atualizar mesa:', err);
    }
  }
  return true;
}

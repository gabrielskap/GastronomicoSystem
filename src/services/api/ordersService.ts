import { supabase, isSupabaseConfigured, isValidUuid } from '../supabase';
import { DbOrder, DbOrderItem } from './types';

// Tabelas em memória para fallback local
let mockOrdersDb: DbOrder[] = [
  {
    id: 'PED-4821',
    restaurant_id: '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01',
    table_id: '02',
    comanda_id: 'comanda-02',
    status: 'preparing',
    total: 136.00,
    is_paid: false,
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    id: 'PED-1290',
    restaurant_id: '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01',
    table_id: '08',
    status: 'delivered',
    total: 83.00,
    is_paid: false,
    created_at: new Date(Date.now() - 65 * 60 * 1000).toISOString()
  },
  {
    id: 'PED-9311',
    restaurant_id: '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01',
    table_id: '11',
    status: 'ready',
    total: 36.00,
    is_paid: false,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  }
];

let mockOrderItemsDb: DbOrderItem[] = [
  {
    id: 'item-1',
    order_id: 'PED-4821',
    product_id: 'burg-1',
    name: 'Crown Smash Double Bacon',
    price: 46.00,
    quantity: 2,
    extras: [{ name: 'Bacon Artesanal Caramelizado', price: 6.00 }],
    paid_quantity: 0,
    observation: 'Mal passado por favor',
    customer_name: 'Gabriel e Família',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    id: 'item-2',
    order_id: 'PED-1290',
    product_id: 'burg-2',
    name: 'Truffle & Mushroom Burger',
    price: 49.00,
    quantity: 1,
    extras: [],
    paid_quantity: 0,
    created_at: new Date(Date.now() - 65 * 60 * 1000).toISOString()
  }
];

// Mock do banco de dados de order_item_addons
export interface DbOrderItemAddon {
  id: string;
  order_item_id: string;
  addon_id: string | null;
  name: string;
  price: number;
  quantity: number;
  created_at: string;
}

let mockOrderItemAddonsDb: DbOrderItemAddon[] = [
  {
    id: 'addon-1',
    order_item_id: 'item-1',
    addon_id: 'add-bacon',
    name: 'Bacon Artesanal Caramelizado',
    price: 6.00,
    quantity: 1,
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  }
];

/**
 * Busca todos os pedidos ativos (não pagos) do restaurante ou de uma mesa específica.
 */
export async function fetchOrders(tableId?: string): Promise<DbOrder[]> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('orders').select('*');
      if (tableId) {
        if (!isValidUuid(tableId)) {
          // Se o ID da mesa não for um UUID válido, é uma mesa mockada.
          // Retornamos os pedidos mockados correspondentes diretamente.
          return mockOrdersDb.filter((o) => o.table_id === tableId);
        }
        query = query.eq('table_id', tableId);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      if (data) return data as DbOrder[];
    } catch (err) {
      console.warn('Supabase: Erro ao buscar pedidos, retornando fallback mockado:', err);
    }
  }

  if (tableId) {
    return mockOrdersDb.filter((o) => o.table_id === tableId);
  }
  return mockOrdersDb;
}

/**
 * Busca itens relacionados a um pedido específico.
 */
export async function fetchOrderItems(orderId: string): Promise<DbOrderItem[]> {
  if (isSupabaseConfigured && isValidUuid(orderId)) {
    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId);
      if (error) throw error;
      if (data) return data as DbOrderItem[];
    } catch (err) {
      console.warn(`Supabase: Erro ao buscar itens do pedido ${orderId}:`, err);
    }
  }

  return mockOrderItemsDb.filter((item) => item.order_id === orderId);
}

/**
 * Busca os adicionais de um item de pedido específico do banco de dados.
 */
export async function fetchOrderItemAddons(orderItemId: string): Promise<DbOrderItemAddon[]> {
  if (isSupabaseConfigured && isValidUuid(orderItemId)) {
    try {
      const { data, error } = await supabase
        .from('order_item_addons')
        .select('*')
        .eq('order_item_id', orderItemId);
      if (error) throw error;
      if (data) return data as DbOrderItemAddon[];
    } catch (err) {
      console.warn(`Supabase: Erro ao buscar adicionais do item ${orderItemId}:`, err);
    }
  }

  return mockOrderItemAddonsDb.filter(addon => addon.order_item_id === orderItemId);
}

/**
 * Cria um novo pedido no banco de dados com seus respectivos itens.
 */
export async function createOrder(order: Partial<DbOrder>, items: Partial<DbOrderItem>[]): Promise<DbOrder | null> {
  const restaurant_id = order.restaurant_id || '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01';

  const canUseSupabase = isSupabaseConfigured && 
    (!order.table_id || isValidUuid(order.table_id)) && 
    (!order.comanda_id || isValidUuid(order.comanda_id));

  if (canUseSupabase) {
    try {
      // 1. Insere o pedido
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          restaurant_id,
          table_id: order.table_id,
          comanda_id: order.comanda_id,
          status: 'pending',
          total: order.total || 0,
          is_paid: false
        })
        .select()
        .single();

      if (orderError) throw orderError;

      if (newOrder && items.length > 0) {
        // 2. Insere os itens vinculados ao ID do pedido criado
        const itemsToInsert = items.map((item) => ({
          order_id: newOrder.id,
          product_id: item.product_id && isValidUuid(item.product_id) ? item.product_id : null,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          extras: item.extras, // Mantém JSON por compatibilidade
          observation: item.observation,
          customer_name: item.customer_name,
          paid_quantity: 0
        }));

        const { data: insertedItems, error: itemsError } = await supabase
          .from('order_items')
          .insert(itemsToInsert)
          .select();

        if (itemsError) throw itemsError;

        // 3. Salva os adicionais de cada item na tabela order_item_addons
        if (insertedItems && insertedItems.length > 0) {
          const addonsToInsert: any[] = [];
          
          insertedItems.forEach((insertedItem: any) => {
            // Encontra o item original correspondente pelo product_id
            const originalItem = items.find(
              orig => orig.product_id === insertedItem.product_id && orig.name === insertedItem.name
            );

            if (originalItem?.extras && originalItem.extras.length > 0) {
              originalItem.extras.forEach(extra => {
                addonsToInsert.push({
                  order_item_id: insertedItem.id,
                  addon_id: null, // Opcional, referenciado de forma solta
                  name: extra.name,
                  price: extra.price,
                  quantity: 1
                });
              });
            }
          });

          if (addonsToInsert.length > 0) {
            const { error: addonsError } = await supabase
              .from('order_item_addons')
              .insert(addonsToInsert);
            
            if (addonsError) throw addonsError;
          }
        }
      }

      return newOrder as DbOrder;
    } catch (err) {
      console.warn('Supabase: Erro ao criar pedido no banco de dados:', err);
      return null;
    }
  }

  // Fallback em memória
  const internalId = `PED-${Math.floor(Math.random() * 9000) + 1000}`;
  const localOrder: DbOrder = {
    id: internalId,
    restaurant_id,
    table_id: order.table_id || '01',
    comanda_id: order.comanda_id,
    status: 'pending',
    total: order.total || 0,
    is_paid: false,
    created_at: new Date().toISOString()
  };

  mockOrdersDb.push(localOrder);

  items.forEach((item) => {
    const itemInternalId = `item-${Math.random().toString(36).substring(2, 9)}`;
    const localOrderItem: DbOrderItem = {
      id: itemInternalId,
      order_id: internalId,
      product_id: item.product_id || '',
      name: item.name || '',
      price: item.price || 0,
      quantity: item.quantity || 1,
      extras: item.extras || [],
      observation: item.observation,
      customer_name: item.customer_name || 'Cliente',
      paid_quantity: 0,
      created_at: new Date().toISOString()
    };

    mockOrderItemsDb.push(localOrderItem);

    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(extra => {
        mockOrderItemAddonsDb.push({
          id: `addon-${Math.random().toString(36).substring(2, 9)}`,
          order_item_id: itemInternalId,
          addon_id: null,
          name: extra.name,
          price: extra.price,
          quantity: 1,
          created_at: new Date().toISOString()
        });
      });
    }
  });

  return localOrder;
}

/**
 * Atualiza o status do pedido (Cozinha/Painel do caixa)
 */
export async function updateOrderStatus(orderId: string, status: DbOrder['status']): Promise<boolean> {
  if (isSupabaseConfigured && isValidUuid(orderId)) {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn(`Supabase: Erro ao atualizar status do pedido ${orderId}:`, err);
    }
  }

  mockOrdersDb = mockOrdersDb.map(order => order.id === orderId ? { ...order, status } : order);
  return true;
}

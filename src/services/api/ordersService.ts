import { supabase, isValidUuid } from '../supabase';
import { TB } from './tables';
import { DbPedido, DbPedidoItem, DbPedidoItemAdicional, PedidoStatus } from './types';
import { mapPedidoItemToOrderItem } from './mappers';
import { OrderItem } from '../../types';

export interface NovoPedidoItemInput {
  produtoId: string | null;
  nome: string;
  preco: number;
  quantidade: number;
  extras: { name: string; price: number }[];
  observacao?: string;
  nomeCliente?: string;
}

export interface NovoPedidoInput {
  unidadeId: string;
  mesaId: string | null;
  comandaId: string | null;
  total: number;
  items: NovoPedidoItemInput[];
}

export interface PedidoComItens {
  pedido: DbPedido;
  items: OrderItem[];
}

/**
 * Busca todos os pedidos de uma unidade já com seus itens/adicionais mapeados.
 */
export async function fetchOrdersWithItems(unidadeId: string): Promise<PedidoComItens[]> {
  if (!unidadeId) return [];

  const { data: pedidosData, error } = await supabase
    .from(TB.pedidos)
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase: erro ao buscar pedidos:', error);
    return [];
  }
  const pedidos = (pedidosData || []) as DbPedido[];
  if (pedidos.length === 0) return [];

  const pedidoIds = pedidos.map((p) => p.id);
  const { data: itensData } = await supabase
    .from(TB.pedidoItens)
    .select('*')
    .in('pedido_id', pedidoIds);
  const itens = (itensData || []) as DbPedidoItem[];

  const itemIds = itens.map((i) => i.id);
  let adicionais: DbPedidoItemAdicional[] = [];
  if (itemIds.length > 0) {
    const { data: addData } = await supabase
      .from(TB.pedidoItemAdicionais)
      .select('*')
      .in('pedido_item_id', itemIds);
    adicionais = (addData || []) as DbPedidoItemAdicional[];
  }

  const adicionaisPorItem = new Map<string, DbPedidoItemAdicional[]>();
  adicionais.forEach((a) => {
    const arr = adicionaisPorItem.get(a.pedido_item_id) || [];
    arr.push(a);
    adicionaisPorItem.set(a.pedido_item_id, arr);
  });

  const itensPorPedido = new Map<string, OrderItem[]>();
  itens.forEach((item) => {
    const mapped = mapPedidoItemToOrderItem(item, adicionaisPorItem.get(item.id) || []);
    const arr = itensPorPedido.get(item.pedido_id) || [];
    arr.push(mapped);
    itensPorPedido.set(item.pedido_id, arr);
  });

  return pedidos.map((pedido) => ({ pedido, items: itensPorPedido.get(pedido.id) || [] }));
}

/**
 * Cria um pedido com seus itens e adicionais.
 */
export async function createOrder(input: NovoPedidoInput): Promise<DbPedido | null> {
  const { data: novoPedido, error: pedidoError } = await supabase
    .from(TB.pedidos)
    .insert({
      unidade_id: input.unidadeId,
      mesa_id: input.mesaId,
      comanda_id: input.comandaId,
      status: 'pending',
      total: input.total,
      pago: false,
    })
    .select()
    .single();

  if (pedidoError || !novoPedido) {
    console.error('Supabase: erro ao criar pedido:', pedidoError);
    return null;
  }

  if (input.items.length > 0) {
    const itensToInsert = input.items.map((item) => ({
      pedido_id: novoPedido.id,
      produto_id: item.produtoId && isValidUuid(item.produtoId) ? item.produtoId : null,
      nome: item.nome,
      preco: item.preco,
      quantidade: item.quantidade,
      quantidade_paga: 0,
      observacao: item.observacao ?? null,
      nome_cliente: item.nomeCliente ?? null,
    }));

    const { data: itensInseridos, error: itensError } = await supabase
      .from(TB.pedidoItens)
      .insert(itensToInsert)
      .select();

    if (itensError) {
      console.error('Supabase: erro ao inserir itens do pedido:', itensError);
    } else if (itensInseridos && itensInseridos.length > 0) {
      const adicionaisToInsert: any[] = [];
      itensInseridos.forEach((inserido: DbPedidoItem) => {
        const original = input.items.find(
          (o) => o.nome === inserido.nome && (o.produtoId || null) === (inserido.produto_id || null)
        );
        (original?.extras || []).forEach((extra) => {
          adicionaisToInsert.push({
            pedido_item_id: inserido.id,
            adicional_id: null,
            nome: extra.name,
            preco: extra.price,
            quantidade: 1,
          });
        });
      });

      if (adicionaisToInsert.length > 0) {
        const { error: addError } = await supabase
          .from(TB.pedidoItemAdicionais)
          .insert(adicionaisToInsert);
        if (addError) console.error('Supabase: erro ao inserir adicionais do item:', addError);
      }
    }
  }

  return novoPedido as DbPedido;
}

/**
 * Atualiza o status de um pedido (cozinha/caixa).
 */
export async function updateOrderStatus(pedidoId: string, status: PedidoStatus): Promise<boolean> {
  if (!isValidUuid(pedidoId)) return false;
  const { error } = await supabase.from(TB.pedidos).update({ status }).eq('id', pedidoId);
  if (error) {
    console.error('Supabase: erro ao atualizar status do pedido:', error);
    return false;
  }
  return true;
}

/**
 * Marca como pagos todos os pedidos abertos de uma mesa (fechamento de conta).
 */
export async function pagarPedidosDaMesa(unidadeId: string, mesaId: string): Promise<boolean> {
  const { error } = await supabase
    .from(TB.pedidos)
    .update({ pago: true, status: 'delivered' })
    .eq('unidade_id', unidadeId)
    .eq('mesa_id', mesaId)
    .eq('pago', false);
  if (error) {
    console.error('Supabase: erro ao pagar pedidos da mesa:', error);
    return false;
  }
  return true;
}

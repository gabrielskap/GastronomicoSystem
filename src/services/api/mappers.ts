/**
 * Tradução entre linhas do banco (schema Gastronomico_, pt-BR) e os tipos de
 * domínio usados pela UI (src/types.ts, camelCase). Ponto único de mapeamento.
 */
import { MenuItem, CategoryType, Order, OrderItem, OrderStatus, WaiterCall } from '../../types';
import {
  DbProduto,
  DbAdicional,
  DbPedido,
  DbPedidoItem,
  DbPedidoItemAdicional,
  DbChamado,
} from './types';

const IMAGEM_PADRAO =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80';

/** Produto (DB) → MenuItem (domínio). */
export function mapProdutoToMenuItem(
  p: DbProduto,
  categoriaSlug: string | undefined,
  extraIds: string[]
): MenuItem {
  return {
    id: p.id,
    name: p.nome,
    description: p.descricao || '',
    price: Number(p.preco),
    originalPrice: p.preco_original != null ? Number(p.preco_original) : undefined,
    category: (categoriaSlug || 'entradas') as CategoryType,
    image: p.imagem_url || IMAGEM_PADRAO,
    isAvailable: p.disponivel,
    estimatedTimeMin: p.tempo_estimado_min ?? 15,
    tags: p.tags || [],
    displayOrder: p.ordem_exibicao ?? 0,
    isFeatured: !!p.em_destaque,
    isPromo: !!p.em_promocao,
    availableExtras: extraIds,
    stock: p.estoque,
    showInMenu: p.exibir_no_cardapio,
  };
}

/** Adicional (DB) → formato "extra" usado pelo cardápio. */
export function mapAdicionalToExtra(a: DbAdicional) {
  return {
    id: a.id,
    menu_item_id: a.produto_id,
    name: a.nome,
    price: Number(a.preco),
    is_available: a.disponivel,
  };
}

/** Item de pedido (DB) + adicionais → OrderItem (domínio). */
export function mapPedidoItemToOrderItem(
  item: DbPedidoItem,
  adicionais: DbPedidoItemAdicional[]
): OrderItem {
  return {
    menuItemId: item.produto_id || '',
    name: item.nome,
    price: Number(item.preco),
    quantity: item.quantidade,
    extras: adicionais.map((a) => ({ name: a.nome, price: Number(a.preco) })),
    observation: item.observacao || undefined,
    customerName: item.nome_cliente || undefined,
    paidQuantity: item.quantidade_paga,
  };
}

/** Pedido (DB) + itens já mapeados → Order (domínio). tableId é o NÚMERO da mesa. */
export function mapPedidoToOrder(
  p: DbPedido,
  items: OrderItem[],
  numeroByMesaId: Record<string, string>
): Order {
  const status: OrderStatus = p.status === 'cancelled' ? 'delivered' : p.status;
  return {
    id: p.id,
    tableId: (p.mesa_id && numeroByMesaId[p.mesa_id]) || p.mesa_id || '',
    items,
    status,
    createdAt: p.created_at,
    total: Number(p.total),
    isPaid: p.pago,
  };
}

/** Chamado (DB) → WaiterCall (domínio). tableId é o NÚMERO da mesa. */
export function mapChamadoToCall(
  c: DbChamado,
  numeroByMesaId: Record<string, string>
): WaiterCall {
  return {
    id: c.id,
    tableId: (c.mesa_id && numeroByMesaId[c.mesa_id]) || c.mesa_id || '',
    reason: c.motivo,
    customNote: c.nota_personalizada || undefined,
    status: c.status,
    createdAt: c.created_at,
  };
}

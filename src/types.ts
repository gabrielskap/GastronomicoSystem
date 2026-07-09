/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CategoryType = 'entradas' | 'burgers' | 'bebidas' | 'sobremesas';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number; // Para mostrar promoção premium
  category: CategoryType;
  image: string;
  isAvailable: boolean;
  estimatedTimeMin: number;
  tags: string[]; // ex: "Mais vendido", "Artesanal", "Vegano"
  displayOrder?: number; // ordem de exibição
  isFeatured?: boolean; // produto em destaque
  isPromo?: boolean; // produto em promoção
  availableExtras?: string[]; // adicionais disponíveis (IDs dos adicionais)
  stock?: number; // quantidade em estoque para aviso de ruptura
  showInMenu?: boolean; // exibir no cardápio do restaurante para clientes
}

export interface CartItem {
  id: string; // id do item no carrinho (pode combinar id do produto com opções)
  menuItem: MenuItem;
  quantity: number;
  observation?: string;
  extras: { name: string; price: number }[];
  customerName?: string; // Nome da pessoa que pediu na comanda compartilhada
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered';

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  extras: { name: string; price: number }[];
  observation?: string;
  customerName?: string; // Nome de quem pediu
  paidQuantity?: number; // Quantidade de itens que já foram pagos individualmente
}

export interface Order {
  id: string;
  tableId: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  total: number;
  isPaid: boolean;
  isUnsynced?: boolean;
}

export type WaiterCallReason = 'payment' | 'assistance' | 'utensils' | 'drinks' | 'other' | 'cleaning' | 'problem' | 'waiter';

export interface WaiterCall {
  id: string;
  tableId: string;
  reason: WaiterCallReason;
  customNote?: string;
  status: 'pending' | 'resolved';
  createdAt: string;
  isUnsynced?: boolean;
}

export type TableStatus = 'livre' | 'ocupada' | 'aguardando pedido' | 'pedido em preparo' | 'aguardando pagamento' | 'precisa de atendimento';

export interface TableState {
  id: string;
  status: TableStatus;
  currentBill: number;
  activeOrdersCount: number;
  peopleCount: number;
  openedAt?: string;
  activeCalls: string[];
  isActive: boolean;
  capacity: number;
}

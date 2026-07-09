/**
 * Tipos TypeScript mapeando a estrutura do Supabase para o sistema de restaurante.
 */

// 1. Restaurante
export interface DbRestaurant {
  id: string; // uuid
  name: string;
  slug: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  theme_color?: string; // ex: 'red', 'emerald', 'amber', 'zinc'
  created_at: string;
}

// 2. Categoria de Produto
export interface DbCategory {
  id: string; // uuid
  restaurant_id: string; // uuid
  name: string; // ex: "Burgers"
  slug: string; // ex: "burgers"
  display_order: number;
  created_at: string;
}

// 3. Mesa
export interface DbTable {
  id: string; // uuid
  restaurant_id: string; // uuid
  number: string; // ex: "04"
  capacity: number;
  people_count: number;
  status: 'livre' | 'ocupada' | 'aguardando pedido' | 'pedido em preparo' | 'aguardando pagamento' | 'precisa de atendimento';
  is_active: boolean;
  created_at: string;
}

// 4. Produto (Menu Item)
export interface DbProduct {
  id: string; // uuid
  restaurant_id: string; // uuid
  category_id: string; // uuid
  name: string;
  description?: string;
  price: number;
  original_price?: number; // Para promoções
  image_url?: string;
  is_available: boolean;
  estimated_time_min: number;
  tags: string[]; // ex: ["Mais vendido", "Artesanal"]
  is_featured: boolean;
  is_promo: boolean;
  available_extras?: { name: string; price: number }[]; // adicionais disponíveis em JSON
  created_at: string;
}

// 5. Comanda (Sessão do cliente na mesa, controle de conta)
export interface DbComanda {
  id: string; // uuid
  restaurant_id: string; // uuid
  table_id: string; // uuid da mesa ou id identificador
  customer_name?: string; // Nome do cliente principal ou nulo se comanda geral da mesa
  status: 'active' | 'closed' | 'paid';
  opened_at: string;
  closed_at?: string;
  total_amount: number;
  created_at: string;
}

// 5.1 Participante da Comanda
export interface DbTabParticipant {
  id: string;
  comanda_id: string;
  name: string;
  joined_at: string;
  created_at: string;
}

// 6. Pedido
export interface DbOrder {
  id: string; // uuid
  restaurant_id: string; // uuid
  table_id: string; // número ou uuid da mesa
  comanda_id?: string; // uuid da comanda caso use modelo de comanda
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  total: number;
  is_paid: boolean;
  created_at: string;
}

// 7. Item do Pedido
export interface DbOrderItem {
  id: string; // uuid
  order_id: string; // uuid do pedido principal
  product_id: string; // uuid do produto
  name: string;
  price: number;
  quantity: number;
  extras?: { name: string; price: number }[]; // adicionais escolhidos em formato JSON
  observation?: string;
  customer_name?: string; // Quem fez o pedido (útil em comanda compartilhada)
  paid_quantity: number; // quantidade já paga individualmente
  created_at: string;
}

// 8. Chamados (Atendimento do Garçom)
export interface DbWaiterCall {
  id: string; // uuid
  restaurant_id: string; // uuid
  table_id: string; // número ou uuid da mesa
  reason: 'payment' | 'assistance' | 'utensils' | 'drinks' | 'other' | 'cleaning' | 'problem' | 'waiter';
  custom_note?: string;
  status: 'pending' | 'resolved';
  created_at: string;
}

// 9. Pagamento
export interface DbPayment {
  id: string; // uuid
  restaurant_id: string; // uuid
  comanda_id: string; // uuid da comanda correspondente
  amount: number;
  payment_method: 'card' | 'pix' | 'cash';
  status: 'pending' | 'completed' | 'failed';
  payer_name?: string; // nome de quem pagou
  created_at: string;
}

// Utilitário genérico para estados de requisição da API
export interface ApiResponseState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

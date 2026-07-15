/**
 * Tipos TypeScript mapeando as tabelas reais do schema Gastronomico_ (Supabase).
 * Colunas em snake_case pt-BR, exatamente como no banco.
 */

export type PedidoStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
export type ComandaStatus = 'active' | 'closed' | 'paid';
export type MesaStatusDb =
  | 'livre'
  | 'ocupada'
  | 'aguardando pedido'
  | 'pedido em preparo'
  | 'aguardando pagamento'
  | 'precisa de atendimento';
export type ChamadoMotivo =
  | 'payment' | 'assistance' | 'utensils' | 'drinks'
  | 'other' | 'cleaning' | 'problem' | 'waiter';
export type ChamadoStatus = 'pending' | 'resolved';
export type FormaPagamento = 'pix' | 'dinheiro' | 'credito' | 'debito';
export type PagamentoTipo = 'FULL' | 'ITEMS' | 'SPLIT_MEMBER';
export type PagamentoStatus = 'pending' | 'completed' | 'failed';
export type EstoqueMovTipo = 'entrada' | 'saida' | 'ajuste' | 'perda';
export type CaixaMovTipo = 'abertura' | 'fechamento' | 'sangria' | 'suprimento';

// 1. Restaurante (marca/conta)
export interface DbRestaurante {
  id: string;
  nome: string;
  slug: string;
  logo_url?: string | null;
  cor_tema: string;
  taxa_servico_padrao: number;
  plano: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// 2. Unidade (filial)
export interface DbUnidade {
  id: string;
  restaurante_id: string;
  nome: string;
  slug: string;
  endereco?: string | null;
  telefone?: string | null;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

// 3. Usuário (perfil ligado ao Supabase Auth)
export interface DbUsuario {
  id: string;
  restaurante_id: string;
  unidade_id?: string | null;
  nome: string;
  cargo: string;
  cpf?: string | null;
  data_nascimento?: string | null;
  telefone?: string | null;
  cor_avatar?: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// 4. Módulo (catálogo global permissionável)
export interface DbModulo {
  id: string;
  chave: string;
  nome: string;
  descricao?: string | null;
}

// 5. Permissão (usuário × módulo)
export interface DbPermissao {
  id: string;
  usuario_id: string;
  modulo_id: string;
  permitido: boolean;
}

// 6. Categoria
export interface DbCategoria {
  id: string;
  unidade_id: string;
  nome: string;
  slug: string;
  ordem_exibicao: number;
  created_at: string;
  updated_at: string;
}

// 7. Produto
export interface DbProduto {
  id: string;
  unidade_id: string;
  categoria_id?: string | null;
  nome: string;
  descricao?: string | null;
  preco: number;
  preco_original?: number | null;
  imagem_url?: string | null;
  disponivel: boolean;
  tempo_estimado_min: number;
  tags: string[];
  em_destaque: boolean;
  em_promocao: boolean;
  estoque: number;
  exibir_no_cardapio: boolean;
  ordem_exibicao: number;
  created_at: string;
  updated_at: string;
}

// 8. Adicional
export interface DbAdicional {
  id: string;
  produto_id: string;
  nome: string;
  preco: number;
  disponivel: boolean;
  created_at: string;
  updated_at: string;
}

// 9. Mesa
export interface DbMesa {
  id: string;
  unidade_id: string;
  numero: string;
  capacidade: number;
  quantidade_pessoas: number;
  status: MesaStatusDb;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

// 10. Comanda
export interface DbComanda {
  id: string;
  unidade_id: string;
  mesa_id?: string | null;
  nome_cliente?: string | null;
  status: ComandaStatus;
  aberta_em: string;
  fechada_em?: string | null;
  valor_total: number;
  created_at: string;
  updated_at: string;
}

// 11. Participante da comanda
export interface DbComandaParticipante {
  id: string;
  comanda_id: string;
  nome: string;
  entrou_em: string;
  created_at: string;
  updated_at: string;
}

// 12. Pedido
export interface DbPedido {
  id: string;
  unidade_id: string;
  mesa_id?: string | null;
  comanda_id?: string | null;
  status: PedidoStatus;
  total: number;
  pago: boolean;
  created_at: string;
  updated_at: string;
}

// 13. Item do pedido
export interface DbPedidoItem {
  id: string;
  pedido_id: string;
  produto_id?: string | null;
  nome: string;
  preco: number;
  quantidade: number;
  quantidade_paga: number;
  observacao?: string | null;
  nome_cliente?: string | null;
  created_at: string;
  updated_at: string;
}

// 14. Adicional escolhido no item do pedido
export interface DbPedidoItemAdicional {
  id: string;
  pedido_item_id: string;
  adicional_id?: string | null;
  nome: string;
  preco: number;
  quantidade: number;
  created_at: string;
  updated_at: string;
}

// 15. Movimentação de estoque
export interface DbMovimentacaoEstoque {
  id: string;
  unidade_id: string;
  produto_id: string;
  tipo: EstoqueMovTipo;
  quantidade: number;
  saldo_anterior: number;
  saldo_atual: number;
  motivo?: string | null;
  usuario_id?: string | null;
  pedido_id?: string | null;
  created_at: string;
  updated_at: string;
}

// 16. Chamado de garçom
export interface DbChamado {
  id: string;
  unidade_id: string;
  mesa_id: string;
  motivo: ChamadoMotivo;
  nota_personalizada?: string | null;
  status: ChamadoStatus;
  created_at: string;
  updated_at: string;
}

// 17. Pagamento
export interface DbPagamento {
  id: string;
  unidade_id: string;
  comanda_id?: string | null;
  mesa_id?: string | null;
  usuario_id?: string | null;
  subtotal: number;
  taxa_servico: number;
  taxa_servico_percentual: number;
  desconto: number;
  valor_total: number;
  forma_pagamento: FormaPagamento;
  valor_recebido: number;
  troco: number;
  quantidade_pessoas: number;
  tipo: PagamentoTipo;
  nome_pagador?: string | null;
  status: PagamentoStatus;
  created_at: string;
  updated_at: string;
}

// 18. Movimentação de caixa
export interface DbMovimentacaoCaixa {
  id: string;
  unidade_id: string;
  usuario_id?: string | null;
  tipo: CaixaMovTipo;
  valor: number;
  descricao?: string | null;
  saldo_apos: number;
  registrado_em: string;
  created_at: string;
  updated_at: string;
}

// Utilitário genérico para estados de requisição da API
export interface ApiResponseState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

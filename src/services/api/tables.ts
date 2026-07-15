/**
 * Nomes reais das tabelas no schema Gastronomico_ (Supabase/PostgreSQL).
 * Centralizado para evitar erros de digitação nos serviços.
 *
 * OBS: as tabelas foram criadas com "G" maiúsculo. O PostgREST expõe o nome
 * exatamente como está no catálogo, portanto usamos a string como está aqui
 * (sem aspas — as aspas só são necessárias em SQL puro).
 */
export const TB = {
  restaurantes: 'Gastronomico_restaurantes',
  unidades: 'Gastronomico_unidades',
  usuarios: 'Gastronomico_usuarios',
  modulos: 'Gastronomico_modulos',
  permissoes: 'Gastronomico_usuario_permissoes',
  categorias: 'Gastronomico_categorias',
  produtos: 'Gastronomico_produtos',
  adicionais: 'Gastronomico_adicionais',
  mesas: 'Gastronomico_mesas',
  comandas: 'Gastronomico_comandas',
  participantes: 'Gastronomico_comanda_participantes',
  pedidos: 'Gastronomico_pedidos',
  pedidoItens: 'Gastronomico_pedido_itens',
  pedidoItemAdicionais: 'Gastronomico_pedido_item_adicionais',
  estoqueMov: 'Gastronomico_estoque_movimentacoes',
  chamados: 'Gastronomico_chamados_garcom',
  pagamentos: 'Gastronomico_pagamentos',
  caixaMov: 'Gastronomico_caixa_movimentacoes',
} as const;

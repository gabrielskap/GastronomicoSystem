import { supabase } from '../supabase';
import { TB } from './tables';
import { DbPagamento, FormaPagamento, PagamentoTipo } from './types';

export interface NovoPagamentoInput {
  unidadeId: string;
  comandaId?: string | null;
  mesaId?: string | null;
  usuarioId?: string | null;
  subtotal: number;
  taxaServico: number;
  taxaServicoPercentual: number;
  desconto: number;
  valorTotal: number;
  formaPagamento: FormaPagamento;
  valorRecebido: number;
  troco: number;
  quantidadePessoas: number;
  tipo: PagamentoTipo;
  nomePagador?: string | null;
}

/**
 * Registra um comprovante de pagamento emitido no caixa.
 */
export async function registrarPagamento(input: NovoPagamentoInput): Promise<DbPagamento | null> {
  const { data, error } = await supabase
    .from(TB.pagamentos)
    .insert({
      unidade_id: input.unidadeId,
      comanda_id: input.comandaId ?? null,
      mesa_id: input.mesaId ?? null,
      usuario_id: input.usuarioId ?? null,
      subtotal: input.subtotal,
      taxa_servico: input.taxaServico,
      taxa_servico_percentual: input.taxaServicoPercentual,
      desconto: input.desconto,
      valor_total: input.valorTotal,
      forma_pagamento: input.formaPagamento,
      valor_recebido: input.valorRecebido,
      troco: input.troco,
      quantidade_pessoas: input.quantidadePessoas,
      tipo: input.tipo,
      nome_pagador: input.nomePagador ?? null,
      status: 'completed',
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase: erro ao registrar pagamento:', error);
    return null;
  }
  return data as DbPagamento;
}

/**
 * Lista pagamentos de uma unidade (opcionalmente a partir de uma data ISO).
 */
export async function fetchPagamentos(unidadeId: string, desdeIso?: string): Promise<DbPagamento[]> {
  if (!unidadeId) return [];
  let query = supabase.from(TB.pagamentos).select('*').eq('unidade_id', unidadeId);
  if (desdeIso) query = query.gte('created_at', desdeIso);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) {
    console.error('Supabase: erro ao buscar pagamentos:', error);
    return [];
  }
  return (data || []) as DbPagamento[];
}

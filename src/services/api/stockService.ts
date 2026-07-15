import { supabase } from '../supabase';
import { TB } from './tables';
import { DbMovimentacaoEstoque, DbProduto, EstoqueMovTipo } from './types';

/**
 * Registra uma movimentação de estoque e atualiza o saldo em cache do produto.
 * `quantidade` deve vir com sinal: positivo (entrada) ou negativo (saída/perda).
 */
export async function registrarMovimentacaoEstoque(input: {
  unidadeId: string;
  produtoId: string;
  tipo: EstoqueMovTipo;
  quantidade: number;
  saldoAnterior: number;
  motivo?: string;
  usuarioId?: string | null;
}): Promise<DbMovimentacaoEstoque | null> {
  const saldoAtual = Math.max(0, input.saldoAnterior + input.quantidade);

  const { data, error } = await supabase
    .from(TB.estoqueMov)
    .insert({
      unidade_id: input.unidadeId,
      produto_id: input.produtoId,
      tipo: input.tipo,
      quantidade: input.quantidade,
      saldo_anterior: input.saldoAnterior,
      saldo_atual: saldoAtual,
      motivo: input.motivo ?? null,
      usuario_id: input.usuarioId ?? null,
    })
    .select()
    .single();

  if (error) {
    console.error('Supabase: erro ao registrar movimentação de estoque:', error);
    return null;
  }

  // Mantém o saldo em cache do produto sincronizado.
  const { error: prodError } = await supabase
    .from(TB.produtos)
    .update({ estoque: saldoAtual })
    .eq('id', input.produtoId);
  if (prodError) console.error('Supabase: erro ao atualizar saldo do produto:', prodError);

  return data as DbMovimentacaoEstoque;
}

/**
 * Define um novo saldo de estoque para o produto (ajuste manual), gerando a
 * movimentação correspondente.
 */
export async function definirEstoque(input: {
  unidadeId: string;
  produto: DbProduto;
  novoSaldo: number;
  motivo?: string;
  usuarioId?: string | null;
}): Promise<DbMovimentacaoEstoque | null> {
  const saldoAnterior = input.produto.estoque ?? 0;
  const delta = input.novoSaldo - saldoAnterior;
  // O banco exige quantidade <> 0; sem alteração real, não há movimentação.
  if (delta === 0) return null;
  return registrarMovimentacaoEstoque({
    unidadeId: input.unidadeId,
    produtoId: input.produto.id,
    tipo: 'ajuste',
    quantidade: delta,
    saldoAnterior,
    motivo: input.motivo ?? 'Ajuste manual de estoque',
    usuarioId: input.usuarioId ?? null,
  });
}

/**
 * Lista as movimentações de estoque de uma unidade.
 */
export async function fetchMovimentacoesEstoque(
  unidadeId: string,
  limite = 200
): Promise<DbMovimentacaoEstoque[]> {
  if (!unidadeId) return [];
  const { data, error } = await supabase
    .from(TB.estoqueMov)
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) {
    console.error('Supabase: erro ao buscar movimentações de estoque:', error);
    return [];
  }
  return (data || []) as DbMovimentacaoEstoque[];
}

import { supabase } from '../supabase';
import { TB } from './tables';
import { DbMovimentacaoCaixa, CaixaMovTipo } from './types';

/**
 * Lista as movimentações de caixa (livro-caixa) de uma unidade.
 */
export async function fetchMovimentacoesCaixa(unidadeId: string): Promise<DbMovimentacaoCaixa[]> {
  if (!unidadeId) return [];
  const { data, error } = await supabase
    .from(TB.caixaMov)
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('registrado_em', { ascending: false });
  if (error) {
    console.error('Supabase: erro ao buscar movimentações de caixa:', error);
    return [];
  }
  return (data || []) as DbMovimentacaoCaixa[];
}

/**
 * Registra uma movimentação de caixa (abertura/fechamento/sangria/suprimento).
 */
export async function registrarMovimentacaoCaixa(input: {
  unidadeId: string;
  tipo: CaixaMovTipo;
  valor: number;
  descricao?: string;
  saldoApos: number;
  usuarioId?: string | null;
}): Promise<DbMovimentacaoCaixa | null> {
  const { data, error } = await supabase
    .from(TB.caixaMov)
    .insert({
      unidade_id: input.unidadeId,
      tipo: input.tipo,
      valor: input.valor,
      descricao: input.descricao ?? null,
      saldo_apos: input.saldoApos,
      usuario_id: input.usuarioId ?? null,
      registrado_em: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    console.error('Supabase: erro ao registrar movimentação de caixa:', error);
    return null;
  }
  return data as DbMovimentacaoCaixa;
}

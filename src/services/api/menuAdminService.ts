import { supabase } from '../supabase';
import { TB } from './tables';
import { DbProduto, DbAdicional } from './types';

export interface ProdutoInput {
  unidade_id?: string;
  categoria_id?: string | null;
  nome: string;
  descricao?: string | null;
  preco: number;
  preco_original?: number | null;
  imagem_url?: string | null;
  disponivel?: boolean;
  tempo_estimado_min?: number;
  tags?: string[];
  em_destaque?: boolean;
  em_promocao?: boolean;
  estoque?: number;
  exibir_no_cardapio?: boolean;
  ordem_exibicao?: number;
}

/** Cria um produto no cardápio de uma unidade. */
export async function criarProduto(input: ProdutoInput): Promise<DbProduto | null> {
  const { data, error } = await supabase.from(TB.produtos).insert(input).select().single();
  if (error) {
    console.error('Supabase: erro ao criar produto:', error);
    return null;
  }
  return data as DbProduto;
}

/** Atualiza campos de um produto. */
export async function atualizarProduto(
  produtoId: string,
  updates: Partial<ProdutoInput>
): Promise<boolean> {
  const { error } = await supabase.from(TB.produtos).update(updates).eq('id', produtoId);
  if (error) {
    console.error('Supabase: erro ao atualizar produto:', error);
    return false;
  }
  return true;
}

/** Remove um produto. */
export async function removerProduto(produtoId: string): Promise<boolean> {
  const { error } = await supabase.from(TB.produtos).delete().eq('id', produtoId);
  if (error) {
    console.error('Supabase: erro ao remover produto:', error);
    return false;
  }
  return true;
}

/** Alterna a disponibilidade de um produto. */
export async function alternarDisponibilidade(produtoId: string, disponivel: boolean): Promise<boolean> {
  return atualizarProduto(produtoId, { disponivel });
}

/** Atualiza o preço de um produto. */
export async function atualizarPreco(produtoId: string, preco: number): Promise<boolean> {
  return atualizarProduto(produtoId, { preco });
}

/** Lista os adicionais de um produto. */
export async function fetchAdicionais(produtoId: string): Promise<DbAdicional[]> {
  const { data, error } = await supabase
    .from(TB.adicionais)
    .select('*')
    .eq('produto_id', produtoId);
  if (error) {
    console.error('Supabase: erro ao buscar adicionais:', error);
    return [];
  }
  return (data || []) as DbAdicional[];
}

/** Cria um adicional para um produto. */
export async function criarAdicional(
  produtoId: string,
  nome: string,
  preco: number
): Promise<DbAdicional | null> {
  const { data, error } = await supabase
    .from(TB.adicionais)
    .insert({ produto_id: produtoId, nome, preco })
    .select()
    .single();
  if (error) {
    console.error('Supabase: erro ao criar adicional:', error);
    return null;
  }
  return data as DbAdicional;
}

/** Remove um adicional. */
export async function removerAdicional(adicionalId: string): Promise<boolean> {
  const { error } = await supabase.from(TB.adicionais).delete().eq('id', adicionalId);
  if (error) {
    console.error('Supabase: erro ao remover adicional:', error);
    return false;
  }
  return true;
}

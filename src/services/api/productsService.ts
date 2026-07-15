import { supabase } from '../supabase';
import { TB } from './tables';
import { DbProduto, DbCategoria, DbAdicional } from './types';
import { mapProdutoToMenuItem, mapAdicionalToExtra } from './mappers';
import { MenuItem } from '../../types';

export interface FullMenuData {
  categories: { id: string; name: string; slug: string; display_order: number }[];
  items: MenuItem[];
  addons: { id: string; menu_item_id: string; name: string; price: number; is_available: boolean }[];
}

/**
 * Busca todo o cardápio de uma unidade (categorias, produtos e adicionais).
 */
export async function fetchFullMenu(unidadeId: string): Promise<FullMenuData> {
  if (!unidadeId) return { categories: [], items: [], addons: [] };

  const [{ data: categorias }, { data: produtos }, { data: adicionais }] = await Promise.all([
    supabase.from(TB.categorias).select('*').eq('unidade_id', unidadeId).order('ordem_exibicao', { ascending: true }),
    supabase.from(TB.produtos).select('*').eq('unidade_id', unidadeId).order('ordem_exibicao', { ascending: true }),
    supabase.from(TB.adicionais).select('*'),
  ]);

  const cats = (categorias || []) as DbCategoria[];
  const prods = (produtos || []) as DbProduto[];
  const adds = (adicionais || []) as DbAdicional[];

  const slugById = new Map<string, string>();
  cats.forEach((c) => slugById.set(c.id, c.slug));

  const addonsByProduto = new Map<string, string[]>();
  adds.forEach((a) => {
    const arr = addonsByProduto.get(a.produto_id) || [];
    arr.push(a.id);
    addonsByProduto.set(a.produto_id, arr);
  });

  const items: MenuItem[] = prods.map((p) =>
    mapProdutoToMenuItem(p, slugById.get(p.categoria_id || ''), addonsByProduto.get(p.id) || [])
  );

  // Só devolvemos adicionais cujos produtos pertencem a esta unidade.
  const produtoIds = new Set(prods.map((p) => p.id));

  return {
    categories: cats.map((c) => ({ id: c.id, name: c.nome, slug: c.slug, display_order: c.ordem_exibicao })),
    items,
    addons: adds.filter((a) => produtoIds.has(a.produto_id)).map(mapAdicionalToExtra),
  };
}

/**
 * Lista os produtos (linha do banco) de uma unidade — usado em telas admin.
 */
export async function fetchProdutos(unidadeId: string): Promise<DbProduto[]> {
  const { data, error } = await supabase
    .from(TB.produtos)
    .select('*')
    .eq('unidade_id', unidadeId)
    .order('nome');
  if (error) {
    console.error('Supabase: erro ao buscar produtos:', error);
    return [];
  }
  return (data || []) as DbProduto[];
}

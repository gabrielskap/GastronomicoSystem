import { supabase, isSupabaseConfigured, isValidUuid } from '../supabase';
import { DbProduct } from './types';
import { INITIAL_MENU_ITEMS, EXTRA_ITEMS } from '../../data/menuData';
import { MenuItem, CategoryType } from '../../types';

export interface FullMenuData {
  categories: {
    id: string;
    name: string;
    slug: string;
    display_order: number;
  }[];
  items: MenuItem[];
  addons: {
    id: string;
    menu_item_id: string;
    name: string;
    price: number;
    is_available: boolean;
  }[];
}

/**
 * Busca toda a estrutura de cardápio ativa do Supabase (categorias, itens e adicionais)
 * ou retorna dados mockados estruturados se não configurado.
 */
export async function fetchFullMenu(): Promise<FullMenuData> {
  if (isSupabaseConfigured) {
    try {
      // 1. Carregar categorias
      const { data: categoriesData, error: catError } = await supabase
        .from('menu_categories')
        .select('*')
        .order('display_order', { ascending: true });
      if (catError) throw catError;

      // 2. Carregar apenas produtos ativos (is_available = true)
      const { data: itemsData, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('name', { ascending: true });
      if (itemsError) throw itemsError;

      // 3. Carregar todos adicionais ativos (is_available = true)
      const { data: addonsData, error: addonsError } = await supabase
        .from('menu_item_addons')
        .select('*')
        .eq('is_available', true);
      if (addonsError) throw addonsError;

      // Mapeamento de id da categoria para suas informações
      const categoryMap = new Map<string, { name: string; slug: string }>();
      (categoriesData || []).forEach(cat => {
        categoryMap.set(cat.id, { name: cat.name, slug: cat.slug });
      });

      // Mapear registros de menu_items para componentes no formato MenuItem
      const items: MenuItem[] = (itemsData || []).map(item => {
        const catInfo = categoryMap.get(item.category_id);
        const categorySlug = (catInfo?.slug || 'entradas') as CategoryType;

        // Filtra os adicionais vinculados àquele item específico
        const itemAddonIds = (addonsData || [])
          .filter(add => add.menu_item_id === item.id)
          .map(add => add.id);

        return {
          id: item.id,
          name: item.name,
          description: item.description || '',
          price: Number(item.price),
          originalPrice: item.original_price ? Number(item.original_price) : undefined,
          category: categorySlug,
          image: item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80',
          isAvailable: item.is_available,
          estimatedTimeMin: item.estimated_time_min || 15,
          tags: item.tags || [],
          displayOrder: item.display_order || 0,
          isFeatured: !!item.is_featured,
          isPromo: !!item.is_promo,
          availableExtras: itemAddonIds
        };
      });

      return {
        categories: (categoriesData || []).map(cat => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          display_order: cat.display_order
        })),
        items,
        addons: (addonsData || []).map(add => ({
          id: add.id,
          menu_item_id: add.menu_item_id,
          name: add.name,
          price: Number(add.price),
          is_available: add.is_available
        }))
      };
    } catch (err) {
      console.warn('Supabase: Erro ao buscar cardápio completo, usando dados mockados como fallback:', err);
    }
  }

  // Fallback padrão se Supabase não configurado ou falhar
  return getFallbackMenuData();
}

/**
 * Cria a estrutura de dados mockados no mesmo formato compatível.
 */
function getFallbackMenuData(): FullMenuData {
  const categories = [
    { id: 'cat-ent', name: 'Entradas', slug: 'entradas', display_order: 1 },
    { id: 'cat-burg', name: 'Hamburgers', slug: 'burgers', display_order: 2 },
    { id: 'cat-beb', name: 'Bebidas', slug: 'bebidas', display_order: 3 },
    { id: 'cat-sob', name: 'Sobremesas', slug: 'sobremesas', display_order: 4 }
  ];

  const items: MenuItem[] = INITIAL_MENU_ITEMS.map(item => {
    let catId = 'cat-ent';
    if (item.category === 'burgers') catId = 'cat-burg';
    else if (item.category === 'bebidas') catId = 'cat-beb';
    else if (item.category === 'sobremesas') catId = 'cat-sob';

    // Mapeia adicionais que pertencem à categoria do item
    const itemAddonIds = EXTRA_ITEMS
      .filter(ext => ext.category === item.category)
      .map(ext => ext.id);

    return {
      ...item,
      availableExtras: itemAddonIds
    };
  });

  const addons = EXTRA_ITEMS.map((ext, idx) => {
    // Vincula a um menu item correspondente de forma coerente de modo que o fallback modal de customização funcione
    let sampleItemId = 'burg-1';
    if (ext.category === 'sobremesas') {
      sampleItemId = 'sob-1';
    } else if (ext.category === 'entradas') {
      sampleItemId = 'ent-1';
    }

    return {
      id: ext.id,
      menu_item_id: sampleItemId,
      name: ext.name,
      price: ext.price,
      is_available: true
    };
  });

  return { categories, items, addons };
}

/**
 * Busca produtos/itens do cardápio do Supabase ou retorna o fallback de dados mockados.
 * @param categoryId Filtro opcional por ID da categoria no banco de dados.
 * @returns Lista de produtos seguindo o modelo do banco de dados.
 */
export async function fetchProducts(categoryId?: string): Promise<DbProduct[]> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase.from('products').select('*');
      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }
      const { data, error } = await query.order('name');
      if (error) throw error;
      if (data) {
        return data as DbProduct[];
      }
    } catch (err) {
      console.warn('Supabase: Erro ao buscar produtos, usando dados mockados como fallback:', err);
    }
  }

  // Fallback seguro usando dados mockados mapeados para a tipagem DbProduct
  return INITIAL_MENU_ITEMS.map((item) => ({
    id: item.id,
    restaurant_id: '93dbba32-e3d1-4ba2-8bf8-d3fd3dbdcc01', // ID de restaurante mockado padrão
    category_id: item.category === 'entradas' ? 'cat-ent' : item.category === 'burgers' ? 'cat-burg' : item.category === 'bebidas' ? 'cat-beb' : 'cat-sob',
    name: item.name,
    description: item.description,
    price: item.price,
    original_price: item.originalPrice,
    image_url: item.image,
    is_available: item.isAvailable,
    estimated_time_min: item.estimatedTimeMin,
    tags: item.tags,
    is_featured: !!item.isFeatured,
    is_promo: !!item.isPromo,
    available_extras: [], // Carregado dinamicamente das opções
    created_at: new Date().toISOString()
  }));
}

/**
 * Atualiza o status de disponibilidade do produto (ideal para sincronizar depois com o Admin).
 */
export async function updateProductAvailability(productId: string, isAvailable: boolean): Promise<boolean> {
  if (isSupabaseConfigured && isValidUuid(productId)) {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_available: isAvailable })
        .eq('id', productId);
      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('Supabase: Erro ao atualizar disponibilidade do produto:', err);
    }
  }
  return true; // Simula sucesso no mock
}

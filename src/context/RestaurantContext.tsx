/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  MenuItem, CartItem, Order, WaiterCall, TableState,
  OrderStatus, WaiterCallReason, OrderItem, TableStatus,
} from '../types';
import { DbComanda, DbComandaParticipante, FormaPagamento, PagamentoTipo } from '../services/api/types';
import { registrarPagamento } from '../services/api/paymentsService';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import {
  resolveUnidadeBySlug, resolveUnidadeById, getUnidadeSlugFromUrl, getTableNumberFromUrl, UnidadeTenant,
} from '../config/tenant';
import { TB } from '../services/api/tables';
import { fetchFullMenu } from '../services/api/productsService';
import { fetchMesas, createMesa, updateMesa as apiUpdateMesa } from '../services/api/tablesService';
import {
  fetchOrdersWithItems, createOrder as apiCreateOrder,
  updateOrderStatus as apiUpdateOrderStatus, pagarPedidosDaMesa,
} from '../services/api/ordersService';
import { fetchCalls, createCall as apiCreateCall, resolveCall as apiResolveCall } from '../services/api/callsService';
import {
  createComanda, fetchActiveTableComanda, fetchTabParticipants,
  addParticipantToComanda, removeParticipantFromComanda, updateComandaTotal, fecharComandaPaga,
} from '../services/api/comandasService';
import {
  alternarDisponibilidade, atualizarPreco, criarProduto, atualizarProduto, removerProduto, ProdutoInput,
} from '../services/api/menuAdminService';
import { mapPedidoToOrder, mapChamadoToCall } from '../services/api/mappers';
import { LanguageType, translations } from '../utils/translations';
import {
  getUnsyncedOrders, deleteUnsyncedOrder, getUnsyncedCalls, deleteUnsyncedCall,
  saveUnsyncedOrder, saveUnsyncedCall,
} from '../services/indexedDbService';

interface MesaConfig {
  id: string;        // número da mesa (ex: "04")
  mesaId: string;    // uuid real da mesa no banco
  capacity: number;
  isActive: boolean;
  peopleCount: number;
  openedAt?: string;
}

interface Categoria {
  id: string;
  slug: string;
  name: string;
}

export interface MenuAddon {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  is_available: boolean;
}

interface RestaurantContextType {
  menuItems: MenuItem[];
  menuAddons: MenuAddon[];
  menuLoading: boolean;
  activeTable: string;
  cart: CartItem[];
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  calls: WaiterCall[];
  tables: TableState[];
  setThemeColor: (color: string) => void;
  themeColor: string;
  customColor: string;
  setCustomColor: (color: string) => void;

  // Tenant (marca/unidade)
  unidadeId: string | null;
  restauranteId: string | null;
  taxaServicoPadrao: number;
  tenantReady: boolean;

  // Translation
  language: LanguageType;
  setLanguage: (lang: LanguageType) => void;
  t: (key: string) => string;

  // Cart Actions
  addToCart: (item: MenuItem, quantity: number, extras: { name: string; price: number }[], observation?: string, customerName?: string) => void;
  removeFromCart: (cartItemId: string) => void;
  updateCartQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;

  // Order Actions
  placeOrder: (comandaId?: string) => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  payAllOrdersOfTable: (tableId: string) => void;

  // Call Waiter Actions
  submitCallWaiter: (reason: WaiterCallReason, customNote?: string) => void;
  resolveCallWaiter: (callId: string) => void;

  // Caixa
  registrarPagamentoCaixa: (dados: PagamentoCaixaInput) => Promise<void>;

  // Configuration Actions
  changeActiveTable: (tableId: string) => void;
  toggleItemAvailability: (itemId: string) => void;
  updateItemPrice: (itemId: string, newPrice: number) => void;
  addMenuItem: (item: MenuItem) => void;
  updateMenuItem: (item: MenuItem) => void;
  removeMenuItem: (itemId: string) => void;
  reloadMenu: () => Promise<void>;

  // Table Management Actions
  createTable: (id: string, capacity: number) => boolean;
  updateTable: (id: string, updates: { capacity?: number; peopleCount?: number; isActive?: boolean; id?: string }) => boolean;
  toggleTableActive: (id: string) => void;

  // Comanda states and actions
  activeComanda: DbComanda | null;
  activeComandaParticipants: DbComandaParticipante[];
  abrirComandaIndividual: (customerName: string) => Promise<DbComanda | null>;
  criarComandaCompartilhada: (customerName: string) => Promise<DbComanda | null>;
  entrarComandaCompartilhada: (customerName: string) => Promise<DbComanda | null>;
  adicionarParticipante: (name: string) => Promise<void>;
  removerParticipante: (name: string) => Promise<void>;
  carregarComandaAtivaMesa: () => Promise<void>;
  isOnline: boolean;
}

export interface PagamentoCaixaInput {
  tableId: string;
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
  fecharConta: boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export const THEME_COLOR_MAPS: Record<string, { bg: string; text: string; primary: string; hover: string; border: string }> = {
  red: { primary: 'bg-red-600', hover: 'hover:bg-red-700', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  emerald: { primary: 'bg-emerald-600', hover: 'hover:bg-emerald-700', text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  amber: { primary: 'bg-amber-600', hover: 'hover:bg-amber-700', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  zinc: { primary: 'bg-zinc-900', hover: 'hover:bg-zinc-800', text: 'text-zinc-900', bg: 'bg-zinc-100', border: 'border-zinc-300' },
  custom: { primary: 'bg-brand-primary', hover: 'hover:bg-brand-hover', text: 'text-brand-text', bg: 'bg-brand-bg', border: 'border-brand-border' },
};

function menuItemToProdutoInput(
  item: MenuItem,
  unidadeId: string,
  categoriaIdBySlug: Record<string, string>
): ProdutoInput {
  return {
    unidade_id: unidadeId,
    categoria_id: categoriaIdBySlug[item.category] ?? null,
    nome: item.name,
    descricao: item.description ?? null,
    preco: item.price,
    preco_original: item.originalPrice ?? null,
    imagem_url: item.image ?? null,
    disponivel: item.isAvailable,
    tempo_estimado_min: item.estimatedTimeMin ?? 15,
    tags: item.tags ?? [],
    em_destaque: !!item.isFeatured,
    em_promocao: !!item.isPromo,
    estoque: item.stock ?? 0,
    exibir_no_cardapio: item.showInMenu ?? true,
    ordem_exibicao: item.displayOrder ?? 0,
  };
}

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();

  // ---- IDIOMA ----
  const [language, setLanguage] = useState<LanguageType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('menumesa_language');
      if (saved === 'en' || saved === 'es' || saved === 'pt') return saved as LanguageType;
    }
    return 'pt';
  });
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('menumesa_language', language);
  }, [language]);
  const t = (key: string): string => {
    const dict = translations[language];
    return (dict as any)[key] || (translations['pt'] as any)[key] || key;
  };

  // ---- TENANT (marca/unidade) ----
  const [tenant, setTenant] = useState<UnidadeTenant | null>(null);
  const unidadeId = tenant?.unidadeId ?? null;
  const unidadeIdRef = useRef<string | null>(null);
  useEffect(() => { unidadeIdRef.current = unidadeId; }, [unidadeId]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (auth.loading) return;
      if (auth.unidadeId) {
        const info = await resolveUnidadeById(auth.unidadeId);
        if (active) {
          setTenant(
            info ?? {
              unidadeId: auth.unidadeId,
              unidadeNome: '',
              unidadeSlug: '',
              restauranteId: auth.restauranteId || '',
              corTema: 'red',
              taxaServicoPadrao: 10,
            }
          );
        }
      } else if (!auth.session) {
        const slug = getUnidadeSlugFromUrl();
        const info = slug ? await resolveUnidadeBySlug(slug) : null;
        if (active) setTenant(info);
      }
    })();
    return () => { active = false; };
  }, [auth.loading, auth.session, auth.unidadeId, auth.restauranteId]);

  // ---- TEMA ----
  const [themeColor, setThemeColor] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('menumesa_theme_color') || 'red';
    return 'red';
  });
  const [customColor, setCustomColor] = useState<string>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('menumesa_custom_color') || '#4f46e5';
    return '#4f46e5';
  });
  useEffect(() => {
    // Se a marca define uma cor e o usuário não escolheu manualmente, aplica a da marca.
    if (tenant?.corTema && typeof window !== 'undefined' && !localStorage.getItem('menumesa_theme_color')) {
      setThemeColor(tenant.corTema);
    }
  }, [tenant]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('menumesa_theme_color', themeColor);
      localStorage.setItem('menumesa_custom_color', customColor);
      const presetHexes: Record<string, string> = { red: '#dc2626', emerald: '#059669', amber: '#d97706', zinc: '#18181b' };
      const currentHex = themeColor === 'custom' ? customColor : (presetHexes[themeColor] || '#dc2626');
      document.documentElement.style.setProperty('--brand-primary', currentHex);
    }
  }, [themeColor, customColor]);

  // ---- ESTADO DE DADOS ----
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuAddons, setMenuAddons] = useState<MenuAddon[]>([]);
  const [menuLoading, setMenuLoading] = useState<boolean>(true);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [mesasConfig, setMesasConfig] = useState<MesaConfig[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [calls, setCalls] = useState<WaiterCall[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tables, setTables] = useState<TableState[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  const [activeTable, setActiveTable] = useState<string>(() => getTableNumberFromUrl() || '01');

  const categoriaIdBySlug = React.useMemo(() => {
    const map: Record<string, string> = {};
    categorias.forEach((c) => { map[c.slug] = c.id; });
    return map;
  }, [categorias]);

  // Mapas número<->uuid da mesa (ref para uso em handlers/realtime).
  const mesaMapsRef = useRef<{ numeroByMesaId: Record<string, string>; mesaIdByNumero: Record<string, string> }>({
    numeroByMesaId: {}, mesaIdByNumero: {},
  });
  useEffect(() => {
    const numeroByMesaId: Record<string, string> = {};
    const mesaIdByNumero: Record<string, string> = {};
    mesasConfig.forEach((m) => { numeroByMesaId[m.mesaId] = m.id; mesaIdByNumero[m.id] = m.mesaId; });
    mesaMapsRef.current = { numeroByMesaId, mesaIdByNumero };
  }, [mesasConfig]);

  const ordersRef = useRef(orders);
  useEffect(() => { ordersRef.current = orders; }, [orders]);

  // ---- LOADERS ----
  const reloadMenu = useCallback(async () => {
    const uid = unidadeIdRef.current;
    if (!uid) return;
    const menu = await fetchFullMenu(uid);
    setMenuItems(menu.items);
    setMenuAddons(menu.addons);
    setCategorias(menu.categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name })));
    setMenuLoading(false);
  }, []);

  const reloadMesas = useCallback(async () => {
    const uid = unidadeIdRef.current;
    if (!uid) return;
    const mesas = await fetchMesas(uid);
    setMesasConfig((prev) =>
      mesas.map((m) => {
        const existing = prev.find((p) => p.mesaId === m.id);
        return {
          id: m.numero,
          mesaId: m.id,
          capacity: m.capacidade,
          isActive: m.ativa,
          peopleCount: m.quantidade_pessoas,
          openedAt: existing?.openedAt,
        };
      })
    );
  }, []);

  const reloadOrders = useCallback(async () => {
    const uid = unidadeIdRef.current;
    if (!uid) return;
    const pedidos = await fetchOrdersWithItems(uid);
    setOrders(pedidos.map((p) => mapPedidoToOrder(p.pedido, p.items, mesaMapsRef.current.numeroByMesaId)));
  }, []);

  const reloadCalls = useCallback(async () => {
    const uid = unidadeIdRef.current;
    if (!uid) return;
    const chamados = await fetchCalls(uid);
    setCalls(chamados.map((c) => mapChamadoToCall(c, mesaMapsRef.current.numeroByMesaId)));
  }, []);

  // Carga inicial (e sempre que a unidade mudar)
  useEffect(() => {
    if (!unidadeId) return;
    let active = true;
    (async () => {
      setMenuLoading(true);
      const [menu, mesas] = await Promise.all([fetchFullMenu(unidadeId), fetchMesas(unidadeId)]);
      if (!active) return;
      setMenuItems(menu.items);
      setMenuAddons(menu.addons);
      setCategorias(menu.categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name })));
      setMenuLoading(false);

      setMesasConfig(mesas.map((m) => ({
        id: m.numero, mesaId: m.id, capacity: m.capacidade, isActive: m.ativa, peopleCount: m.quantidade_pessoas,
      })));

      const numeroByMesaId: Record<string, string> = {};
      mesas.forEach((m) => { numeroByMesaId[m.id] = m.numero; });

      const [pedidos, chamados] = await Promise.all([fetchOrdersWithItems(unidadeId), fetchCalls(unidadeId)]);
      if (!active) return;
      setOrders(pedidos.map((p) => mapPedidoToOrder(p.pedido, p.items, numeroByMesaId)));
      setCalls(chamados.map((c) => mapChamadoToCall(c, numeroByMesaId)));
    })();
    return () => { active = false; };
  }, [unidadeId]);

  // ---- REALTIME ----
  useEffect(() => {
    if (!unidadeId) return;
    const channel = supabase
      .channel(`gastronomico-${unidadeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: TB.pedidos, filter: `unidade_id=eq.${unidadeId}` }, () => { reloadOrders(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: TB.pedidoItens }, () => { reloadOrders(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: TB.chamados, filter: `unidade_id=eq.${unidadeId}` }, () => { reloadCalls(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: TB.mesas, filter: `unidade_id=eq.${unidadeId}` }, () => { reloadMesas(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: TB.comandas, filter: `unidade_id=eq.${unidadeId}` }, () => { carregarComandaAtivaMesa(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unidadeId, reloadOrders, reloadCalls, reloadMesas]);

  // ---- ONLINE/OFFLINE + SYNC ----
  const syncOfflineData = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    const uid = unidadeIdRef.current;
    if (!uid) return;

    try {
      const unsyncedOrders = await getUnsyncedOrders();
      const unsyncedCalls = await getUnsyncedCalls();
      if (unsyncedOrders.length === 0 && unsyncedCalls.length === 0) return;

      for (const uOrder of unsyncedOrders) {
        try {
          const mesaId = mesaMapsRef.current.mesaIdByNumero[uOrder.table_id] || null;
          const dbOrder = await apiCreateOrder({
            unidadeId: uid,
            mesaId,
            comandaId: uOrder.comanda_id,
            total: uOrder.total,
            items: uOrder.items.map((item) => ({
              produtoId: item.product_id,
              nome: item.name,
              preco: item.price,
              quantidade: item.quantity,
              extras: item.extras,
              observacao: item.observation,
              nomeCliente: item.customer_name,
            })),
          });
          if (dbOrder) {
            await deleteUnsyncedOrder(uOrder.id);
            if (uOrder.comanda_id) {
              const total = ordersRef.current
                .filter((o) => o.tableId === uOrder.table_id && !o.isPaid)
                .reduce((sum, o) => sum + o.total, 0) + uOrder.total;
              await updateComandaTotal(uOrder.comanda_id, total);
            }
          }
        } catch (err) {
          console.error('[IndexedDB] Erro ao sincronizar pedido offline:', err);
        }
      }

      for (const uCall of unsyncedCalls) {
        try {
          const mesaId = mesaMapsRef.current.mesaIdByNumero[uCall.tableId];
          if (!mesaId) continue;
          const dbCall = await apiCreateCall(uid, mesaId, uCall.reason as WaiterCallReason, uCall.customNote);
          if (dbCall) await deleteUnsyncedCall(uCall.id);
        } catch (err) {
          console.error('[IndexedDB] Erro ao sincronizar chamado offline:', err);
        }
      }

      await reloadOrders();
      await reloadCalls();
    } catch (err) {
      console.error('[IndexedDB] Erro na sincronização offline:', err);
    }
  }, [reloadOrders, reloadCalls]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => { setIsOnline(true); carregarComandaAtivaMesa(); syncOfflineData(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncOfflineData]);

  // ---- COMANDA ----
  const [activeComanda, setActiveComanda] = useState<DbComanda | null>(null);
  const [activeComandaParticipants, setActiveComandaParticipants] = useState<DbComandaParticipante[]>([]);

  const carregarComandaAtivaMesa = useCallback(async () => {
    const uid = unidadeIdRef.current;
    const mesaId = mesaMapsRef.current.mesaIdByNumero[activeTable];
    if (!uid || !mesaId) { setActiveComanda(null); setActiveComandaParticipants([]); return; }
    const comanda = await fetchActiveTableComanda(uid, mesaId);
    if (comanda) {
      setActiveComanda(comanda);
      setActiveComandaParticipants(await fetchTabParticipants(comanda.id));
    } else {
      setActiveComanda(null);
      setActiveComandaParticipants([]);
    }
  }, [activeTable]);

  useEffect(() => { carregarComandaAtivaMesa(); }, [carregarComandaAtivaMesa, mesasConfig]);

  const abrirNovaComanda = async (customerName: string): Promise<DbComanda | null> => {
    const uid = unidadeIdRef.current;
    const mesaId = mesaMapsRef.current.mesaIdByNumero[activeTable];
    if (!uid || !mesaId) return null;
    const comanda = await createComanda(uid, mesaId, customerName);
    if (comanda) {
      setActiveComanda(comanda);
      setActiveComandaParticipants(await fetchTabParticipants(comanda.id));
      await apiUpdateMesa(mesaId, { quantidade_pessoas: Math.max(1, mesasConfig.find((m) => m.id === activeTable)?.peopleCount || 1), status: 'ocupada' });
    }
    return comanda;
  };

  const abrirComandaIndividual = (customerName: string) => abrirNovaComanda(customerName);
  const criarComandaCompartilhada = (customerName: string) => abrirNovaComanda(customerName);

  const entrarComandaCompartilhada = async (customerName: string): Promise<DbComanda | null> => {
    const uid = unidadeIdRef.current;
    const mesaId = mesaMapsRef.current.mesaIdByNumero[activeTable];
    if (!uid || !mesaId) return null;
    let comanda = await fetchActiveTableComanda(uid, mesaId);
    if (!comanda) {
      comanda = await createComanda(uid, mesaId, customerName);
    } else {
      await addParticipantToComanda(comanda.id, customerName);
    }
    if (comanda) {
      setActiveComanda(comanda);
      setActiveComandaParticipants(await fetchTabParticipants(comanda.id));
    }
    return comanda;
  };

  const adicionarParticipante = async (name: string) => {
    if (!activeComanda) return;
    await addParticipantToComanda(activeComanda.id, name);
    setActiveComandaParticipants(await fetchTabParticipants(activeComanda.id));
  };

  const removerParticipante = async (name: string) => {
    if (!activeComanda) return;
    await removeParticipantFromComanda(activeComanda.id, name);
    setActiveComandaParticipants(await fetchTabParticipants(activeComanda.id));
  };

  // ---- TABELA DERIVADA (TableState) ----
  useEffect(() => {
    const calculated: TableState[] = mesasConfig.map((t) => {
      const tableId = t.id;
      const tableOrders = orders.filter((o) => o.tableId === tableId && !o.isPaid);
      const currentBill = tableOrders.reduce((sum, order) => sum + order.total, 0);
      const activeOrdersCount = tableOrders.filter((o) => o.status !== 'delivered').length;

      const tableCalls = calls.filter((c) => c.tableId === tableId && c.status === 'pending');
      const activeCalls = tableCalls.map((c) => {
        switch (c.reason) {
          case 'payment': return 'Conta / Pagamento';
          case 'assistance': return 'Auxílio Geral';
          case 'utensils': return 'Talheres';
          case 'drinks': return 'Bebidas';
          case 'cleaning': return 'Limpeza';
          case 'problem': return 'Problema';
          case 'waiter': return 'Chamar Garçom';
          default: return c.customNote || 'Atendimento';
        }
      });

      const hasPendingPaymentCall = tableCalls.some((c) => c.reason === 'payment');
      const hasPendingAssistanceCall = tableCalls.some((c) => c.reason !== 'payment');
      const hasPreparingOrders = tableOrders.some((o) => o.status === 'pending' || o.status === 'preparing');

      let status: TableStatus = 'livre';
      if (hasPendingAssistanceCall) status = 'precisa de atendimento';
      else if (hasPendingPaymentCall) status = 'aguardando pagamento';
      else if (hasPreparingOrders) status = 'pedido em preparo';
      else if (currentBill > 0 || t.peopleCount > 0) {
        status = (t.peopleCount > 0 && tableOrders.length === 0) ? 'aguardando pedido' : 'ocupada';
      }

      const oldestOrderTime = tableOrders.length > 0
        ? tableOrders.map((o) => new Date(o.createdAt).getTime()).sort((a, b) => a - b)[0]
        : undefined;
      let openedAt = t.openedAt;
      if (!openedAt && (t.peopleCount > 0 || oldestOrderTime)) {
        openedAt = oldestOrderTime ? new Date(oldestOrderTime).toISOString() : new Date().toISOString();
      } else if (t.peopleCount === 0 && tableOrders.length === 0) {
        openedAt = undefined;
      }

      return {
        id: tableId, status, currentBill, activeOrdersCount, peopleCount: t.peopleCount,
        openedAt, activeCalls, isActive: t.isActive, capacity: t.capacity,
      };
    });
    setTables(calculated);
  }, [mesasConfig, orders, calls]);

  // ---- CARRINHO ----
  const addToCart = (item: MenuItem, quantity: number, extras: { name: string; price: number }[], observation?: string, customerName?: string) => {
    setCart((prev) => {
      const extrasIdString = extras.map((e) => e.name).sort().join(',');
      const cartItemId = `${item.id}-${extrasIdString}-${observation || ''}-${customerName || 'SemNome'}`;
      const existingIndex = prev.findIndex((ci) => ci.id === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      return [...prev, { id: cartItemId, menuItem: item, quantity, extras, observation, customerName }];
    });
  };
  const removeFromCart = (cartItemId: string) => setCart((prev) => prev.filter((item) => item.id !== cartItemId));
  const updateCartQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(cartItemId); return; }
    setCart((prev) => prev.map((item) => item.id === cartItemId ? { ...item, quantity } : item));
  };
  const clearCart = () => setCart([]);

  // ---- PEDIDOS ----
  const placeOrder = async (comandaId?: string) => {
    if (cart.length === 0) return;
    const uid = unidadeIdRef.current;
    const mesaId = mesaMapsRef.current.mesaIdByNumero[activeTable] || null;

    const orderItems: OrderItem[] = cart.map((item) => ({
      menuItemId: item.menuItem.id,
      name: item.menuItem.name,
      price: item.menuItem.price,
      quantity: item.quantity,
      extras: item.extras,
      observation: item.observation,
      customerName: item.customerName,
    }));
    const total = cart.reduce((sum, item) => {
      const extrasTotal = item.extras.reduce((s, e) => s + e.price, 0);
      return sum + (item.menuItem.price + extrasTotal) * item.quantity;
    }, 0);

    const activeComId = comandaId || activeComanda?.id || null;
    const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
    let dbOrder = null;

    if (!isOffline && uid) {
      dbOrder = await apiCreateOrder({
        unidadeId: uid,
        mesaId,
        comandaId: activeComId,
        total,
        items: cart.map((item) => ({
          produtoId: item.menuItem.id,
          nome: item.menuItem.name,
          preco: item.menuItem.price,
          quantidade: item.quantity,
          extras: item.extras,
          observacao: item.observation,
          nomeCliente: item.customerName || 'Cliente',
        })),
      });
    }

    const isPendingSync = isOffline || !dbOrder;
    const localId = `PED-local-${Math.floor(100000 + Math.random() * 900000)}`;
    const finalId = dbOrder ? dbOrder.id : localId;

    const newOrder: Order = {
      id: finalId, tableId: activeTable, items: orderItems, status: 'pending',
      createdAt: new Date().toISOString(), total, isPaid: false,
      isUnsynced: isPendingSync ? true : undefined,
    };
    setOrders((prev) => [newOrder, ...prev]);

    if (isPendingSync) {
      await saveUnsyncedOrder({
        id: localId, table_id: activeTable, comanda_id: activeComId, total,
        items: cart.map((item) => ({
          product_id: item.menuItem.id, name: item.menuItem.name, price: item.menuItem.price,
          quantity: item.quantity, extras: item.extras, observation: item.observation,
          customer_name: item.customerName || 'Cliente',
        })),
        createdAt: new Date().toISOString(),
      });
    } else {
      if (activeComId) {
        const total2 = ordersRef.current.filter((o) => o.tableId === activeTable && !o.isPaid)
          .reduce((sum, o) => sum + o.total, 0) + total;
        await updateComandaTotal(activeComId, total2);
        if (activeComanda && activeComanda.id === activeComId) {
          setActiveComanda((prev) => prev ? { ...prev, valor_total: total2 } : null);
        }
      }
      reloadOrders();
    }
    clearCart();
  };

  const addOrder = (order: Order) => setOrders((prev) => [order, ...prev]);

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    await apiUpdateOrderStatus(orderId, status);
    setOrders((prev) => prev.map((order) => order.id === orderId ? { ...order, status } : order));
  };

  const payAllOrdersOfTable = async (tableId: string) => {
    const uid = unidadeIdRef.current;
    const mesaId = mesaMapsRef.current.mesaIdByNumero[tableId];
    if (uid && mesaId) {
      await pagarPedidosDaMesa(uid, mesaId);
      const actCom = await fetchActiveTableComanda(uid, mesaId);
      if (actCom) await fecharComandaPaga(actCom.id);
    }
    if (activeComanda && mesaId && activeComanda.mesa_id === mesaId) {
      setActiveComanda(null);
      setActiveComandaParticipants([]);
    }
    setOrders((prev) => prev.map((order) => order.tableId === tableId ? { ...order, isPaid: true, status: 'delivered' } : order));
    setCalls((prev) => prev.map((call) => call.tableId === tableId && call.status === 'pending' ? { ...call, status: 'resolved' as const } : call));
  };

  // ---- CHAMADOS ----
  const submitCallWaiter = async (reason: WaiterCallReason, customNote?: string) => {
    const uid = unidadeIdRef.current;
    const mesaId = mesaMapsRef.current.mesaIdByNumero[activeTable];
    const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
    let dbCall = null;

    if (!isOffline && uid && mesaId) {
      dbCall = await apiCreateCall(uid, mesaId, reason, customNote);
    }
    const isPendingSync = isOffline || !dbCall;
    const localId = `CALL-local-${Math.floor(10000 + Math.random() * 90000)}`;
    const callId = dbCall ? dbCall.id : localId;

    const newCall: WaiterCall = {
      id: callId, tableId: activeTable, reason, customNote, status: 'pending',
      createdAt: new Date().toISOString(), isUnsynced: isPendingSync ? true : undefined,
    };

    if (isPendingSync) {
      await saveUnsyncedCall({ id: localId, tableId: activeTable, reason, customNote, createdAt: new Date().toISOString() });
    }

    setCalls((prev) => {
      const isDuplicate = prev.some((c) => c.tableId === activeTable && c.reason === reason && c.status === 'pending');
      if (isDuplicate) return prev;
      return [newCall, ...prev];
    });
  };

  const resolveCallWaiter = async (callId: string) => {
    await apiResolveCall(callId);
    setCalls((prev) => prev.map((call) => call.id === callId ? { ...call, status: 'resolved' } : call));
  };

  // ---- CAIXA (pagamento) ----
  const registrarPagamentoCaixa = async (dados: PagamentoCaixaInput) => {
    const uid = unidadeIdRef.current;
    if (!uid) return;
    const mesaId = mesaMapsRef.current.mesaIdByNumero[dados.tableId] || null;
    let comandaId: string | null = null;
    if (mesaId) {
      const comanda = await fetchActiveTableComanda(uid, mesaId);
      comandaId = comanda?.id ?? null;
    }

    await registrarPagamento({
      unidadeId: uid,
      mesaId,
      comandaId,
      usuarioId: auth.profile?.id ?? null,
      subtotal: dados.subtotal,
      taxaServico: dados.taxaServico,
      taxaServicoPercentual: dados.taxaServicoPercentual,
      desconto: dados.desconto,
      valorTotal: dados.valorTotal,
      formaPagamento: dados.formaPagamento,
      valorRecebido: dados.valorRecebido,
      troco: dados.troco,
      quantidadePessoas: dados.quantidadePessoas,
      tipo: dados.tipo,
      nomePagador: dados.nomePagador ?? null,
    });

    if (dados.fecharConta && mesaId) {
      await pagarPedidosDaMesa(uid, mesaId);
      if (comandaId) await fecharComandaPaga(comandaId);
      reloadOrders();
    }
  };

  // ---- CONFIG / MENU ----
  const changeActiveTable = (tableId: string) => setActiveTable(String(tableId).padStart(2, '0'));

  const toggleItemAvailability = (itemId: string) => {
    const item = menuItems.find((m) => m.id === itemId);
    const novo = item ? !item.isAvailable : true;
    setMenuItems((prev) => prev.map((m) => m.id === itemId ? { ...m, isAvailable: novo } : m));
    alternarDisponibilidade(itemId, novo);
  };

  const updateItemPrice = (itemId: string, newPrice: number) => {
    setMenuItems((prev) => prev.map((m) => m.id === itemId ? { ...m, price: newPrice } : m));
    atualizarPreco(itemId, newPrice);
  };

  const addMenuItem = (item: MenuItem) => {
    const uid = unidadeIdRef.current;
    if (!uid) return;
    setMenuItems((prev) => [...prev, item]); // otimista
    (async () => {
      await criarProduto(menuItemToProdutoInput(item, uid, categoriaIdBySlug));
      await reloadMenu(); // reconcilia com o id/canônico do banco
    })();
  };

  const updateMenuItem = (item: MenuItem) => {
    const uid = unidadeIdRef.current;
    setMenuItems((prev) => prev.map((m) => m.id === item.id ? item : m));
    if (uid) atualizarProduto(item.id, menuItemToProdutoInput(item, uid, categoriaIdBySlug));
  };

  const removeMenuItem = (itemId: string) => {
    setMenuItems((prev) => prev.filter((m) => m.id !== itemId));
    removerProduto(itemId);
  };

  // ---- MESAS (CRUD) ----
  const createTable = (id: string, capacity: number): boolean => {
    const formattedId = String(id).padStart(2, '0');
    if (mesasConfig.some((t) => t.id === formattedId)) return false;
    const uid = unidadeIdRef.current;
    if (!uid) return false;
    (async () => {
      const mesa = await createMesa(uid, formattedId, capacity);
      if (mesa) {
        setMesasConfig((prev) => [...prev, { id: mesa.numero, mesaId: mesa.id, capacity: mesa.capacidade, isActive: mesa.ativa, peopleCount: mesa.quantidade_pessoas }]);
      }
    })();
    return true;
  };

  const updateTable = (id: string, updates: { capacity?: number; peopleCount?: number; isActive?: boolean; id?: string }): boolean => {
    const target = mesasConfig.find((t) => t.id === id);
    if (!target) return false;
    if (updates.id && updates.id !== id) {
      const formattedNewId = String(updates.id).padStart(2, '0');
      if (mesasConfig.some((t) => t.id === formattedNewId)) return false;
    }

    let novoOpenedAt = target.openedAt;
    const novoPeople = updates.peopleCount !== undefined ? updates.peopleCount : target.peopleCount;
    if (target.peopleCount === 0 && novoPeople > 0) novoOpenedAt = new Date().toISOString();
    else if (novoPeople === 0) novoOpenedAt = undefined;

    const formattedNewId = updates.id ? String(updates.id).padStart(2, '0') : id;
    setMesasConfig((prev) => prev.map((t) => t.id === id ? {
      ...t,
      id: formattedNewId,
      capacity: updates.capacity !== undefined ? updates.capacity : t.capacity,
      isActive: updates.isActive !== undefined ? updates.isActive : t.isActive,
      peopleCount: novoPeople,
      openedAt: novoOpenedAt,
    } : t));

    apiUpdateMesa(target.mesaId, {
      ...(updates.capacity !== undefined ? { capacidade: updates.capacity } : {}),
      ...(updates.peopleCount !== undefined ? { quantidade_pessoas: updates.peopleCount } : {}),
      ...(updates.isActive !== undefined ? { ativa: updates.isActive } : {}),
      ...(updates.id ? { numero: formattedNewId } : {}),
    });
    return true;
  };

  const toggleTableActive = (id: string) => {
    const target = mesasConfig.find((t) => t.id === id);
    if (!target) return;
    const novo = !target.isActive;
    setMesasConfig((prev) => prev.map((t) => t.id === id ? { ...t, isActive: novo } : t));
    apiUpdateMesa(target.mesaId, { ativa: novo });
  };

  return (
    <RestaurantContext.Provider value={{
      menuItems, menuAddons, menuLoading, activeTable, cart, orders, setOrders, calls, tables,
      themeColor, setThemeColor, customColor, setCustomColor,
      unidadeId, restauranteId: tenant?.restauranteId ?? null,
      taxaServicoPadrao: tenant?.taxaServicoPadrao ?? 10, tenantReady: !!unidadeId,
      language, setLanguage, t,
      addToCart, removeFromCart, updateCartQuantity, clearCart,
      placeOrder, addOrder, updateOrderStatus, payAllOrdersOfTable,
      submitCallWaiter, resolveCallWaiter, registrarPagamentoCaixa,
      changeActiveTable, toggleItemAvailability, updateItemPrice,
      addMenuItem, updateMenuItem, removeMenuItem, reloadMenu,
      createTable, updateTable, toggleTableActive,
      activeComanda, activeComandaParticipants,
      abrirComandaIndividual, criarComandaCompartilhada, entrarComandaCompartilhada,
      adicionarParticipante, removerParticipante, carregarComandaAtivaMesa, isOnline,
    }}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) throw new Error('useRestaurant must be used within a RestaurantProvider');
  return context;
};

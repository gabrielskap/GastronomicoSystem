/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { MenuItem, CartItem, Order, WaiterCall, TableState, OrderStatus, WaiterCallReason, OrderItem, TableStatus } from '../types';
import { INITIAL_MENU_ITEMS } from '../data/menuData';
import { DbComanda, DbTabParticipant } from '../services/api/types';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { fetchOrders, fetchOrderItems, createOrder } from '../services/api/ordersService';
import { fetchCalls, createCall, resolveCall } from '../services/api/callsService';
import { createComanda, fetchActiveTableComanda, fetchTabParticipants, addParticipantToComanda, removeParticipantFromComanda, updateComandaTotal } from '../services/api/comandasService';
import { LanguageType, translations } from '../utils/translations';
import {
  getUnsyncedOrders,
  deleteUnsyncedOrder,
  getUnsyncedCalls,
  deleteUnsyncedCall,
  saveUnsyncedOrder,
  saveUnsyncedCall
} from '../services/indexedDbService';

interface RestaurantContextType {
  menuItems: MenuItem[];
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
  
  // Configuration Actions
  changeActiveTable: (tableId: string) => void;
  toggleItemAvailability: (itemId: string) => void;
  updateItemPrice: (itemId: string, newPrice: number) => void;
  addMenuItem: (item: MenuItem) => void;
  updateMenuItem: (item: MenuItem) => void;
  removeMenuItem: (itemId: string) => void;

  // Table Management Actions
  createTable: (id: string, capacity: number) => boolean;
  updateTable: (id: string, updates: { capacity?: number; peopleCount?: number; isActive?: boolean; id?: string }) => boolean;
  toggleTableActive: (id: string) => void;

  // Comanda states and actions
  activeComanda: DbComanda | null;
  activeComandaParticipants: DbTabParticipant[];
  abrirComandaIndividual: (customerName: string) => Promise<DbComanda>;
  criarComandaCompartilhada: (customerName: string) => Promise<DbComanda>;
  entrarComandaCompartilhada: (customerName: string) => Promise<DbComanda | null>;
  adicionarParticipante: (name: string) => Promise<void>;
  removerParticipante: (name: string) => Promise<void>;
  carregarComandaAtivaMesa: () => Promise<void>;
  isOnline: boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

// Cores premium selecionáveis para simular marca do restaurante (iFood-like vermelho, Notion-like carvão, POS azul moderno, Gourmet dourado-verde)
export const THEME_COLOR_MAPS: Record<string, { bg: string; text: string; primary: string; hover: string; border: string }> = {
  red: {
    primary: 'bg-red-600',
    hover: 'hover:bg-red-700',
    text: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200'
  },
  emerald: {
    primary: 'bg-emerald-600',
    hover: 'hover:bg-emerald-700',
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200'
  },
  amber: {
    primary: 'bg-amber-600',
    hover: 'hover:bg-amber-700',
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200'
  },
  zinc: {
    primary: 'bg-zinc-900',
    hover: 'hover:bg-zinc-800',
    text: 'text-zinc-900',
    bg: 'bg-zinc-100',
    border: 'border-zinc-300'
  },
  custom: {
    primary: 'bg-brand-primary',
    hover: 'hover:bg-brand-hover',
    text: 'text-brand-text',
    bg: 'bg-brand-bg',
    border: 'border-brand-border'
  }
};

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<LanguageType>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('menumesa_language');
      if (saved === 'en' || saved === 'es' || saved === 'pt') {
        return saved as LanguageType;
      }
    }
    return 'pt';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('menumesa_language', language);
    }
  }, [language]);

  const t = (key: string): string => {
    const dict = translations[language];
    return (dict as any)[key] || (translations['pt'] as any)[key] || key;
  };

  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('menumesa_menu_items');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore
        }
      }
    }
    return INITIAL_MENU_ITEMS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('menumesa_menu_items', JSON.stringify(menuItems));
    }
  }, [menuItems]);

  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  const [activeTable, setActiveTable] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tableParam = params.get('table') || params.get('mesa');
      if (tableParam) {
        const num = parseInt(tableParam, 10);
        if (!isNaN(num) && num > 0) {
          return String(num).padStart(2, '0');
        }
        return tableParam;
      }
    }
    return '04'; // Mesa 04 por padrão
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const [themeColor, setThemeColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('menumesa_theme_color');
      return saved || 'red';
    }
    return 'red';
  });

  const [customColor, setCustomColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('menumesa_custom_color');
      return saved || '#4f46e5';
    }
    return '#4f46e5';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('menumesa_theme_color', themeColor);
      localStorage.setItem('menumesa_custom_color', customColor);

      const presetHexes: Record<string, string> = {
        red: '#dc2626',
        emerald: '#059669',
        amber: '#d97706',
        zinc: '#18181b',
      };
      
      const currentHex = themeColor === 'custom' ? customColor : (presetHexes[themeColor] || '#dc2626');
      document.documentElement.style.setProperty('--brand-primary', currentHex);
    }
  }, [themeColor, customColor]);

  // Histórico de pedidos simulados para tornar a visualização do painel incrível de início
  const [orders, setOrders] = useState<Order[]>([
    {
      id: 'PED-4821',
      tableId: '02',
      items: [
        {
          menuItemId: 'burg-1',
          name: 'Crown Smash Double Bacon',
          price: 46.00,
          quantity: 2,
          extras: [{ name: 'Bacon Artesanal Caramelizado', price: 6.00 }]
        },
        {
          menuItemId: 'beb-1',
          name: 'Soda Italiana de Tangerina e Alecrim',
          price: 16.00,
          quantity: 2,
          extras: []
        }
      ],
      status: 'preparing',
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 min atrás
      total: 136.00,
      isPaid: false
    },
    {
      id: 'PED-1290',
      tableId: '08',
      items: [
        {
          menuItemId: 'burg-2',
          name: 'Truffle & Mushroom Burger',
          price: 49.00,
          quantity: 1,
          extras: []
        },
        {
          menuItemId: 'sob-1',
          name: 'Cheesecake Desconstruída de Pistache',
          price: 34.00,
          quantity: 1,
          extras: []
        }
      ],
      status: 'delivered',
      createdAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(), // mais de 1h atrás
      total: 83.00,
      isPaid: false
    },
    {
      id: 'PED-9311',
      tableId: '11',
      items: [
        {
          menuItemId: 'ent-1',
          name: 'Batatas Rústicas com Trufa & Parmesão',
          price: 36.00,
          quantity: 1,
          extras: []
        }
      ],
      status: 'ready',
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min de antecedência
      total: 36.00,
      isPaid: false
    }
  ]);

  // Chamadas de garçom simuladas iniciais
  const [calls, setCalls] = useState<WaiterCall[]>([
    {
      id: 'CALL-1',
      tableId: '09',
      reason: 'payment',
      customNote: 'Deseja pagar com Pix, trazer maquininha.',
      status: 'pending',
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString()
    },
    {
      id: 'CALL-2',
      tableId: '05',
      reason: 'utensils',
      customNote: 'Falta um garfo e prato adicional.',
      status: 'pending',
      createdAt: new Date(Date.now() - 4 * 60 * 1000).toISOString()
    }
  ]);

  // --- OFFLINE PERSISTENCE (IndexedDB) & REFS ---
  const ordersRef = React.useRef(orders);
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  const callsRef = React.useRef(calls);
  useEffect(() => {
    callsRef.current = calls;
  }, [calls]);

  const syncOfflineData = async () => {
    if (typeof window === 'undefined' || !navigator.onLine) return;

    try {
      const unsyncedOrders = await getUnsyncedOrders();
      const unsyncedCalls = await getUnsyncedCalls();

      if (unsyncedOrders.length === 0 && unsyncedCalls.length === 0) {
        return;
      }

      console.log(`[IndexedDB] Sincronizando dados offline: ${unsyncedOrders.length} pedidos, ${unsyncedCalls.length} chamados.`);

      let syncedOrdersCount = 0;
      let syncedCallsCount = 0;

      // Sincroniza Pedidos
      for (const uOrder of unsyncedOrders) {
        try {
          const dbOrder = await createOrder(
            {
              table_id: uOrder.table_id,
              comanda_id: uOrder.comanda_id,
              total: uOrder.total
            },
            uOrder.items.map(item => ({
              product_id: item.product_id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              extras: item.extras,
              observation: item.observation,
              customer_name: item.customer_name
            }))
          );

          if (dbOrder) {
            // Remove do IndexedDB
            await deleteUnsyncedOrder(uOrder.id);
            syncedOrdersCount++;

            // Atualiza o estado dos pedidos substituindo o ID temporário local pelo real e removendo flag de pendência
            setOrders(prev => prev.map(o => {
              if (o.id === uOrder.id) {
                return {
                  ...o,
                  id: dbOrder.id,
                  isUnsynced: false
                };
              }
              return o;
            }));

            // Atualiza o total da comanda se houver
            if (uOrder.comanda_id) {
              const currentActiveTotal = ordersRef.current
                .filter(o => o.tableId === uOrder.table_id && !o.isPaid)
                .reduce((sum, o) => sum + o.total, 0) + uOrder.total;
              await updateComandaTotal(uOrder.comanda_id, currentActiveTotal);
            }
          }
        } catch (orderErr) {
          console.error(`[IndexedDB] Erro ao sincronizar pedido offline ${uOrder.id}:`, orderErr);
        }
      }

      // Sincroniza Chamados
      for (const uCall of unsyncedCalls) {
        try {
          const dbCall = await createCall(
            uCall.tableId,
            uCall.reason as any,
            uCall.customNote
          );

          if (dbCall) {
            await deleteUnsyncedCall(uCall.id);
            syncedCallsCount++;

            setCalls(prev => prev.map(c => {
              if (c.id === uCall.id) {
                return {
                  ...c,
                  id: dbCall.id,
                  isUnsynced: false
                };
              }
              return c;
            }));
          }
        } catch (callErr) {
          console.error(`[IndexedDB] Erro ao sincronizar chamado offline ${uCall.id}:`, callErr);
        }
      }

      if (syncedOrdersCount > 0 || syncedCallsCount > 0) {
        // Exibe feedback de sucesso de sincronização
        const snack = document.createElement('div');
        snack.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-xl z-50 text-xs font-black font-sans tracking-wide border border-emerald-500 animate-bounce text-center max-w-sm';
        snack.innerHTML = `<span>✨ Conexão reestabelecida! ${
          syncedOrdersCount > 0 ? `${syncedOrdersCount} pedido(s)` : ''
        }${
          syncedOrdersCount > 0 && syncedCallsCount > 0 ? ' e ' : ''
        }${
          syncedCallsCount > 0 ? `${syncedCallsCount} chamado(s)` : ''
        } sincronizado(s) com sucesso.</span>`;
        document.body.appendChild(snack);
        setTimeout(() => snack.remove(), 5000);
      }
    } catch (syncErr) {
      console.error('[IndexedDB] Erro na sincronização de dados offline:', syncErr);
    }
  };

  // Carrega itens pendentes do IndexedDB na inicialização
  useEffect(() => {
    const loadUnsyncedFromIndexedDB = async () => {
      try {
        const localUnsyncedOrders = await getUnsyncedOrders();
        const localUnsyncedCalls = await getUnsyncedCalls();

        if (localUnsyncedOrders.length > 0) {
          const formattedOrders: Order[] = localUnsyncedOrders.map(uo => ({
            id: uo.id,
            tableId: uo.table_id,
            items: uo.items.map(item => ({
              menuItemId: item.product_id || '',
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              extras: item.extras,
              observation: item.observation,
              customerName: item.customer_name
            })),
            status: 'pending',
            createdAt: uo.createdAt,
            total: uo.total,
            isPaid: false,
            isUnsynced: true
          }));

          setOrders(prev => {
            const unique = [...prev];
            formattedOrders.forEach(fo => {
              if (!unique.some(o => o.id === fo.id)) {
                unique.unshift(fo);
              }
            });
            return unique;
          });
        }

        if (localUnsyncedCalls.length > 0) {
          const formattedCalls: WaiterCall[] = localUnsyncedCalls.map(uc => ({
            id: uc.id,
            tableId: uc.tableId,
            reason: uc.reason as any,
            customNote: uc.customNote,
            status: 'pending',
            createdAt: uc.createdAt,
            isUnsynced: true
          }));

          setCalls(prev => {
            const unique = [...prev];
            formattedCalls.forEach(fc => {
              if (!unique.some(c => c.id === fc.id)) {
                unique.unshift(fc);
              }
            });
            return unique;
          });
        }

        if (typeof navigator !== 'undefined' && navigator.onLine) {
          setTimeout(() => {
            syncOfflineData();
          }, 1500); // pequeno delay para aguardar carregamento completo
        }
      } catch (err) {
        console.error('[IndexedDB] Erro ao carregar itens offline:', err);
      }
    };

    loadUnsyncedFromIndexedDB();
  }, []);

  // Monitora transições online/offline
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => {
      setIsOnline(true);
      carregarComandaAtivaMesa();
      syncOfflineData();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // --- COMANDA STATES & SYNC ---
  const [activeComanda, setActiveComanda] = useState<DbComanda | null>(null);
  const [activeComandaParticipants, setActiveComandaParticipants] = useState<DbTabParticipant[]>([]);

  const carregarComandaAtivaMesa = async () => {
    const comanda = await fetchActiveTableComanda(activeTable);
    if (comanda) {
      setActiveComanda(comanda);
      const parts = await fetchTabParticipants(comanda.id);
      setActiveComandaParticipants(parts);
    } else {
      setActiveComanda(null);
      setActiveComandaParticipants([]);
    }
  };

  useEffect(() => {
    carregarComandaAtivaMesa();
  }, [activeTable]);

  // Carrega dados iniciais do Supabase
  useEffect(() => {
    const loadRealData = async () => {
      if (isSupabaseConfigured) {
        try {
          const dbOrders = await fetchOrders();
          const mappedOrders = await Promise.all(
            dbOrders.map(async (o) => {
              const items = await fetchOrderItems(o.id);
              return {
                id: o.id,
                tableId: o.table_id,
                status: o.status as OrderStatus,
                createdAt: o.created_at,
                total: o.total,
                isPaid: o.is_paid,
                items: items.map(item => ({
                  menuItemId: item.product_id,
                  name: item.name,
                  price: item.price,
                  quantity: item.quantity,
                  extras: item.extras || [],
                  observation: item.observation,
                  customerName: item.customer_name
                }))
              };
            })
          );
          setOrders(mappedOrders);

          const dbCalls = await fetchCalls();
          setCalls(dbCalls.map(c => ({
            id: c.id,
            tableId: c.table_id,
            reason: c.reason,
            customNote: c.custom_note,
            status: c.status,
            createdAt: c.created_at
          })));
        } catch (err) {
          console.error("Erro ao carregar dados do Supabase:", err);
        }
      }
    };
    loadRealData();
  }, []);

  // --- COMANDA IMPLEMENTATIONS ---
  const abrirComandaIndividual = async (customerName: string): Promise<DbComanda> => {
    const comanda = await createComanda(activeTable, customerName);
    setActiveComanda(comanda);
    const parts = await fetchTabParticipants(comanda.id);
    setActiveComandaParticipants(parts);
    
    // Atualiza mesasConfig para marcar a mesa como ocupada se localmente
    setTablesConfig(prev => prev.map(t => t.id === activeTable ? { ...t, peopleCount: t.peopleCount || 1, status: 'ocupada' } : t));
    return comanda;
  };

  const criarComandaCompartilhada = async (customerName: string): Promise<DbComanda> => {
    const comanda = await createComanda(activeTable, customerName);
    setActiveComanda(comanda);
    const parts = await fetchTabParticipants(comanda.id);
    setActiveComandaParticipants(parts);

    setTablesConfig(prev => prev.map(t => t.id === activeTable ? { ...t, peopleCount: t.peopleCount || 1, status: 'ocupada' } : t));
    return comanda;
  };

  const entrarComandaCompartilhada = async (customerName: string): Promise<DbComanda | null> => {
    let comanda = await fetchActiveTableComanda(activeTable);
    if (!comanda) {
      comanda = await createComanda(activeTable, customerName);
    } else {
      await addParticipantToComanda(comanda.id, customerName);
    }
    setActiveComanda(comanda);
    const parts = await fetchTabParticipants(comanda.id);
    setActiveComandaParticipants(parts);

    setTablesConfig(prev => prev.map(t => t.id === activeTable && t.peopleCount === 0 ? { ...t, peopleCount: 2, status: 'ocupada' } : t));
    return comanda;
  };

  const adicionarParticipante = async (name: string) => {
    if (!activeComanda) return;
    await addParticipantToComanda(activeComanda.id, name);
    const parts = await fetchTabParticipants(activeComanda.id);
    setActiveComandaParticipants(parts);
  };

  const removerParticipante = async (name: string) => {
    if (!activeComanda) return;
    await removeParticipantFromComanda(activeComanda.id, name);
    const parts = await fetchTabParticipants(activeComanda.id);
    setActiveComandaParticipants(parts);
  };

  // Configuração das mesas (ID, capacidade, se está ativa, pessoas sentadas) com persistência local
  const [tablesConfig, setTablesConfig] = useState<{ id: string; capacity: number; isActive: boolean; peopleCount: number; openedAt?: string }[]>(() => {
    const cached = localStorage.getItem('menumesa_tables_config');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        console.error(e);
      }
    }
    // Inicialização padrão de 12 mesas
    return Array.from({ length: 12 }, (_, i) => {
      const tableId = String(i + 1).padStart(2, '0');
      // Adiciona pessoas sentadas em algumas mesas de forma simulada para ficar realista de início
      const initialPeople = tableId === '02' ? 4 : tableId === '05' ? 2 : tableId === '08' ? 0 : tableId === '09' ? 3 : tableId === '11' ? 2 : 0;
      const initialOpenedAt = initialPeople > 0 ? new Date(Date.now() - (10 * i + 10) * 60 * 1000).toISOString() : undefined;
      return {
        id: tableId,
        capacity: 4,
        isActive: true,
        peopleCount: initialPeople,
        openedAt: initialOpenedAt
      };
    });
  });

  useEffect(() => {
    localStorage.setItem('menumesa_tables_config', JSON.stringify(tablesConfig));
  }, [tablesConfig]);

  // Inicializa o estado das mesas completas (TableState com os 6 status dinâmica)
  const [tables, setTables] = useState<TableState[]>([]);

  useEffect(() => {
    const calculatedTables: TableState[] = tablesConfig.map(t => {
      const tableId = t.id;
      
      // Filtrar pedidos pendentes / ativos deste ID de mesa
      const tableOrders = orders.filter(o => o.tableId === tableId && !o.isPaid);
      const currentBill = tableOrders.reduce((sum, order) => sum + order.total, 0);
      const activeOrdersCount = tableOrders.filter(o => o.status !== 'delivered').length;

      // Chamados de garçom ativos deste ID de mesa
      const tableCalls = calls.filter(c => c.tableId === tableId && c.status === 'pending');
      const activeCalls = tableCalls.map(c => {
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

      const hasPendingPaymentCall = tableCalls.some(c => c.reason === 'payment');
      const hasPendingAssistanceCall = tableCalls.some(c => c.reason !== 'payment');
      
      const hasPreparingOrders = tableOrders.some(o => o.status === 'pending' || o.status === 'preparing');
      const hasReadyOrders = tableOrders.some(o => o.status === 'ready');
      const hasDeliveredOrders = tableOrders.some(o => o.status === 'delivered');

      let status: TableStatus = 'livre';

      if (hasPendingAssistanceCall) {
        status = 'precisa de atendimento';
      } else if (hasPendingPaymentCall) {
        status = 'aguardando pagamento';
      } else if (hasPreparingOrders) {
        status = 'pedido em preparo';
      } else if (currentBill > 0 || t.peopleCount > 0) {
        if (t.peopleCount > 0 && tableOrders.length === 0) {
          status = 'aguardando pedido';
        } else {
          status = 'ocupada';
        }
      } else {
        status = 'livre';
      }

      // Fallback para tempo de abertura se possuir pessoas ou comandas mas não tiver data setada
      let oldestOrderTime = tableOrders.length > 0 
        ? tableOrders.map(o => new Date(o.createdAt).getTime()).sort((a,b)=>a-b)[0]
        : undefined;

      let openedAt = t.openedAt;
      if (!openedAt && (t.peopleCount > 0 || oldestOrderTime)) {
        openedAt = oldestOrderTime ? new Date(oldestOrderTime).toISOString() : new Date().toISOString();
      } else if (t.peopleCount === 0 && tableOrders.length === 0) {
        openedAt = undefined;
      }

      return {
        id: tableId,
        status,
        currentBill,
        activeOrdersCount,
        peopleCount: t.peopleCount,
        openedAt,
        activeCalls,
        isActive: t.isActive,
        capacity: t.capacity
      };
    });

    setTables(calculatedTables);
  }, [tablesConfig, orders, calls]);

  // --- CART OPERATIONS ---
  const addToCart = (item: MenuItem, quantity: number, extras: { name: string; price: number }[], observation?: string, customerName?: string) => {
    setCart(prev => {
      // Cria um ID único combinando id do prato, extras, observação e nome do cliente para diferenciar no carrinho
      const extrasIdString = extras.map(e => e.name).sort().join(',');
      const cartItemId = `${item.id}-${extrasIdString}-${observation || ''}-${customerName || 'SemNome'}`;
      
      const existingIndex = prev.findIndex(ci => ci.id === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        return updated;
      }
      
      return [...prev, {
        id: cartItemId,
        menuItem: item,
        quantity,
        extras,
        observation,
        customerName
      }];
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(prev => prev.filter(item => item.id !== cartItemId));
  };

  const updateCartQuantity = (cartItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCart(prev => prev.map(item => item.id === cartItemId ? { ...item, quantity } : item));
  };

  const clearCart = () => {
    setCart([]);
  };

  // --- ORDER OPERATIONS ---
  const placeOrder = async (comandaId?: string) => {
    if (cart.length === 0) return;

    const orderItems: OrderItem[] = cart.map(item => ({
      menuItemId: item.menuItem.id,
      name: item.menuItem.name,
      price: item.menuItem.price,
      quantity: item.quantity,
      extras: item.extras,
      observation: item.observation,
      customerName: item.customerName
    }));

    const total = cart.reduce((sum, item) => {
      const extrasTotal = item.extras.reduce((s, e) => s + e.price, 0);
      return sum + (item.menuItem.price + extrasTotal) * item.quantity;
    }, 0);

    const activeComId = comandaId || activeComanda?.id || null;
    let finalId = `PED-${Math.floor(1000 + Math.random() * 9000)}`;

    const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
    let dbOrder = null;

    if (!isOffline) {
      dbOrder = await createOrder(
        {
          table_id: activeTable,
          comanda_id: activeComId,
          total: total
        },
        cart.map(item => ({
          product_id: item.menuItem.id,
          name: item.menuItem.name,
          price: item.menuItem.price,
          quantity: item.quantity,
          extras: item.extras,
          observation: item.observation,
          customer_name: item.customerName || 'Cliente'
        }))
      );
    }

    const isPendingSync = isOffline || !dbOrder;
    const localId = `PED-local-${Math.floor(100000 + Math.random() * 900000)}`;

    if (dbOrder) {
      finalId = dbOrder.id;
    } else {
      finalId = localId;
    }

    const newOrder: Order = {
      id: finalId,
      tableId: activeTable,
      items: orderItems,
      status: 'pending',
      createdAt: new Date().toISOString(),
      total,
      isPaid: false,
      isUnsynced: isPendingSync ? true : undefined
    };

    setOrders(prev => [newOrder, ...prev]);

    if (isPendingSync) {
      await saveUnsyncedOrder({
        id: localId,
        table_id: activeTable,
        comanda_id: activeComId,
        total: total,
        items: cart.map(item => ({
          product_id: item.menuItem.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          extras: item.extras,
          observation: item.observation,
          customer_name: item.customerName || 'Cliente'
        })),
        createdAt: new Date().toISOString()
      });

      // Snack notification for offline order
      const snack = document.createElement('div');
      snack.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-amber-600 text-white px-5 py-3.5 rounded-2xl shadow-xl z-50 text-xs font-black font-sans tracking-wide border border-amber-500 animate-bounce text-center';
      snack.innerHTML = `<span>⏳ Pedido salvo offline! Será enviado automaticamente ao conectar.</span>`;
      document.body.appendChild(snack);
      setTimeout(() => snack.remove(), 4000);
    } else {
      // Update comanda total in backend
      if (activeComId) {
        const currentActiveTotal = orders
          .filter(o => o.tableId === activeTable && !o.isPaid)
          .reduce((sum, o) => sum + o.total, 0) + total;
        await updateComandaTotal(activeComId, currentActiveTotal);
        if (activeComanda && activeComanda.id === activeComId) {
          setActiveComanda(prev => prev ? { ...prev, total_amount: currentActiveTotal } : null);
        }
      }
    }

    clearCart();
  };

  const addOrder = (order: Order) => {
    setOrders(prev => [order, ...prev]);
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    if (isSupabaseConfigured) {
      const { updateOrderStatus: updateOrderStatusApi } = await import('../services/api/ordersService');
      await updateOrderStatusApi(orderId, status as any);
    }
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status } : order
    ));
  };

  const payAllOrdersOfTable = async (tableId: string) => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('orders')
          .update({ is_paid: true, status: 'delivered' })
          .eq('table_id', tableId)
          .eq('is_paid', false);
        if (error) throw error;

        // Fecha a comanda ativa dessa mesa no banco de dados
        const actCom = await fetchActiveTableComanda(tableId);
        if (actCom) {
          await supabase
            .from('comandas')
            .update({ status: 'paid', closed_at: new Date().toISOString() })
            .eq('id', actCom.id);
        }
      } catch (err) {
        console.error('Erro no pagamento coletivo via Supabase:', err);
      }
    } else {
      if (activeComanda && activeComanda.table_id === tableId) {
        setActiveComanda(null);
        setActiveComandaParticipants([]);
      }
    }

    setOrders(prev => prev.map(order => 
      order.tableId === tableId ? { ...order, isPaid: true, status: 'delivered' } : order
    ));
    
    // Resolve chamados dessa mesa automaticamente ao pagar
    setCalls(prev => prev.map(call => 
      call.tableId === tableId && call.status === 'pending' ? { ...call, status: 'resolved' as const } : call
    ));
  };

  // --- WAITER CALL OPERATIONS ---
  const submitCallWaiter = async (reason: WaiterCallReason, customNote?: string) => {
    let callId = `CALL-${Math.floor(1000 + Math.random() * 9000)}`;
    const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
    let dbCall = null;

    if (!isOffline && isSupabaseConfigured) {
      dbCall = await createCall(activeTable, reason, customNote);
    }

    const isPendingSync = isOffline || (isSupabaseConfigured && !dbCall);
    const localId = `CALL-local-${Math.floor(10000 + Math.random() * 90000)}`;

    if (dbCall) {
      callId = dbCall.id;
    } else if (isPendingSync) {
      callId = localId;
    }

    const newCall: WaiterCall = {
      id: callId,
      tableId: activeTable,
      reason,
      customNote,
      status: 'pending',
      createdAt: new Date().toISOString(),
      isUnsynced: isPendingSync ? true : undefined
    };

    if (isPendingSync) {
      await saveUnsyncedCall({
        id: localId,
        tableId: activeTable,
        reason,
        customNote,
        createdAt: new Date().toISOString()
      });

      // Snack notification for offline call
      const snack = document.createElement('div');
      snack.className = 'fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-amber-600 text-white px-5 py-3.5 rounded-2xl shadow-xl z-50 text-xs font-black font-sans tracking-wide border border-amber-500 animate-bounce text-center';
      snack.innerHTML = `<span>⏳ Chamado salvo offline! Será enviado automaticamente ao conectar.</span>`;
      document.body.appendChild(snack);
      setTimeout(() => snack.remove(), 4000);
    }

    // Se o garçom for chamado, adicionamos de forma não duplicada se já houver um mesmo motivo aberto
    setCalls(prev => {
      const isDuplicate = prev.some(c => c.tableId === activeTable && c.reason === reason && c.status === 'pending');
      if (isDuplicate) return prev;
      return [newCall, ...prev];
    });
  };

  const resolveCallWaiter = async (callId: string) => {
    if (isSupabaseConfigured) {
      await resolveCall(callId);
    }
    setCalls(prev => prev.map(call => 
      call.id === callId ? { ...call, status: 'resolved' } : call
    ));
  };

  // --- CONFIG VALUES ---
  const changeActiveTable = (tableId: string) => {
    const padded = String(tableId).padStart(2, '0');
    setActiveTable(padded);
  };

  const toggleItemAvailability = (itemId: string) => {
    setMenuItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, isAvailable: !item.isAvailable } : item
    ));
  };

  const updateItemPrice = (itemId: string, newPrice: number) => {
    setMenuItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, price: newPrice } : item
    ));
  };

  const addMenuItem = (item: MenuItem) => {
    setMenuItems(prev => [...prev, item]);
  };

  const updateMenuItem = (item: MenuItem) => {
    setMenuItems(prev => prev.map(m => m.id === item.id ? item : m));
  };

  const removeMenuItem = (itemId: string) => {
    setMenuItems(prev => prev.filter(m => m.id !== itemId));
  };

  // --- TABLE OPERATIONS ---
  const createTable = (id: string, capacity: number): boolean => {
    const formattedId = String(id).padStart(2, '0');
    if (tablesConfig.some(t => t.id === formattedId)) {
      return false; // mesa já existe
    }
    setTablesConfig(prev => [...prev, {
      id: formattedId,
      capacity,
      isActive: true,
      peopleCount: 0
    }]);
    return true;
  };

  const updateTable = (id: string, updates: { capacity?: number; peopleCount?: number; isActive?: boolean; id?: string }): boolean => {
    if (updates.id && updates.id !== id) {
      const formattedNewId = String(updates.id).padStart(2, '0');
      if (tablesConfig.some(t => t.id === formattedNewId)) {
        return false; // conflito de número de mesa
      }
    }

    setTablesConfig(prev => prev.map(t => {
      if (t.id === id) {
        const formattedNewId = updates.id ? String(updates.id).padStart(2, '0') : t.id;
        const newPeopleCount = updates.peopleCount !== undefined ? updates.peopleCount : t.peopleCount;
        
        let newOpenedAt = t.openedAt;
        if (t.peopleCount === 0 && newPeopleCount > 0) {
          newOpenedAt = new Date().toISOString();
        } else if (newPeopleCount === 0) {
          newOpenedAt = undefined;
        }

        return {
          ...t,
          id: formattedNewId,
          capacity: updates.capacity !== undefined ? updates.capacity : t.capacity,
          isActive: updates.isActive !== undefined ? updates.isActive : t.isActive,
          peopleCount: newPeopleCount,
          openedAt: newOpenedAt
        };
      }
      return t;
    }));
    return true;
  };

  const toggleTableActive = (id: string) => {
    setTablesConfig(prev => prev.map(t => 
      t.id === id ? { ...t, isActive: !t.isActive } : t
    ));
  };

  return (
    <RestaurantContext.Provider value={{
      menuItems,
      activeTable,
      cart,
      orders,
      setOrders,
      calls,
      tables,
      themeColor,
      setThemeColor,
      customColor,
      setCustomColor,
      
      language,
      setLanguage,
      t,
      
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      
      placeOrder,
      addOrder,
      updateOrderStatus,
      payAllOrdersOfTable,
      
      submitCallWaiter,
      resolveCallWaiter,
      
      changeActiveTable,
      toggleItemAvailability,
      updateItemPrice,
      addMenuItem,
      updateMenuItem,
      removeMenuItem,

      createTable,
      updateTable,
      toggleTableActive,
      
      // Comanda states and actions
      activeComanda,
      activeComandaParticipants,
      abrirComandaIndividual,
      criarComandaCompartilhada,
      entrarComandaCompartilhada,
      adicionarParticipante,
      removerParticipante,
      carregarComandaAtivaMesa,
      isOnline
    }}>
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurant = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
};

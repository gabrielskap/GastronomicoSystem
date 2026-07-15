/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useRestaurant, THEME_COLOR_MAPS } from '../context/RestaurantContext';
import { MenuItem, CategoryType, WaiterCallReason } from '../types';
import { useApi, fetchFullMenu } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ShoppingBag, 
  Utensils, 
  Bell, 
  FileText, 
  X, 
  Clock, 
  Plus, 
  Minus, 
  Check, 
  ChevronRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Coffee,
  Beer,
  CheckSquare,
  User,
  UserPlus,
  Users,
  QrCode,
  ArrowRight,
  CreditCard,
  Coins,
  Wallet,
  Copy,
  Store,
  Globe
} from 'lucide-react';

export const CustomerView: React.FC = () => {
  const {
    menuItems,
    unidadeId,
    activeTable,
    cart,
    orders,
    calls,
    tables,
    themeColor,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    placeOrder,
    submitCallWaiter,
    changeActiveTable,
    payAllOrdersOfTable,
    activeComanda,
    activeComandaParticipants,
    abrirComandaIndividual,
    criarComandaCompartilhada,
    entrarComandaCompartilhada,
    adicionarParticipante,
    removerParticipante,
    language,
    setLanguage,
    t
  } = useRestaurant();

  const themeColors = THEME_COLOR_MAPS[themeColor] || THEME_COLOR_MAPS.red;

  // Load real menu structure from Supabase (escopado pela unidade do tenant)
  const { data: menuData, loading: menuLoading, error: menuError, refetch: menuRefetch } = useApi(
    () => (unidadeId ? fetchFullMenu(unidadeId) : Promise.resolve({ categories: [], items: [], addons: [] })),
    [unidadeId]
  );

  const itemsToDisplay = useMemo(() => {
    // Sincroniza o cardápio com o estado reativo do contexto (AdminPanel edits de estoque e disponibilidade)
    const baseItems = (menuItems && menuItems.length > 0) ? menuItems : (menuData?.items || []);
    return baseItems.filter(item => item.showInMenu !== false);
  }, [menuItems, menuData]);

  // UI state
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'todos'>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<MenuItem | null>(null);

  const productAddons = useMemo(() => {
    if (!selectedProduct) return [];
    if (menuData?.addons) {
      return menuData.addons.filter(add => add.menu_item_id === selectedProduct.id && add.is_available);
    }
    return [];
  }, [selectedProduct, menuData]);
  
  // Comanda individual ou compartilhada & Gerenciamento de pessoas
  const [comandaType, setComandaType] = useState<'individual' | 'shared'>('individual');
  const [customerName, setCustomerName] = useState('Gabriel Gustavo');
  const [participants, setParticipants] = useState<string[]>(['Gabriel Gustavo']);
  const [newParticipantName, setNewParticipantName] = useState('');
  const [selectedParticipant, setSelectedParticipant] = useState('Gabriel Gustavo');

  // Fluxo de onboarding / QR Code da mesa
  const [isInitialFlowCompleted, setIsInitialFlowCompleted] = useState<boolean>(false);
  const [initialChoice, setInitialChoice] = useState<'individual' | 'create_shared' | 'join_shared'>('individual');
  const [initialName, setInitialName] = useState('Gabriel Gustavo');

  // Sincroniza participantes e comanda quando carregarem do banco (Context)
  useEffect(() => {
    if (activeComanda) {
      setCustomerName(activeComanda.nome_cliente || 'Você');
      if (activeComandaParticipants.length > 0) {
        setParticipants(activeComandaParticipants.map(p => p.nome));
        setSelectedParticipant(prev => {
          const names = activeComandaParticipants.map(p => p.nome);
          return names.includes(prev) ? prev : names[0];
        });
        setComandaType(activeComandaParticipants.length > 1 ? 'shared' : 'individual');
      }
      setIsInitialFlowCompleted(true);
    }
  }, [activeComanda, activeComandaParticipants]);

  const handleConfirmInitialFlow = async () => {
    const finalName = initialName.trim() || 'Cliente';
    setCustomerName(finalName);
    
    if (initialChoice === 'individual') {
      setComandaType('individual');
      await abrirComandaIndividual(finalName);
      setParticipants([finalName]);
      setSelectedParticipant(finalName);
    } else if (initialChoice === 'create_shared') {
      setComandaType('shared');
      await criarComandaCompartilhada(finalName);
      setParticipants([finalName]);
      setSelectedParticipant(finalName);
    } else if (initialChoice === 'join_shared') {
      setComandaType('shared');
      const joinedCom = await entrarComandaCompartilhada(finalName);
      if (joinedCom) {
        setParticipants([finalName]);
        setSelectedParticipant(finalName);
      }
    }
    
    setIsInitialFlowCompleted(true);
    
    // Feedback visual
    const snack = document.createElement('div');
    snack.className = 'fixed top-12 left-1/2 transform -translate-x-1/2 bg-neutral-900 text-white px-5 py-3 rounded-2xl shadow-xl z-50 text-xs font-black font-sans tracking-wide animate-bounce border border-neutral-700';
    snack.innerHTML = `<span>✨ Cardápio da Mesa ${activeTable} Acessado!</span>`;
    document.body.appendChild(snack);
    setTimeout(() => snack.remove(), 2500);
  };

  const handleAddParticipant = async (nameToAdd?: string) => {
    const targetName = nameToAdd || newParticipantName;
    const trimmed = targetName.trim();
    if (trimmed && !participants.includes(trimmed)) {
      if (activeComanda) {
        await adicionarParticipante(trimmed);
      } else {
        setParticipants(prev => [...prev, trimmed]);
      }
      if (!nameToAdd) setNewParticipantName('');
      
      // Feedback visual rápido de sucesso
      const snack = document.createElement('div');
      snack.className = 'fixed top-10 left-1/2 transform -translate-x-1/2 bg-neutral-900 text-white px-4 py-2.5 rounded-xl shadow-lg z-50 text-xs font-bold font-sans animate-bounce';
      snack.innerText = `👤 ${trimmed} adicionado(a) à comanda!`;
      document.body.appendChild(snack);
      setTimeout(() => snack.remove(), 2500);
    }
  };

  const handleRemoveParticipant = async (nameToRemove: string) => {
    if (nameToRemove === customerName) return; // Não pode remover o usuário principal
    if (activeComanda) {
      await removerParticipante(nameToRemove);
    } else {
      setParticipants(prev => prev.filter(p => p !== nameToRemove));
    }
    if (selectedParticipant === nameToRemove) {
      setSelectedParticipant(customerName);
    }
  };

  // Customization modal state
  const [modalQuantity, setModalQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState<{ id: string; name: string; price: number }[]>([]);
  const [modalObservation, setModalObservation] = useState('');
  const [addingToCartSuccess, setAddingToCartSuccess] = useState(false);
  
  // Drawer states
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);
  
  // Confirmation states
  const [orderFeedback, setOrderFeedback] = useState<string | null>(null);
  const [waiterFeedback, setWaiterFeedback] = useState<string | null>(null);
  const [selectedWaiterReason, setSelectedWaiterReason] = useState<WaiterCallReason>('assistance');
  const [customWaiterNote, setCustomWaiterNote] = useState('');

  // 10% service charge toggle inside Bill drawer
  const [includeServiceCharge, setIncludeServiceCharge] = useState(true);

  // Estados de Pagamento Real
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'cash' | 'cashier' | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [cardOption, setCardOption] = useState<'credito' | 'debito'>('credito');
  const [pixCopiedFeedback, setPixCopiedFeedback] = useState(false);
  const [changeRequired, setChangeRequired] = useState(false);
  const [changeValue, setChangeValue] = useState('');

  // Filter items
  const filteredItems = useMemo(() => {
    const categoryNames: Record<string, string> = {
      entradas: 'Entradas',
      burgers: 'Burgers',
      bebidas: 'Bebidas',
      sobremesas: 'Sobremesas'
    };

    if (menuData?.categories) {
      menuData.categories.forEach(cat => {
        categoryNames[cat.slug] = cat.name;
      });
    }

    const query = searchQuery.trim().toLowerCase();

    return itemsToDisplay
      .filter(item => {
        const friendlyCategory = categoryNames[item.category] || item.category;
        
        // Se houver busca, ignoramos a restrição do botão de categoria selecionada para buscar no cardápio inteiro
        const matchesCategory = selectedCategory === 'todos' || item.category === selectedCategory || query !== '';
        
        if (!query) {
          return selectedCategory === 'todos' || item.category === selectedCategory;
        }

        const matchesSearch = item.name.toLowerCase().includes(query) || 
                              item.description.toLowerCase().includes(query) ||
                              friendlyCategory.toLowerCase().includes(query) ||
                              item.category.toLowerCase().includes(query) ||
                              (item.tags && item.tags.some(t => t.toLowerCase().includes(query)));
        
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [itemsToDisplay, selectedCategory, searchQuery, menuData]);

  // Active waiter call for this table
  const activeCallForThisTable = useMemo(() => {
    return calls.find(c => c.tableId === activeTable && c.status === 'pending');
  }, [calls, activeTable]);

  // History orders for this table (not paid)
  const activeOrdersForThisTable = useMemo(() => {
    return orders.filter(o => o.tableId === activeTable && !o.isPaid);
  }, [orders, activeTable]);

  const rawBillTotal = useMemo(() => {
    return activeOrdersForThisTable.reduce((sum, order) => sum + order.total, 0);
  }, [activeOrdersForThisTable]);

  const billTotalWithService = useMemo(() => {
    if (includeServiceCharge) {
      return rawBillTotal * 1.1;
    }
    return rawBillTotal;
  }, [rawBillTotal, includeServiceCharge]);

  const itemGroupCountInCart = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const runningCartSum = useMemo(() => {
    return cart.reduce((sum, item) => {
      const extrasPrice = item.extras.reduce((s, e) => s + e.price, 0);
      return sum + (item.menuItem.price + extrasPrice) * item.quantity;
    }, 0);
  }, [cart]);

  const participantBills = useMemo(() => {
    const bills: Record<string, number> = {};
    
    // Inicializar participantes conhecidos com zero
    participants.forEach(p => {
      bills[p] = 0;
    });

    activeOrdersForThisTable.forEach(order => {
      order.items.forEach(item => {
        const target = item.customerName || customerName;
        const extrasSum = item.extras.reduce((s, e) => s + e.price, 0);
        const itemCost = (item.price + extrasSum) * item.quantity;
        
        if (bills[target] !== undefined) {
          bills[target] += itemCost;
        } else {
          bills[target] = itemCost;
        }
      });
    });

    return bills;
  }, [activeOrdersForThisTable, participants, customerName]);

  // Open item modifiers
  const handleOpenProduct = (item: MenuItem) => {
    if (!item.isAvailable || item.stock === 0) return;
    setSelectedProduct(item);
    setModalQuantity(1);
    setSelectedExtras([]);
    setModalObservation('');
    setSelectedParticipant(comandaType === 'shared' ? (participants[0] || customerName) : customerName);
  };

  const handleToggleExtra = (extra: { id: string; name: string; price: number }) => {
    setSelectedExtras(prev => {
      const exists = prev.some(e => e.id === extra.id);
      if (exists) {
        return prev.filter(e => e.id !== extra.id);
      } else {
        return [...prev, { id: extra.id, name: extra.name, price: extra.price }];
      }
    });
  };

  const handleConfirmAddToCart = () => {
    if (!selectedProduct || addingToCartSuccess) return;
    
    setAddingToCartSuccess(true);
    
    addToCart(
      selectedProduct,
      modalQuantity,
      selectedExtras.map(e => ({ name: e.name, price: e.price })),
      modalObservation,
      comandaType === 'shared' ? selectedParticipant : customerName
    );
    
    // Quick haptic feedback if available
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(50);
      } catch (e) {
        // ignore
      }
    }

    // Quick vibration or short visual snackbar
    const snackbar = document.createElement('div');
    snackbar.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 ${themeColors.primary} text-white px-4 py-3 rounded-full shadow-xl text-sm font-semibold flex items-center gap-2 z-50 transition duration-300 animate-bounce`;
    snackbar.innerHTML = `<span>🛒 Adicionado ao carrinho!</span>`;
    document.body.appendChild(snackbar);
    setTimeout(() => snackbar.remove(), 2000);

    // Keep the modal open for 1300ms to show the gorgeous visual confirmation overlay, then close
    setTimeout(() => {
      setSelectedProduct(null);
      setAddingToCartSuccess(false);
    }, 1300);
  };

  const handleSendOrder = () => {
    if (cart.length === 0) return;
    placeOrder(activeComanda?.id);
    setIsCartOpen(false);
    
    setOrderFeedback('Sucesso!');
    setTimeout(() => setOrderFeedback(null), 4000);
  };

  const handleCallWaiterSubmit = () => {
    submitCallWaiter(selectedWaiterReason, customWaiterNote || undefined);
    setIsWaiterModalOpen(false);
    setCustomWaiterNote('');
    setWaiterFeedback('Solicitação enviada. Um atendente irá até sua mesa.');
    setTimeout(() => setWaiterFeedback(null), 5000);
  };

  const getCategoryIcon = (slug: string) => {
    switch (slug) {
      case 'entradas':
        return <Sparkles className="w-4 h-4" />;
      case 'burgers':
        return <CheckSquare className="w-4 h-4" />;
      case 'bebidas':
        return <Beer className="w-4 h-4" />;
      case 'sobremesas':
        return <Coffee className="w-4 h-4" />;
      default:
        return <Utensils className="w-4 h-4" />;
    }
  };

  // Categories helper list
  const categoriesList = useMemo(() => {
    const list = [
      { id: 'todos' as const, label: 'Tudo', icon: <Utensils className="w-4 h-4" /> }
    ];
    if (menuData?.categories) {
      menuData.categories.forEach(cat => {
        list.push({
          id: cat.slug as any,
          label: cat.name,
          icon: getCategoryIcon(cat.slug)
        });
      });
    } else {
      list.push(
        { id: 'entradas' as any, label: 'Entradas', icon: <Sparkles className="w-4 h-4" /> },
        { id: 'burgers' as any, label: 'Burgers', icon: <CheckSquare className="w-4 h-4" /> },
        { id: 'bebidas' as any, label: 'Bebidas', icon: <Beer className="w-4 h-4" /> },
        { id: 'sobremesas' as any, label: 'Sobremesas', icon: <Coffee className="w-4 h-4" /> }
      );
    }
    return list;
  }, [menuData]);

  // Se o fluxo inicial não foi concluído, mostra a tela de escolha da comanda
  if (!isInitialFlowCompleted) {
    return (
      <div id="comanda-onboarding-root" className="min-h-screen bg-neutral-900 text-white flex flex-col justify-between font-sans relative px-6 py-12 overflow-y-auto">
        {/* Language selector on onboarding */}
        <div className="absolute top-4 right-4 z-50 flex items-center bg-neutral-800 border border-neutral-750 rounded-xl px-2.5 py-1 text-xs">
          <Globe className="w-3.5 h-3.5 text-neutral-400 mr-1.5" />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="bg-transparent text-white font-bold focus:outline-none cursor-pointer text-xs"
          >
            <option value="pt" className="bg-neutral-800">🇧🇷 PT-BR</option>
            <option value="en" className="bg-neutral-800">🇺🇸 EN-US</option>
            <option value="es" className="bg-neutral-800">🇪🇸 ES-ES</option>
          </select>
        </div>

        {/* Efeitos de brilho no fundo */}
        <div className="absolute top-[-100px] left-[-100px] w-80 h-80 bg-red-900/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-100px] right-[-100px] w-80 h-80 bg-neutral-800/40 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md mx-auto w-full space-y-6 flex-1 flex flex-col justify-center">
          {/* Cabeçalho / Logo */}
          <div className="text-center space-y-3">
            <div className={`w-14 h-14 bg-red-600 rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl shadow-red-900/30 border border-red-500/20`}>
              <QrCode className="w-7 h-7 animate-pulse" />
            </div>
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-red-500 bg-red-950/50 border border-red-900/30 px-3 py-1 rounded-full">📍 {t('text_active_table')} {activeTable}</span>
              <h1 className="text-3xl font-black tracking-tight mt-3">Le Bistro Modern</h1>
              <p className="text-xs text-neutral-400">
                {language === 'pt' ? 'Cardápio Interativo & Comanda Digital por QR Code' : 
                 language === 'es' ? 'Menú Interactivo & Cuenta Digital por QR Code' : 
                 'Interactive Menu & Digital Tab via QR Code'}
              </p>
            </div>
          </div>

          {/* Área de Escolha */}
          <div className="space-y-5">
            <div className="bg-neutral-800/90 border border-neutral-700/60 p-5 rounded-3xl space-y-5 backdrop-blur-md">
              <div className="text-center space-y-1">
                <h2 className="text-base font-bold text-neutral-100">{t('comanda_type_selection')}</h2>
                <p className="text-[11px] text-neutral-400">{t('initial_sub')}</p>
              </div>

              {/* Opções interativas */}
              <div className="space-y-3">
                {/* 1. Comanda Individual */}
                <button
                  type="button"
                  onClick={() => setInitialChoice('individual')}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-3.5 group relative overflow-hidden ${
                    initialChoice === 'individual'
                      ? 'bg-red-950/40 border-red-500 text-white shadow-lg'
                      : 'bg-neutral-900/40 border-neutral-850 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900/60'
                  }`}
                >
                  <div className={`p-2 rounded-xl border transition shrink-0 ${
                    initialChoice === 'individual'
                      ? 'bg-red-600 text-white border-transparent'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700 group-hover:text-neutral-200'
                  }`}>
                    <User className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-black block">1. {language === 'pt' ? 'Abrir comanda individual' : language === 'es' ? 'Abrir cuenta individual' : 'Open individual tab'}</span>
                    <span className="text-[10px] text-neutral-400 block font-medium leading-relaxed">
                      {language === 'pt' ? 'Os pedidos que você fizer ficam registrados apenas na sua própria comanda de forma individual.' :
                       language === 'es' ? 'Los pedidos que realice se registrarán únicamente en su cuenta individual.' :
                       'Orders you place will be recorded only on your individual tab.'}
                    </span>
                  </div>
                  {initialChoice === 'individual' && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                    </div>
                  )}
                </button>

                {/* 2. Criar comanda compartilhada */}
                <button
                  type="button"
                  onClick={() => setInitialChoice('create_shared')}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-3.5 group relative overflow-hidden ${
                    initialChoice === 'create_shared'
                      ? 'bg-red-950/40 border-red-500 text-white shadow-lg'
                      : 'bg-neutral-900/40 border-neutral-850 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900/60'
                  }`}
                >
                  <div className={`p-2 rounded-xl border transition shrink-0 ${
                    initialChoice === 'create_shared'
                      ? 'bg-red-600 text-white border-transparent'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700 group-hover:text-neutral-200'
                  }`}>
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-black block">2. {language === 'pt' ? 'Criar comanda compartilhada' : language === 'es' ? 'Criar cuenta compartida' : 'Create shared tab'}</span>
                    <span className="text-[10px] text-neutral-400 block font-medium leading-relaxed">
                      {language === 'pt' ? 'Inicie uma comanda coletiva nesta mesa. Permite dividir igualmente e adicionar mais amigos.' :
                       language === 'es' ? 'Inicie una cuenta colectiva en esta mesa. Permite dividir por igual y añadir más amigos.' :
                       'Start a collective tab at this table. Divide equally and add more friends.'}
                    </span>
                  </div>
                  {initialChoice === 'create_shared' && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                    </div>
                  )}
                </button>

                {/* 3. Entrar em comanda compartilhada */}
                <button
                  type="button"
                  onClick={() => setInitialChoice('join_shared')}
                  className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-3.5 group relative overflow-hidden ${
                    initialChoice === 'join_shared'
                      ? 'bg-red-950/40 border-red-500 text-white shadow-lg'
                      : 'bg-neutral-900/40 border-neutral-850 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900/60'
                  }`}
                >
                  <div className={`p-2 rounded-xl border transition shrink-0 ${
                    initialChoice === 'join_shared'
                      ? 'bg-red-600 text-white border-transparent'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700 group-hover:text-neutral-200'
                  }`}>
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5 pr-4">
                    <span className="text-xs font-black block">3. {language === 'pt' ? 'Entrar em comanda compartilhada' : language === 'es' ? 'Unirse a cuenta compartida' : 'Join shared tab'}</span>
                    <span className="text-[10px] text-neutral-400 block font-medium leading-relaxed">
                      {language === 'pt' ? 'Junte-se ao consumo coletivo ativo desta mesa para rachar com amigos que já estão pedindo.' :
                       language === 'es' ? 'Únase al consumo colectivo activo de esta mesa para dividir con amigos que ya están pidiendo.' :
                       'Join the active collective consumption of this table to split with friends already ordering.'}
                    </span>
                  </div>
                  {initialChoice === 'join_shared' && (
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-600 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white stroke-[3px]" />
                    </div>
                  )}
                </button>
              </div>

              {/* Informar Nome/Apelido */}
              <div className="space-y-2 pt-3.5 border-t border-neutral-700/50">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-neutral-300">
                    {t('label_name')} <span className="text-red-500">*</span>
                  </label>
                  {initialChoice !== 'individual' && (
                    <span className="text-[9px] bg-red-950/80 border border-red-800/40 text-red-300 px-2 py-0.5 rounded-full font-bold">
                      {language === 'pt' ? 'Necessário para comanda mútua' : language === 'es' ? 'Necesario para cuenta compartida' : 'Required for shared tab'}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={initialName}
                  onChange={(e) => setInitialName(e.target.value)}
                  placeholder="Ex: Gabriel Gustavo"
                  className="w-full bg-neutral-900 text-white text-xs py-2.5 px-4 rounded-xl border border-neutral-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Ação Principal */}
            <button
              type="button"
              disabled={!initialName.trim()}
              onClick={handleConfirmInitialFlow}
              className={`w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition duration-300 flex items-center justify-center gap-2 shadow-lg ${
                initialName.trim()
                  ? 'bg-red-600 text-white hover:bg-red-500 active:scale-[0.98]'
                  : 'bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-750'
              }`}
            >
              <span>{t('initial_start')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="text-center text-[10px] text-neutral-500 max-w-xs mx-auto mt-6">
          {language === 'pt' ? 'Ao entrar você confirma o acesso dinâmico do MenuMesa. Powered by' :
           language === 'es' ? 'Al ingresar confirma el acceso dinámico de MenuMesa. Desarrollado por' :
           'By entering you confirm dynamic access to MenuMesa. Powered by'}{' '}
          <span className="font-bold text-neutral-300">Le Bistro Modern</span>.
        </div>
      </div>
    );
  }

  return (
    <div id="customer-view-root" className="min-h-screen bg-neutral-50 text-neutral-800 pb-28 relative flex flex-col font-sans">
      
      {/* HEADER SUPERIOR PREMIUM */}
      <header className="sticky top-0 bg-white shadow-sm border-b border-neutral-100 z-30">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${themeColors.primary} rounded-xl flex items-center justify-center text-white shadow-md shadow-red-200`}>
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight leading-none text-neutral-900">Le Bistro Modern</h1>
              <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1 font-medium bg-neutral-100 px-2 py-0.5 rounded-full w-fit">
                📍 <span className="font-bold text-neutral-800">Mesa {activeTable}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Seletor de Idioma */}
            <div className="flex items-center bg-neutral-100 p-1.5 rounded-xl border border-neutral-200">
              <Globe className="w-3.5 h-3.5 text-neutral-500 mr-1 ml-0.5" />
              <select 
                value={language}
                onChange={(e) => setLanguage(e.target.value as any)}
                className="text-xs bg-white text-neutral-800 font-bold border border-neutral-200 rounded-lg py-1 px-1 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                <option value="pt">🇧🇷 PT</option>
                <option value="en">🇺🇸 EN</option>
                <option value="es">🇪🇸 ES</option>
              </select>
            </div>

            {/* Simular Mesa */}
            <div className="flex items-center bg-neutral-100 p-1.5 rounded-xl border border-neutral-200">
              <span className="text-[10px] font-bold text-neutral-500 px-0.5 uppercase">Mesa:</span>
              <select 
                value={activeTable}
                onChange={(e) => changeActiveTable(e.target.value)}
                className="text-xs bg-white text-neutral-800 font-bold border border-neutral-200 rounded-lg py-1 px-1 focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                {tables.filter(t => t.isActive).map(t => (
                  <option key={t.id} value={t.id}>{t.id}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* FEEDBACK FLOATING BANNER PARA CHAMADOS E PEDIDOS */}
      <div className="max-w-md mx-auto w-full px-4 mt-3 space-y-2">
        {orderFeedback && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold">Pedido Enviado com Sucesso!</p>
              <p className="opacity-90">Sua comanda foi atualizada e a cozinha já começou a preparar.</p>
            </div>
          </div>
        )}

        {waiterFeedback && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3.5 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
            <Bell className="w-5 h-5 text-blue-600 shrink-0 animate-bounce" />
            <div className="text-xs">
              <p className="font-bold">Solicitação enviada.</p>
              <p className="opacity-95">Um atendente irá até sua mesa.</p>
            </div>
          </div>
        )}

        {activeCallForThisTable && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-3 rounded-xl flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <div className="text-xs">
                <span className="font-semibold">Garçom Chamado</span>
                <span className="opacity-70 text-[10px] block font-mono">
                  Motivo: {
                    activeCallForThisTable.reason === 'payment' ? 'Pedir conta' :
                    activeCallForThisTable.reason === 'cleaning' ? 'Solicitar limpeza da mesa' :
                    activeCallForThisTable.reason === 'problem' ? 'Problema com pedido' :
                    activeCallForThisTable.reason === 'waiter' ? 'Chamar garçom' :
                    activeCallForThisTable.reason === 'assistance' ? 'Pedir ajuda' :
                    activeCallForThisTable.reason === 'utensils' ? 'Talheres/Pratos' :
                    activeCallForThisTable.reason === 'drinks' ? 'Mais Bebidas' : 'Outro'
                  }
                </span>
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">Pendente</span>
          </div>
        )}
      </div>

      {/* BANNER PROMOCIONAL / DESTAQUE */}
      <section className="max-w-md mx-auto w-full px-4 mt-3">
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white rounded-2xl p-4 shadow-md relative overflow-hidden">
          <div className="relative z-10 max-w-[65%]">
            <span className="bg-yellow-500 text-neutral-900 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full inline-block mb-1.5">Combo da Semana</span>
            <h3 className="font-extrabold text-lg leading-tight">Crown Double Bacon + Freira Rústica</h3>
            <p className="text-xs text-neutral-300 mt-1">Peça hoje por nossa comanda digital e ganhe 15% de desconto direto.</p>
          </div>
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-cover bg-center rounded-r-2xl opacity-80" 
            style={{ backgroundImage: `url('https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80')` }}
          />
        </div>
      </section>

      {/* BARRA DE PESQUISA NOTION-STYLE */}
      <section className="max-w-md mx-auto w-full px-4 mt-4">
        <div className="relative">
          <Search className="w-5 h-5 text-neutral-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-neutral-800 pl-11 pr-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-800 transition shadow-inner"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-neutral-100 hover:bg-neutral-200 rounded-full p-0.5 text-neutral-500"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {/* SLIDER DE CATEGORIAS */}
      <section className="max-w-md mx-auto w-full pl-4 mt-4 overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex gap-2 pr-4">
          {categoriesList.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold shrink-0 transition-all duration-300 ${
                  isSelected 
                    ? `${themeColors.primary} text-white shadow-md shadow-neutral-200 scale-105` 
                    : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300'
                }`}
              >
                {cat.icon}
                <span>{
                  cat.id === 'todos' ? t('category_todos') :
                  cat.id === 'entradas' ? t('category_entradas') :
                  cat.id === 'burgers' ? t('category_burgers') :
                  cat.id === 'bebidas' ? t('category_bebidas') :
                  cat.id === 'sobremesas' ? t('category_sobremesas') :
                  cat.label
                }</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* GRID DE PRODUTOS */}
      <main className="max-w-md mx-auto w-full px-4 mt-5 flex-1">
        {menuLoading ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-3.5">
              <div className="h-4 w-28 bg-neutral-200 rounded animate-pulse" />
              <div className="h-4 w-12 bg-neutral-200 rounded animate-pulse" />
            </div>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-3 border border-neutral-200 flex gap-3.5 shadow-sm">
                <div className="w-24 h-24 rounded-xl bg-neutral-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-neutral-200 rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-neutral-200 rounded animate-pulse w-5/6" />
                  <div className="h-3 bg-neutral-200 rounded animate-pulse w-1/2" />
                  <div className="flex justify-between pt-2">
                    <div className="h-4 bg-neutral-200 rounded animate-pulse w-1/4" />
                    <div className="h-4 bg-neutral-200 rounded animate-pulse w-1/6" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : menuError ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-rose-100 shadow-sm mt-2 space-y-4">
            <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
            <div>
              <h4 className="font-extrabold text-neutral-800 text-sm">Erro ao carregar cardápio</h4>
              <p className="text-xs text-neutral-500 mt-1 px-4">{menuError}</p>
            </div>
            <button
              onClick={() => menuRefetch()}
              className={`${themeColors.primary} ${themeColors.hover} text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-md transition`}
            >
              Tentar Novamente
            </button>
          </div>
        ) : itemsToDisplay.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-neutral-200 shadow-sm mt-2">
            <Utensils className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h4 className="font-bold text-neutral-800 text-sm">Cardápio Vazio</h4>
            <p className="text-xs text-neutral-500 mt-1 px-4">Este restaurante ainda não cadastrou nenhum produto ou categoria ativo em seu painel.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-neutral-400">
                {searchQuery ? 'Resultados da Busca' : (selectedCategory === 'todos' ? 'Destaques do Chefe' : selectedCategory)}
              </h2>
              <span className="text-xs text-neutral-500 font-medium font-mono">{filteredItems.length} pratos</span>
            </div>

            {filteredItems.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-neutral-200 shadow-sm mt-2">
                <HelpCircle className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <h4 className="font-bold text-neutral-800 text-sm">Nenhum prato encontrado</h4>
                <p className="text-xs text-neutral-500 mt-1 px-4">Experimente buscar por outros termos ou mudar a categoria selecionada.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
            {filteredItems.map(item => {
              const inCartCount = cart
                .filter(ci => ci.menuItem.id === item.id)
                .reduce((sum, ci) => sum + ci.quantity, 0);

              return (
                <div
                  key={item.id}
                  onClick={() => handleOpenProduct(item)}
                  className={`bg-white rounded-2xl p-3 border border-neutral-200 flex gap-3.5 shadow-sm hover:shadow-md transition duration-200 relative cursor-pointer ${
                    (!item.isAvailable || item.stock === 0) ? 'opacity-55 cursor-not-allowed' : ''
                  }`}
                >
                  <div className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0 bg-neutral-100">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover select-none"
                      referrerPolicy="no-referrer"
                    />
                    {(!item.isAvailable || item.stock === 0) && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-[10px] text-white font-extrabold uppercase px-1.5 py-0.5 border border-white rounded-sm">Esgotado</span>
                      </div>
                    )}
                    {inCartCount > 0 && (
                      <div className={`absolute top-1.5 right-1.5 w-6 h-6 ${themeColors.primary} text-white rounded-full flex items-center justify-center text-xs font-bold border-2 border-white shadow-md animate-scale-up`}>
                        {inCartCount}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-between flex-1 min-w-0">
                    <div>
                      {/* Destaque and Promo highlights */}
                      <div className="flex flex-wrap gap-1 mb-1">
                        {item.isFeatured && (
                          <span className="bg-amber-100/90 text-amber-800 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-amber-200">
                            ★ Destaque
                          </span>
                        )}
                        {item.isPromo && (
                          <span className="bg-rose-100/95 text-rose-805 text-[8px] font-black uppercase px-1.5 py-0.5 rounded border border-rose-255">
                            🏷️ Promo
                          </span>
                        )}
                      </div>
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="font-bold text-sm text-neutral-900 leading-tight truncate">{item.name}</h4>
                      </div>
                      <p className="text-xs text-neutral-500 line-clamp-2 mt-1 leading-normal">{item.description}</p>
                    </div>

                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-extrabold text-neutral-900">R$ {item.price.toFixed(2)}</span>
                        {item.originalPrice && (
                          <span className="text-xs text-neutral-400 line-through font-medium">R$ {item.originalPrice.toFixed(2)}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-neutral-400" />
                        <span className="text-[11px] font-mono font-medium text-neutral-500">{item.estimatedTimeMin} min</span>
                      </div>
                    </div>
                  </div>

                  {/* Tags absolutely positioned if helpful */}
                  {item.tags?.length > 0 && (
                    <div className="absolute top-3 right-3 flex gap-1 pointer-events-none">
                      {item.tags.slice(0, 1).map(tag => (
                        <span key={tag} className="bg-neutral-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md shadow-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
          </>
        )}
      </main>

      {/* CONTROLES E ABAS DE NAVEGAÇÃO FIXAS NA PARTE INFERIOR (MOBILE FIRST) */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-100 shadow-2xl z-40">
        <div className="max-w-md mx-auto px-4 py-3 flex gap-2">
          
          {/* BOTÃO CHAMAR GARÇOM DE ACESSO RÁPIDO */}
          <button
            onClick={() => setIsWaiterModalOpen(true)}
            className="flex-1 border border-neutral-200 hover:border-neutral-300 text-neutral-700 font-bold text-xs py-3.5 px-3 rounded-xl flex items-center justify-center gap-2 transition duration-150 active:bg-neutral-100 shadow-sm"
          >
            <Bell className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>{t('btn_call_waiter')}</span>
          </button>

          {/* BOTÃO VER MINHA COMANDA INTEGRADA */}
          <button
            onClick={() => setIsBillOpen(true)}
            className="flex-1 border border-neutral-200 hover:border-neutral-300 text-neutral-700 font-bold text-xs py-3.5 px-3 rounded-xl flex items-center justify-center gap-2 transition duration-150 active:bg-neutral-100 shadow-sm relative"
          >
            <FileText className="w-4 h-4 text-blue-500" />
            <span>{t('btn_view_bill')}</span>
            {activeOrdersForThisTable.length > 0 && (
              <span className="absolute -top-1 right-2 bg-blue-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black animate-pulse shadow-sm">
                {activeOrdersForThisTable.length}
              </span>
            )}
          </button>

          {/* BOTÃO FLUTUANTE CARRINHO DE COMPRAS COMPLETO */}
          <button
            onClick={() => setIsCartOpen(true)}
            className={`flex-[1.5] ${themeColors.primary} ${themeColors.hover} text-white font-bold text-xs py-3.5 px-4 rounded-xl flex items-center justify-between transition-all duration-200 shadow-md shadow-red-100 active:scale-95`}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              <span>{t('tab_cart')}</span>
            </div>
            <div className="bg-white/25 text-white font-extrabold text-[11px] px-2 py-0.5 rounded-full select-none font-mono font-bold">
              {itemGroupCountInCart}
            </div>
          </button>

        </div>
      </footer>

      {/* --- MODAL DETALHES DO PRODUTO & CUSTOMIZAÇÃO --- */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[92vh] sm:max-h-[85vh] overflow-y-auto flex flex-col shadow-2xl animate-slide-up relative overflow-hidden">
            
            <header className="relative">
              <img 
                src={selectedProduct.image} 
                alt={selectedProduct.name}
                className="w-full h-56 object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => !addingToCartSuccess && setSelectedProduct(null)}
                disabled={addingToCartSuccess}
                className={`absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full focus:outline-none shadow-lg transition ${
                  addingToCartSuccess ? 'opacity-30 cursor-not-allowed' : ''
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <main className="p-5 flex-1 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {selectedProduct.tags.map(tag => (
                    <span key={tag} className="text-[10px] bg-neutral-100 border border-neutral-200 text-neutral-600 font-bold px-2 py-0.5 rounded-md">
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="text-lg font-black text-neutral-900 leading-tight">{selectedProduct.name}</h3>
                <p className="text-xs text-neutral-500 mt-1 leading-normal">{selectedProduct.description}</p>
                <div className="text-lg font-black text-neutral-900 mt-2">R$ {selectedProduct.price.toFixed(2)}</div>
              </div>

              {/* OPÇÕES EXTRAS PARA A CATEGORIA DO PRODUTO OU ADICIONAIS PERSONALIZADOS */}
              {productAddons.length > 0 && (
                <div className="bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 mb-2.5">Adicionais Extras</h4>
                  <div className="space-y-2">
                    {productAddons.map(extra => {
                      const isChecked = selectedExtras.some(e => e.id === extra.id);
                      return (
                        <div 
                          key={extra.id} 
                          onClick={() => handleToggleExtra(extra)}
                          className="flex items-center justify-between p-2 hover:bg-white rounded-lg cursor-pointer transition border border-transparent hover:border-neutral-200"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                              isChecked ? `${themeColors.primary} border-transparent text-white` : 'border-neutral-300 bg-white'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-semibold text-neutral-700">{extra.name}</span>
                          </div>
                          <span className="text-xs font-bold text-neutral-600 font-mono">+ R$ {extra.price.toFixed(2)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* QUEM ESTÁ PEDINDO (SE COMANDA COMPARTILHADA) */}
              {comandaType === 'shared' && (
                <div className="space-y-2 bg-neutral-50 border border-neutral-200 p-3.5 rounded-xl">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 block">De quem é este pedido?</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {participants.map(p => {
                      const isSelected = selectedParticipant === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setSelectedParticipant(p)}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 border ${
                            isSelected 
                              ? `${themeColors.primary} text-white border-transparent shadow-xs` 
                              : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                          }`}
                        >
                          <span className="text-[10px]">👤</span>
                          <span>{p === customerName ? `${p} (Você)` : p}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* OBSERVAÇÃO */}
              <div className="space-y-1">
                <label className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">Alguma observação?</label>
                <textarea
                  placeholder="Ex: Sem cebola, ponto da carne ao ponto para bem passado, etc."
                  value={modalObservation}
                  onChange={(e) => setModalObservation(e.target.value)}
                  className="w-full bg-white text-neutral-800 text-xs p-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-800 min-h-[70px] resize-none"
                  maxLength={140}
                />
              </div>
            </main>

            <footer className="p-4 border-t border-neutral-100 bg-neutral-50 flex items-center gap-3">
              <div className="flex items-center border border-neutral-200 bg-white rounded-xl py-2 px-3 gap-3.5 shadow-xs shrink-0 select-none">
                <button
                  onClick={() => !addingToCartSuccess && setModalQuantity(prev => Math.max(1, prev - 1))}
                  disabled={addingToCartSuccess}
                  className={`text-neutral-500 hover:text-neutral-800 focus:outline-none p-1 ${addingToCartSuccess ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <Minus className="w-3.5 h-3.5 stroke-[3]" />
                </button>
                <span className="font-extrabold min-w-[20px] text-center text-sm font-mono">{modalQuantity}</span>
                <button
                  onClick={() => !addingToCartSuccess && setModalQuantity(prev => prev + 1)}
                  disabled={addingToCartSuccess}
                  className={`text-neutral-500 hover:text-neutral-800 focus:outline-none p-1 ${addingToCartSuccess ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                </button>
              </div>

              <button
                onClick={handleConfirmAddToCart}
                disabled={addingToCartSuccess}
                className={`flex-1 font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all duration-300 relative overflow-hidden ${
                  addingToCartSuccess
                    ? 'bg-emerald-600 text-white hover:bg-emerald-600 scale-95 shadow-inner'
                    : `${themeColors.primary} ${themeColors.hover} text-white active:scale-98`
                }`}
              >
                {addingToCartSuccess ? (
                  <motion.div 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4 stroke-[3] animate-bounce" />
                    <span>{t('btn_added')}</span>
                  </motion.div>
                ) : (
                  <>
                    <span>{t('btn_add_to_order')}</span>
                    <span className="font-mono bg-white/20 px-2 py-0.5 rounded text-[10px]">
                      R$ {((selectedProduct.price + selectedExtras.reduce((s, e) => s + e.price, 0)) * modalQuantity).toFixed(2)}
                    </span>
                  </>
                )}
              </button>
            </footer>

            {/* Success Feedback Overlay */}
            <AnimatePresence>
              {addingToCartSuccess && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/95 backdrop-blur-xs flex flex-col items-center justify-center z-50 p-6 text-center"
                >
                  <motion.div
                    initial={{ scale: 0.5, rotate: -15, opacity: 0 }}
                    animate={{ scale: [0.5, 1.15, 1], rotate: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-20 h-20 bg-emerald-50 border-4 border-emerald-500 rounded-full flex items-center justify-center text-emerald-500 mb-4 shadow-lg shadow-emerald-105"
                  >
                    <CheckCircle2 className="w-12 h-12 stroke-[2.5] animate-bounce" />
                  </motion.div>
                  
                  <motion.h4
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-base font-black text-neutral-900"
                  >
                    {t('btn_added_to_order')}
                  </motion.h4>
                  
                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-xs text-neutral-500 mt-1.5 max-w-[240px] leading-relaxed"
                  >
                    <span className="font-extrabold text-neutral-700">{modalQuantity}x {selectedProduct.name}</span> {t('text_success_add_body')}
                  </motion.p>
                  
                  {/* Decorative Sparkles */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="absolute top-1/4 left-1/4 text-yellow-400"
                  >
                    <Sparkles className="w-5 h-5 fill-current" />
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
                    className="absolute bottom-1/4 right-1/4 text-yellow-500"
                  >
                    <Sparkles className="w-4 h-4 fill-current" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>
      )}

      {/* --- DRAWER DO MEU CARRINHO --- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-slide-left">
            
            <header className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-neutral-700" />
                <h3 className="font-extrabold text-base text-neutral-900">{t('cart_title')}</h3>
                <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full text-xs font-bold font-mono">
                  {itemGroupCountInCart}
                </span>
              </div>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-2 rounded-full focus:outline-none bg-neutral-50"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-neutral-50 rounded-2xl">
                  <ShoppingBag className="w-12 h-12 text-neutral-300 mb-3" />
                  <h4 className="font-bold text-neutral-800 text-sm">{t('cart_empty')}</h4>
                  <p className="text-xs text-neutral-500 mt-1">{t('text_empty_cart')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {cart.map(item => {
                      const extrasSum = item.extras.reduce((s, e) => s + e.price, 0);
                      const lineTotal = (item.menuItem.price + extrasSum) * item.quantity;
                      
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, scale: 0.92, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.92, y: -10 }}
                          transition={{ duration: 0.25, ease: [0.21, 1.02, 0.43, 1.01] }}
                          className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex gap-3 relative"
                        >
                          <img 
                            src={item.menuItem.image} 
                            alt={item.menuItem.name}
                            className="w-14 h-14 object-cover rounded-lg shrink-0 border border-neutral-100"
                            referrerPolicy="no-referrer"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-xs text-neutral-900 leading-tight truncate">{item.menuItem.name}</h5>
                            {item.extras.length > 0 && (
                              <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5 font-medium">
                                + {item.extras.map(e => e.name).join(', ')}
                              </p>
                            )}
                            {item.observation && (
                              <p className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded italic w-fit mt-1 max-w-full truncate">
                                💬 "{item.observation}"
                              </p>
                            )}
                            {comandaType === 'shared' && item.customerName && (
                              <div className="inline-block bg-neutral-100/80 text-neutral-600 border border-neutral-200 font-bold text-[9px] px-2 py-0.5 rounded-full mt-1.5 shadow-3xs shrink-0 select-none">
                                👤 {item.customerName === customerName ? `${item.customerName} (Você)` : item.customerName}
                              </div>
                            )}

                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs font-extrabold text-neutral-900 font-mono">R$ {lineTotal.toFixed(2)}</span>
                              
                              <div className="flex items-center border border-neutral-200 bg-white rounded-lg py-1 px-2 gap-2 shadow-xs select-none">
                                <button
                                  onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                                  className="text-neutral-400 hover:text-neutral-800 focus:outline-none p-0.5"
                                >
                                  <Minus className="w-3 h-3 stroke-[3]" />
                                </button>
                                <span className="font-extrabold text-xs min-w-[14px] text-center font-mono">{item.quantity}</span>
                                <button
                                  onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                                  className="text-neutral-400 hover:text-neutral-800 focus:outline-none p-0.5"
                                >
                                  <Plus className="w-3 h-3 stroke-[3]" />
                                </button>
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="absolute top-2 right-2 text-neutral-300 hover:text-red-500 transition p-1"
                            title="Remover prato"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </main>

            {cart.length > 0 && (
              <footer className="p-4 border-t border-neutral-100 bg-neutral-50 space-y-3.5">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs text-neutral-500">
                    <span>{t('text_active_table')}:</span>
                    <span className="font-bold text-neutral-800">{t('text_active_table')} {activeTable}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-neutral-800">
                    <span>{t('bill_subtotal')}:</span>
                    <span className="text-neutral-900 font-mono font-bold">R$ {runningCartSum.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={handleSendOrder}
                  className={`w-full ${themeColors.primary} ${themeColors.hover} text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition active:scale-95`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t('btn_place_order')}</span>
                </button>
              </footer>
            )}

          </div>
        </div>
      )}

      {/* --- DRAWER DETALHADO DA MINHA COMANDA DIGITAL --- */}
      {isBillOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
          <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-slide-left">
            
            <header className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-neutral-700" />
                <h3 className="font-extrabold text-base text-neutral-900">Minha Comanda</h3>
                <span className="bg-blue-50 border border-blue-200 text-blue-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  Ativa
                </span>
              </div>
              <button 
                onClick={() => setIsBillOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-2 rounded-full focus:outline-none bg-neutral-50"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                <div className="text-center">
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Total Acumulado não pago</span>
                  <div className="text-2xl font-black text-neutral-900 mt-1 font-mono">R$ {rawBillTotal.toFixed(2)}</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Soma de todos os pedidos finalizados para a Mesa {activeTable}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedWaiterReason('waiter');
                  setIsWaiterModalOpen(true);
                }}
                className="w-full border border-amber-200 hover:border-amber-300 bg-amber-50/40 text-neutral-800 font-bold text-xs py-3 px-3 rounded-xl flex items-center justify-center gap-2 transition duration-150 active:bg-amber-100 shadow-xs"
              >
                <Bell className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>Precisa de algo? Chamar Garçom</span>
              </button>

              {/* CONFIGURAÇÃO DA COMANDA (INDIVIDUAL OU COMPARTILHADA) */}
              <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">Modo da Comanda</span>
                  <div className="bg-neutral-200 p-0.5 rounded-lg flex">
                    <button
                      type="button"
                      onClick={() => {
                        setComandaType('individual');
                        // Garante que o usuário é o único participante
                        setParticipants([customerName]);
                      }}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                        comandaType === 'individual'
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-850'
                      }`}
                    >
                      👤 Individual
                    </button>
                    <button
                      type="button"
                      onClick={() => setComandaType('shared')}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                        comandaType === 'shared'
                          ? 'bg-white text-neutral-900 shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-850'
                      }`}
                    >
                      👥 Compartilhada
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-neutral-500">Seu Nome para Comanda Mesa {activeTable}:</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setCustomerName(newName);
                      // Sincroniza o primeiro participante sendo você
                      setParticipants(prev => {
                        const copy = [...prev];
                        if (copy.length > 0) {
                          // Se o primeiro item for igual ao nome antigo, substitui
                          copy[0] = newName || 'Você';
                        } else {
                          copy.push(newName || 'Você');
                        }
                        return copy;
                      });
                    }}
                    placeholder="Seu nome"
                    className="w-full bg-white text-neutral-850 text-xs py-1.5 px-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-850"
                  />
                </div>

                {comandaType === 'shared' && (
                  <div className="pt-2 border-t border-neutral-200 space-y-2.5">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-extrabold text-neutral-500 block">Participantes da Mesa:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {participants.map((p, idx) => (
                          <div
                            key={p + idx}
                            className={`flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-[11px] font-bold transition border ${
                              p === customerName 
                                ? 'bg-red-50 text-red-700 border-red-200' 
                                : 'bg-neutral-100 text-neutral-700 border-neutral-200'
                            }`}
                          >
                            <span>{p === customerName ? `${p} (Você)` : p}</span>
                            {p !== customerName && (
                              <button
                                type="button"
                                onClick={() => handleRemoveParticipant(p)}
                                className="text-neutral-400 hover:text-neutral-650 rounded-full hover:bg-neutral-200 p-0.5"
                                title="Remover pessoa"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={newParticipantName}
                        onChange={(e) => setNewParticipantName(e.target.value)}
                        placeholder="Nome do amigo"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddParticipant();
                          }
                        }}
                        className="flex-1 bg-white text-neutral-850 text-[11px] py-1.5 px-3 rounded-lg border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-850"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddParticipant()}
                        className={`px-3 py-1.5 rounded-lg text-white font-bold text-[11px] transition shrink-0 ${themeColors.primary} ${themeColors.hover}`}
                      >
                        + Adicionar
                      </button>
                    </div>

                    {/* CONSUMO POR PARTICIPANTE */}
                    <div className="bg-white rounded-lg p-2.5 border border-neutral-200 space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block pb-1 border-b border-neutral-100">
                        Consumo Individual Est.
                      </span>
                      {Object.entries(participantBills).map(([name, val]) => (
                        <div key={name} className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-neutral-600 truncate max-w-[200px]">
                            👤 {name === customerName ? `${name} (Você)` : name}:
                          </span>
                          <span className="font-bold text-neutral-800 font-mono">
                            R$ {(val as number).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {comandaType === 'shared' && participants.length > 1 && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between text-xs">
                  <div className="text-neutral-600">
                    <span className="font-bold block text-neutral-810">Divisão igualitária ({participants.length} pessoas):</span>
                    <span className="text-[10px]">Total com taxa opcional inclusa</span>
                  </div>
                  <span className="font-black text-blue-700 text-sm font-mono whitespace-nowrap">
                    R$ {(billTotalWithService / participants.length).toFixed(2)} <span className="text-[10px] font-normal text-neutral-500">cada</span>
                  </span>
                </div>
              )}

              {activeOrdersForThisTable.length === 0 ? (
                <div className="text-center p-8 py-10 bg-neutral-50 rounded-2xl border border-neutral-100">
                  <Utensils className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                  <h4 className="font-bold text-neutral-800 text-sm">Nenhum consumo registrado</h4>
                  <p className="text-xs text-neutral-500 mt-1 px-2">Faça seu primeiro pedido navegando no menu e confirme-o no carrinho de compras!</p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">Detalhamento por Pedido</h4>
                  
                  {activeOrdersForThisTable.map((order) => (
                    <div key={order.id} className="border border-neutral-200 rounded-xl bg-white overflow-hidden shadow-xs">
                      <header className="bg-neutral-50 px-3 py-2 border-b border-neutral-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-neutral-700 font-mono">{order.id}</span>
                          <span className="text-neutral-400 mx-1.5">•</span>
                          <span className="text-neutral-500 font-mono text-[10px]">
                            {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        {/* ORDER STATUS BADGE */}
                        {order.isUnsynced ? (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase bg-amber-500 text-white animate-pulse flex items-center gap-1 shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                            Offline
                          </span>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                            order.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                            order.status === 'preparing' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'ready' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {
                              order.status === 'pending' ? 'Fila de Espera' :
                              order.status === 'preparing' ? 'Em Preparo' :
                              order.status === 'ready' ? 'Pronto' : 'Entregue'
                            }
                          </span>
                        )}
                      </header>

                      <main className="p-3 space-y-2">
                        {order.items.map((lineItem, idx) => (
                          <div key={idx} className="flex justify-between items-start text-xs py-1 border-b border-neutral-100/50 last:border-0">
                            <div className="text-neutral-700 max-w-[75%]">
                              <span className="font-bold font-mono text-neutral-400 mr-1">{lineItem.quantity}x</span>
                              <span className="font-medium">{lineItem.name}</span>
                              
                              {comandaType === 'shared' && lineItem.customerName && (
                                <span className="ml-1.5 inline-block bg-neutral-100/80 text-neutral-600 border border-neutral-200 font-bold text-[8px] px-1.5 py-0.2 rounded-full">
                                  👤 {lineItem.customerName === customerName ? `${lineItem.customerName} (Você)` : lineItem.customerName}
                                </span>
                              )}

                              {lineItem.extras.length > 0 && (
                                <span className="block text-[10px] text-neutral-400 ml-5 font-semibold">
                                  + {lineItem.extras.map(e => e.name).join(', ')}
                                </span>
                              )}

                              {lineItem.observation && (
                                <span className="block text-[10px] text-blue-500 bg-blue-50/50 border border-blue-100/30 px-1 py-0.2 rounded italic w-fit mt-0.5 ml-5">
                                  💬 "{lineItem.observation}"
                                </span>
                              )}
                            </div>
                            <span className="font-bold text-neutral-600 font-mono whitespace-nowrap">R$ {lineItem.price.toFixed(2)}</span>
                          </div>
                        ))}
                      </main>

                      <footer className="px-3 py-2 border-t border-neutral-100 text-right bg-neutral-50/50">
                        <span className="text-xs font-bold text-neutral-900">Total do Bloco: <span className="font-mono">R$ {order.total.toFixed(2)}</span></span>
                      </footer>
                    </div>
                  ))}
                </div>
              )}
            </main>

            {activeOrdersForThisTable.length > 0 && (
              <footer className="p-4 border-t border-neutral-100 bg-neutral-50 space-y-3.5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                      <input 
                        type="checkbox" 
                        id="srv-charge"
                        checked={includeServiceCharge}
                        onChange={(e) => setIncludeServiceCharge(e.target.checked)}
                        className="rounded border-neutral-300 text-red-600 focus:ring-red-500 w-3.5 h-3.5 cursor-pointer"
                      />
                      <label htmlFor="srv-charge" className="font-semibold cursor-pointer">Adicionar 10% opcional (Serviço)</label>
                    </div>
                    {includeServiceCharge && <span className="text-xs font-bold text-neutral-600 font-mono">R$ {(rawBillTotal * 0.1).toFixed(2)}</span>}
                  </div>
                  
                  <div className="flex justify-between items-center text-base font-extrabold text-neutral-900 border-t border-dashed border-neutral-200 pt-2">
                    <span>Valor de Encerramento:</span>
                    <span className="font-mono">R$ {billTotalWithService.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPaymentMethod(null);
                      setPaymentSuccess(false);
                      setIsPaymentModalOpen(true);
                    }}
                    className={`w-full ${themeColors.primary} ${themeColors.hover} text-white font-extrabold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all duration-150 active:scale-[0.98]`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Efetuar Pagamento</span>
                  </button>
                </div>
              </footer>
            )}

          </div>
        </div>
      )}

      {/* --- MODAL PARA ELEGER O MOTIVO DO CHAMADO AO GARÇOM --- */}
      {isWaiterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-scale-up border border-neutral-200">
            <header className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-500 animate-bounce" />
                <h3 className="font-black text-sm text-neutral-800">Chamar Garçom</h3>
              </div>
              <button
                onClick={() => setIsWaiterModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 p-1.5 bg-white border border-neutral-200 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <main className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400 block">Como podemos lhe ajudar hoje?</label>
                
                <div className="grid grid-cols-1 gap-1.5 animate-fade-in">
                  {[
                    { id: 'waiter', label: 'Chamar garçom', icon: '🙋‍♂️' },
                    { id: 'assistance', label: 'Pedir ajuda', icon: '❓' },
                    { id: 'cleaning', label: 'Solicitar limpeza da mesa', icon: '🧹' },
                    { id: 'payment', label: 'Pedir conta', icon: '💳' },
                    { id: 'problem', label: 'Problema com pedido', icon: '⚠️' }
                  ].map(item => {
                    const isPending = calls.some(c => c.tableId === activeTable && c.reason === item.id && c.status === 'pending');
                    const isSelected = selectedWaiterReason === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (!isPending) {
                            setSelectedWaiterReason(item.id as WaiterCallReason);
                          }
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between transition text-left text-xs ${
                          isPending
                            ? 'bg-amber-50/50 border-amber-200 text-neutral-450 cursor-not-allowed opacity-80'
                            : isSelected
                              ? `${themeColors.bg} border-red-500 font-bold text-neutral-900`
                              : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg leading-none">{item.icon}</span>
                          <span className={isPending ? 'line-through decoration-neutral-300' : ''}>{item.label}</span>
                        </div>
                        {isPending && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded-md animate-pulse shrink-0">
                            📨 Pendente
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* AVISO DO ESTADO VISUAL PARA EVITAR MÚLTIPLOS REPETIDOS */}
              {calls.some(c => c.tableId === activeTable && c.reason === selectedWaiterReason && c.status === 'pending') && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2.5 text-amber-850 animate-fade-in">
                  <span className="text-sm">⚠️</span>
                  <p className="text-[10px] font-semibold leading-normal">
                    Você já possui uma solicitação de <strong>{
                      selectedWaiterReason === 'waiter' ? 'Chamar garçom' :
                      selectedWaiterReason === 'assistance' ? 'Pedir ajuda' :
                      selectedWaiterReason === 'cleaning' ? 'Solicitar limpeza da mesa' :
                      selectedWaiterReason === 'payment' ? 'Pedir conta' : 'Problema com pedido'
                    }</strong> aberta para a Mesa {activeTable}. Por favor, aguarde o atendente chegar para evitar chamados duplicados.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400 block">Mensagem personalizada (Opcional)</label>
                <input
                  type="text"
                  placeholder="Escreva algo rápido aqui..."
                  value={customWaiterNote}
                  onChange={(e) => setCustomWaiterNote(e.target.value)}
                  className="w-full bg-white text-neutral-800 text-xs p-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-800"
                />
              </div>
            </main>

            <footer className="p-4 bg-neutral-50 border-t border-neutral-100 flex gap-2">
              <button
                type="button"
                onClick={() => setIsWaiterModalOpen(false)}
                className="flex-1 bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-200 font-bold py-2.5 rounded-xl text-xs"
              >
                Cancelar
              </button>
              
              <button
                type="button"
                disabled={calls.some(c => c.tableId === activeTable && c.reason === selectedWaiterReason && c.status === 'pending')}
                onClick={handleCallWaiterSubmit}
                className={`flex-1 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md transition-all duration-200 ${
                  calls.some(c => c.tableId === activeTable && c.reason === selectedWaiterReason && c.status === 'pending')
                    ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-300'
                    : `${themeColors.primary} ${themeColors.hover} text-white`
                }`}
              >
                <Check className="w-4 h-4" />
                <span>Confirmar Chamado</span>
              </button>
            </footer>
          </div>
        </div>
      )}

      {/* --- MODAL DE PAGAMENTO INTERATIVO REAL (PIX, CARTÃO E DINHEIRO) --- */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up border border-neutral-200 flex flex-col max-h-[90vh]">
            <header className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50 shrink-0">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-neutral-700" />
                <h3 className="font-extrabold text-sm text-neutral-800">Efetuar Pagamento - Mesa {activeTable}</h3>
              </div>
              <button
                onClick={() => {
                  if (!isProcessingPayment) {
                    setIsPaymentModalOpen(false);
                  }
                }}
                disabled={isProcessingPayment}
                className="text-neutral-400 hover:text-neutral-600 p-1.5 bg-white border border-neutral-200 rounded-full disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            <main className="p-4 overflow-y-auto space-y-4 flex-1">
              {paymentSuccess ? (
                <div className="text-center py-6 space-y-4 animate-fade-in">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-black text-base text-neutral-900">Pagamento Confirmado!</h4>
                    <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                      Sua conta foi encerrada e paga com sucesso. Muito obrigado e volte sempre!
                    </p>
                  </div>
                  <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 font-mono text-xs text-neutral-600 max-w-xs mx-auto">
                    <div>Mesa: {activeTable}</div>
                    <div>Total Pago: R$ {billTotalWithService.toFixed(2)}</div>
                    <div>Método: {paymentMethod === 'pix' ? 'PIX Online' : paymentMethod === 'card' ? 'Cartão Online' : 'Dinheiro'}</div>
                    <div className="text-[10px] text-neutral-400 mt-1">ID Transação: TX-{Math.floor(100000 + Math.random() * 900000)}</div>
                  </div>
                  <button
                    onClick={() => {
                      setIsPaymentModalOpen(false);
                      setIsBillOpen(false);
                    }}
                    className={`w-full max-w-xs py-2.5 font-bold rounded-xl text-xs text-white ${themeColors.primary} ${themeColors.hover} shadow-md`}
                  >
                    Entendido
                  </button>
                </div>
              ) : isProcessingPayment ? (
                <div className="text-center py-12 space-y-4 animate-fade-in">
                  <div className="inline-block relative w-12 h-12">
                    <div className="absolute inset-0 border-4 border-neutral-200 rounded-full"></div>
                    <div className={`absolute inset-0 border-4 ${themeColors.border} border-t-transparent rounded-full animate-spin`}></div>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-neutral-850">Processando Pagamento...</h4>
                    <p className="text-[11px] text-neutral-500 animate-pulse">
                      Por favor, não feche esta janela. Comunicando com a operadora de pagamento.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Total Resumo */}
                  <div className="bg-neutral-50 p-3.5 rounded-xl border border-neutral-200 flex justify-between items-center text-left">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">Total a Encerrar</span>
                      <div className="text-xl font-black text-neutral-900 font-mono mt-0.5">R$ {billTotalWithService.toFixed(2)}</div>
                    </div>
                    <div className="text-right text-[10px] text-neutral-500 space-y-0.5 font-medium">
                      <div>Subtotal: R$ {rawBillTotal.toFixed(2)}</div>
                      {includeServiceCharge && <div>Serviço (10%): R$ {(rawBillTotal * 0.1).toFixed(2)}</div>}
                    </div>
                  </div>

                  {/* Seleção do Método */}
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block">Forma de Pagamento</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('pix');
                          setPixCopiedFeedback(false);
                        }}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition duration-150 ${
                          paymentMethod === 'pix'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-100'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <QrCode className={`w-5 h-5 ${paymentMethod === 'pix' ? 'text-emerald-650' : 'text-neutral-500'}`} />
                        <span className="text-[11px] font-bold">PIX Celular</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition duration-150 ${
                          paymentMethod === 'card'
                            ? 'bg-blue-50 border-blue-300 text-blue-800 ring-2 ring-blue-100'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <CreditCard className={`w-5 h-5 ${paymentMethod === 'card' ? 'text-blue-600' : 'text-neutral-500'}`} />
                        <span className="text-[11px] font-bold">Cartão Celular</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('cash');
                          setChangeRequired(false);
                          setChangeValue('');
                        }}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition duration-150 ${
                          paymentMethod === 'cash'
                            ? 'bg-amber-50 border-amber-300 text-amber-800 ring-2 ring-amber-100'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <Coins className={`w-5 h-5 ${paymentMethod === 'cash' ? 'text-amber-500' : 'text-neutral-500'}`} />
                        <span className="text-[11px] font-bold">Dinheiro (Mesa)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPaymentMethod('cashier');
                        }}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition duration-150 ${
                          paymentMethod === 'cashier'
                            ? 'bg-purple-50 border-purple-300 text-purple-800 ring-2 ring-purple-100'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        <Store className={`w-5 h-5 ${paymentMethod === 'cashier' ? 'text-purple-600' : 'text-neutral-500'}`} />
                        <span className="text-[11px] font-bold">Pagar no Caixa</span>
                      </button>
                    </div>
                  </div>

                  {/* Container Dinâmico do Método de Pagamento Selecionado */}
                  <div className="pt-2 border-t border-neutral-100 min-h-[160px] animate-fade-in">
                    {paymentMethod === 'pix' && (
                      <div className="space-y-4 text-center">
                        <div className="inline-flex flex-col items-center p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/60 shadow-xs">
                          {/* QR Code SVG */}
                          <svg className="w-28 h-28 text-neutral-900" viewBox="0 0 100 100">
                            <rect width="100" height="100" fill="white" />
                            {/* Pix Corners */}
                            <path d="M5,5 L25,5 L25,25 L5,25 Z M75,5 L95,5 L95,25 L75,25 Z M5,75 L25,75 L25,95 L5,95 Z" fill="currentColor" />
                            {/* Inner Boxes */}
                            <rect x="8" y="8" width="9" height="9" fill="white" />
                            <rect x="78" y="8" width="9" height="9" fill="white" />
                            <rect x="8" y="78" width="9" height="9" fill="white" />
                            <rect x="11" y="11" width="3" height="3" fill="currentColor" />
                            <rect x="81" y="11" width="3" height="3" fill="currentColor" />
                            <rect x="11" y="81" width="3" height="3" fill="currentColor" />
                            {/* Pix design pixels */}
                            <rect x="35" y="10" width="5" height="5" fill="currentColor" />
                            <text x="50" y="55" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#32bcad">PIX</text>
                            <rect x="30" y="30" width="4" height="4" fill="currentColor" />
                            <rect x="66" y="30" width="4" height="8" fill="currentColor" />
                            <rect x="40" y="70" width="15" height="4" fill="currentColor" />
                            <rect x="65" y="65" width="8" height="8" fill="currentColor" />
                            <rect x="15" y="45" width="8" height="4" fill="currentColor" />
                            <rect x="10" y="55" width="4" height="12" fill="currentColor" />
                            <rect x="80" y="45" width="10" height="4" fill="currentColor" />
                            <rect x="45" y="80" width="12" height="6" fill="currentColor" />
                          </svg>
                          <span className="text-[10px] font-bold text-teal-600 mt-1 flex items-center justify-center gap-1">
                            <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-ping"></span>
                            Aguardando transferência voluntária
                          </span>
                        </div>

                        <div className="space-y-1.5 text-left">
                          <label className="text-[10px] font-bold text-neutral-500 block">PIX Copia e Cola:</label>
                          <div className="flex bg-neutral-50 rounded-xl border border-neutral-200 overflow-hidden text-[10px]">
                            <span className="flex-1 p-2 text-neutral-600 font-mono truncate text-left self-center">
                              00020126580014br.gov.bcb.pix01362e49c716-e822-4a0b-93f5-748574c82b13520400005303986540537.405802BR5915MenuMesa6009
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText("00020126580014br.gov.bcb.pix01362e49c716-e822-4a0b-93f5-748574c82b13520400005303986540537.405802BR5915MenuMesa6009");
                                setPixCopiedFeedback(true);
                                setTimeout(() => setPixCopiedFeedback(false), 3000);
                              }}
                              className="bg-neutral-200 hover:bg-neutral-300 text-neutral-700 px-3 flex items-center gap-1 transition-colors group h-full self-stretch"
                            >
                              <Copy className="w-3.5 h-3.5" />
                              <span className="font-bold">{pixCopiedFeedback ? 'Copiado!' : 'Copiar'}</span>
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsProcessingPayment(true);
                            setTimeout(() => {
                              payAllOrdersOfTable(activeTable);
                              setIsProcessingPayment(false);
                              setPaymentSuccess(true);
                            }, 1800);
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                        >
                          <Check className="w-4 h-4" />
                          <span>Já Efetuei o PIX do Celular</span>
                        </button>
                      </div>
                    )}

                    {paymentMethod === 'card' && (
                      <div className="space-y-3">
                        <div className="flex bg-neutral-100 p-1.5 rounded-lg text-[10px] font-bold uppercase text-neutral-500 w-fit">
                          <button
                            type="button"
                            onClick={() => setCardOption('credito')}
                            className={`px-3 py-1 rounded-md transition ${cardOption === 'credito' ? 'bg-white text-blue-800 shadow-3xs' : 'hover:text-neutral-700'}`}
                          >
                            💳 Crédito
                          </button>
                          <button
                            type="button"
                            onClick={() => setCardOption('debito')}
                            className={`px-3 py-1 rounded-md transition ${cardOption === 'debito' ? 'bg-white text-blue-800 shadow-3xs' : 'hover:text-neutral-700'}`}
                          >
                            💳 Débito
                          </button>
                        </div>

                        <div className="space-y-2 text-left animate-fade-in">
                          <div className="space-y-0.5">
                            <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider block">Número do Cartão</label>
                            <input
                              type="text"
                              value={cardNumber}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').substring(0, 16);
                                const chunks = val.match(/.{1,4}/g);
                                setCardNumber(chunks ? chunks.join(' ') : val);
                              }}
                              placeholder="4111 2222 3333 4444"
                              className="w-full bg-neutral-50 text-neutral-800 text-xs p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                            />
                          </div>

                          <div className="space-y-0.5">
                            <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider block">Nome do Titular</label>
                            <input
                              type="text"
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              placeholder="GUSTAVO G COSTA"
                              className="w-full bg-neutral-50 text-neutral-800 text-xs p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-0.5">
                              <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider block">Validade</label>
                              <input
                                type="text"
                                value={cardExpiry}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/\D/g, '').substring(0, 4);
                                  if (val.length >= 3) {
                                    setCardExpiry(val.substring(0, 2) + '/' + val.substring(2));
                                  } else {
                                    setCardExpiry(val);
                                  }
                                }}
                                placeholder="12/30"
                                className="w-full bg-neutral-50 text-neutral-800 text-xs p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-center"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider block">CVC</label>
                              <input
                                type="password"
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                                placeholder="•••"
                                className="w-full bg-neutral-50 text-neutral-800 text-xs p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-center"
                              />
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsProcessingPayment(true);
                            setTimeout(() => {
                              payAllOrdersOfTable(activeTable);
                              setIsProcessingPayment(false);
                              setPaymentSuccess(true);
                            }, 2000);
                          }}
                          disabled={cardNumber.length < 15 || cardName.length < 3 || cardExpiry.length < 5 || cardCvv.length < 3}
                          className={`w-full font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] ${
                            cardNumber.length < 15 || cardName.length < 3 || cardExpiry.length < 5 || cardCvv.length < 3
                              ? 'bg-neutral-200 text-neutral-450 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          <span>Pagar R$ {billTotalWithService.toFixed(2)}</span>
                        </button>
                      </div>
                    )}

                    {paymentMethod === 'cash' && (
                      <div className="space-y-4">
                        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs leading-relaxed text-amber-850 flex gap-2 text-left">
                          <span className="text-sm">💵</span>
                          <div>
                            <strong className="block font-extrabold mb-0.5">Dinheiro Físico na Mesa:</strong>
                            Como você selecionou Dinheiro, a comanda será encerrada e o garçom trará a conta impressa até a mesa para recebimento em espécie.
                          </div>
                        </div>

                        <div className="space-y-2 text-left bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                          <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={changeRequired}
                              onChange={(e) => setChangeRequired(e.target.checked)}
                              className="rounded border-neutral-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                            />
                            <span>Preciso de troco</span>
                          </label>

                          {changeRequired && (
                            <div className="space-y-1 pt-1.5 animate-scale-up">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">Troco para quanto de dinheiro?</span>
                              <input
                                type="text"
                                value={changeValue}
                                onChange={(e) => setChangeValue(e.target.value)}
                                placeholder="Ex: R$ 100,00"
                                className="w-full bg-white text-neutral-850 text-xs p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-1 focus:ring-amber-550 font-mono"
                              />
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const changeDetails = changeRequired && changeValue ? `, precisa de troco para ${changeValue}` : '';
                            submitCallWaiter(
                              'payment', 
                              `Deseja fechar em dinheiro para Mesa ${activeTable}. Total: R$ ${billTotalWithService.toFixed(2)}${changeDetails}`
                            ).then(() => {
                              setIsPaymentModalOpen(false);
                              setIsBillOpen(false);

                              const snack = document.createElement('div');
                              snack.className = 'fixed top-10 left-1/2 transform -translate-x-1/2 bg-amber-600 text-white px-5 py-3.5 rounded-xl shadow-xl z-50 animate-bounce font-bold text-xs text-center max-w-sm';
                              snack.innerText = '💵 Chamado de Encerramento enviado! O garçom está trazendo a conta impressa e o troco.';
                              document.body.appendChild(snack);
                              setTimeout(() => snack.remove(), 5000);
                            });
                          }}
                          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                        >
                          <Bell className="w-4 h-4 animate-bounce" />
                          <span>Chamar Garçom para Fechar em Dinheiro</span>
                        </button>
                      </div>
                    )}

                    {paymentMethod === 'cashier' && (
                      <div className="space-y-4">
                        <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl text-xs leading-relaxed text-purple-850 flex gap-2 text-left">
                          <span className="text-sm">🏪</span>
                          <div>
                            <strong className="block font-extrabold mb-0.5">Pagar Presencialmente no Caixa:</strong>
                            Ao confirmar, sua mesa avisará a equipe que você está se dirigindo ao caixa físico/balcão para pagar. Você poderá pagar lá com qualquer forma (dinheiro, PIX, débito ou crédito físico).
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            submitCallWaiter(
                              'payment', 
                              `Cliente está indo pagar diretamente no CAIXA FÍSICO (Mesa ${activeTable}). Total: R$ ${billTotalWithService.toFixed(2)}`
                            ).then(() => {
                              setIsPaymentModalOpen(false);
                              setIsBillOpen(false);

                              const snack = document.createElement('div');
                              snack.className = 'fixed top-10 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-5 py-3.5 rounded-xl shadow-xl z-50 animate-bounce font-bold text-xs text-center max-w-sm';
                              snack.innerText = '🏪 Chamado enviado ao Caixa com sucesso! Por favor, dirija-se ao caixa/balcão para realizar o acerto físico.';
                              document.body.appendChild(snack);
                              setTimeout(() => snack.remove(), 5000);
                            });
                          }}
                          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                        >
                          <Bell className="w-4 h-4 animate-bounce" />
                          <span>Confirmar e Ir Pagar no Caixa</span>
                        </button>
                      </div>
                    )}

                    {!paymentMethod && (
                      <div className="flex flex-col items-center justify-center py-6 text-neutral-400 text-center gap-2">
                        <Wallet className="w-10 h-10 stroke-1 opacity-60 text-neutral-300 animate-pulse" />
                        <span className="text-xs font-semibold">Escolha um dos métodos acima para finalizar e fechar</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </main>

            <footer className="p-4 bg-neutral-50 border-t border-neutral-100 flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                disabled={isProcessingPayment}
                className="w-full bg-white hover:bg-neutral-100 text-neutral-600 border border-neutral-200 font-bold py-2.5 rounded-xl text-xs disabled:opacity-50"
              >
                Voltar/Cancelar
              </button>
            </footer>
          </div>
        </div>
      )}

    </div>
  );
};

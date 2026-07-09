/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useRestaurant, THEME_COLOR_MAPS } from '../context/RestaurantContext';
import { Order, OrderItem, TableState } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CreditCard, 
  Wallet, 
  DollarSign, 
  Users, 
  Percent, 
  ClipboardList, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Calculator, 
  X, 
  Search, 
  FileText, 
  Check, 
  ArrowRight,
  Sparkles,
  Info,
  Layers,
  Clock,
  Printer,
  Share2,
  MessageSquare,
  Copy,
  Wifi,
  WifiOff
} from 'lucide-react';

export const CashierPanel: React.FC = () => {
  const {
    orders,
    tables,
    setOrders,
    updateTable,
    payAllOrdersOfTable,
    themeColor,
    isOnline
  } = useRestaurant();

  const themeColors = THEME_COLOR_MAPS[themeColor] || THEME_COLOR_MAPS.red;

  // Selected table ID
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  
  // Tab within cashier: 'commands' (comandas abertas) or 'all-tables' (todas as mesas)
  const [comandaTab, setComandaTab] = useState<'open' | 'all'>('open');
  
  // Search query for tables
  const [searchTableQuery, setSearchTableQuery] = useState<string>('');

  // Service Tax (Service charge) - defaults to 10%
  const [serviceTaxPercent, setServiceTaxPercent] = useState<number>(10);
  
  // Discount
  const [discountType, setDiscountType] = useState<'percent' | 'value'>('value');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Split billing state
  const [splitCount, setSplitCount] = useState<number>(1);
  const [splitModeEnabled, setSplitModeEnabled] = useState<boolean>(false);

  // Individual item payment selections
  // Map of "orderId_itemIndex" -> quantity selected to pay
  const [selectedIndividualItems, setSelectedIndividualItems] = useState<Record<string, number>>({});
  const [individualPaymentMode, setIndividualPaymentMode] = useState<boolean>(false);

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'dinheiro' | 'credito' | 'debito'>('pix');
  
  // Cash paid (for calculating change)
  const [cashReceived, setCashReceived] = useState<string>('');

  // Receipt modal state
  const [showReceipt, setShowReceipt] = useState<boolean>(false);
  const [generatedReceiptData, setGeneratedReceiptData] = useState<any>(null);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Filtered tables list based on search and selected tab
  const filteredTables = useMemo(() => {
    return tables.filter(table => {
      // General availability check
      if (!table.isActive) return false;

      const matchesSearch = table.id.includes(searchTableQuery) || 
                            `mesa ${table.id}`.toLowerCase().includes(searchTableQuery.toLowerCase());
      
      const hasUnpaidOrders = orders.some(o => o.tableId === table.id && !o.isPaid);
      
      if (comandaTab === 'open') {
        return matchesSearch && hasUnpaidOrders;
      }
      return matchesSearch;
    });
  }, [tables, orders, comandaTab, searchTableQuery]);

  // Open tables with outstanding balances
  const openTablesCount = useMemo(() => {
    return tables.filter(t => t.isActive && orders.some(o => o.tableId === t.id && !o.isPaid)).length;
  }, [tables, orders]);

  // Orders associated with the selected table that are NOT paid
  const selectedTableOrders = useMemo(() => {
    if (!selectedTableId) return [];
    return orders.filter(order => order.tableId === selectedTableId && !order.isPaid);
  }, [orders, selectedTableId]);

  // Selected table data
  const selectedTableState = useMemo(() => {
    return tables.find(t => t.id === selectedTableId);
  }, [tables, selectedTableId]);

  // Setup default splits whenever table selection shifts
  React.useEffect(() => {
    if (selectedTableState && selectedTableState.peopleCount > 1) {
      setSplitCount(selectedTableState.peopleCount);
    } else {
      setSplitCount(1);
    }
    // Clean up temporary billing forms when table changes
    setDiscountValue(0);
    setServiceTaxPercent(10);
    setSelectedIndividualItems({});
    setIndividualPaymentMode(false);
    setSplitModeEnabled(false);
    setCashReceived('');
  }, [selectedTableId, selectedTableState]);

  // Flattened active items list for item checkout selection
  // Includes orderId and itemIndex to target items precisely
  const activeBillItems = useMemo(() => {
    const itemsList: Array<{
      orderId: string;
      itemIndex: number;
      item: OrderItem;
      key: string;
      title: string;
      unitPrice: number;
      quantityLeft: number;
      extrasCost: number;
    }> = [];

    selectedTableOrders.forEach(order => {
      order.items.forEach((item, idx) => {
        const left = item.quantity - (item.paidQuantity || 0);
        if (left > 0) {
          const extrasCost = item.extras.reduce((sum, extra) => sum + extra.price, 0);
          itemsList.push({
            orderId: order.id,
            itemIndex: idx,
            item,
            key: `${order.id}_${idx}`,
            title: item.name,
            unitPrice: item.price,
            quantityLeft: left,
            extrasCost
          });
        }
      });
    });

    return itemsList;
  }, [selectedTableOrders]);

  // Subtotal calculations
  // Case A: Whole Bill
  const subtotalWholeBill = useMemo(() => {
    return activeBillItems.reduce((sum, entry) => {
      const itemTotalWithExtras = entry.unitPrice + entry.extrasCost;
      return sum + (itemTotalWithExtras * entry.quantityLeft);
    }, 0);
  }, [activeBillItems]);

  // Case B: Individual Selected Items
  const subtotalSelectedItems = useMemo(() => {
    return activeBillItems.reduce((sum, entry) => {
      const selectedQty = selectedIndividualItems[entry.key] || 0;
      if (selectedQty <= 0) return sum;
      const itemTotalWithExtras = entry.unitPrice + entry.extrasCost;
      return sum + (itemTotalWithExtras * selectedQty);
    }, 0);
  }, [activeBillItems, selectedIndividualItems]);

  // Current subtotal based on current checkout mode
  const currentSubtotal = individualPaymentMode ? subtotalSelectedItems : subtotalWholeBill;

  // Service tax value
  const calculatedServiceTax = useMemo(() => {
    return currentSubtotal * (serviceTaxPercent / 100);
  }, [currentSubtotal, serviceTaxPercent]);

  // Discount value (capped at subtotal)
  const calculatedDiscount = useMemo(() => {
    if (discountType === 'percent') {
      return currentSubtotal * (discountValue / 100);
    }
    return Math.min(discountValue, currentSubtotal);
  }, [currentSubtotal, discountType, discountValue]);

  // Final total (Subtotal + Service Tax - Discount)
  const currentTotal = useMemo(() => {
    const value = currentSubtotal + calculatedServiceTax - calculatedDiscount;
    return Math.max(0, value);
  }, [currentSubtotal, calculatedServiceTax, calculatedDiscount]);

  // Price shared equally (split value)
  const splitShareValue = useMemo(() => {
    if (splitCount <= 1) return currentTotal;
    return currentTotal / splitCount;
  }, [currentTotal, splitCount]);

  // Handle checking/unchecking items in individual mode
  const handleToggleItemCheckbox = (key: string, maxQty: number) => {
    setSelectedIndividualItems(prev => {
      const next = { ...prev };
      if (next[key] && next[key] > 0) {
        delete next[key];
      } else {
        next[key] = 1; // start with 1 item
      }
      return next;
    });
  };

  const handleAdjustItemQuantity = (key: string, maxQty: number, delta: number) => {
    setSelectedIndividualItems(prev => {
      const curr = prev[key] || 0;
      const nextVal = curr + delta;
      
      if (nextVal <= 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      if (nextVal > maxQty) return prev;
      
      return {
        ...prev,
        [key]: nextVal
      };
    });
  };

  // Helper to change cash received
  const changeAmount = useMemo(() => {
    const cash = parseFloat(cashReceived) || 0;
    const paymentBasis = splitModeEnabled ? splitShareValue : currentTotal;
    if (cash < paymentBasis) return 0;
    return cash - paymentBasis;
  }, [cashReceived, currentTotal, splitModeEnabled, splitShareValue]);

  // Pay / Liquidate function
  const handleProcessPayment = (splitOnlyOneShare: boolean = false) => {
    if (!selectedTableId) return;
    if (currentTotal <= 0 && !splitOnlyOneShare) return;

    // Define amount and item updates
    const isPayingFraction = splitModeEnabled && splitOnlyOneShare;
    const isPayingSelectedItemsOnly = individualPaymentMode;

    // We build structured print parameters before updating states
    const itemsDetailsForReceipt: any[] = [];
    let receiptSubtotal = 0;

    if (isPayingSelectedItemsOnly) {
      // Receipt has only selected items
      activeBillItems.forEach(entry => {
        const qtyToPay = selectedIndividualItems[entry.key] || 0;
        if (qtyToPay > 0) {
          const itemTotal = (entry.unitPrice + entry.extrasCost) * qtyToPay;
          receiptSubtotal += itemTotal;
          itemsDetailsForReceipt.push({
            name: entry.title,
            qty: qtyToPay,
            price: entry.unitPrice,
            extras: entry.item.extras,
            total: itemTotal
          });
        }
      });
    } else if (isPayingFraction) {
      // Proportional receipt fraction
      receiptSubtotal = subtotalWholeBill / splitCount;
      itemsDetailsForReceipt.push({
        name: `Fração de Conta (1/${splitCount} Pessoas)`,
        qty: 1,
        price: receiptSubtotal,
        extras: [],
        total: receiptSubtotal
      });
    } else {
      // Full comanda payment
      activeBillItems.forEach(entry => {
        const itemTotal = (entry.unitPrice + entry.extrasCost) * entry.quantityLeft;
        receiptSubtotal += itemTotal;
        itemsDetailsForReceipt.push({
          name: entry.title,
          qty: entry.quantityLeft,
          price: entry.unitPrice,
          extras: entry.item.extras,
          total: itemTotal
        });
      });
    }

    const receiptTax = isPayingFraction ? 
      (calculatedServiceTax / splitCount) : calculatedServiceTax;
    const receiptDiscount = isPayingFraction ? 
      (calculatedDiscount / splitCount) : calculatedDiscount;
    const receiptTotal = Math.max(0, receiptSubtotal + receiptTax - receiptDiscount);

    const receiptData = {
      tableId: selectedTableId,
      items: itemsDetailsForReceipt,
      subtotal: receiptSubtotal,
      serviceTax: receiptTax,
      serviceTaxPercent: serviceTaxPercent,
      discount: receiptDiscount,
      total: receiptTotal,
      paymentMethod: paymentMethod.toUpperCase(),
      received: paymentMethod === 'dinheiro' ? (parseFloat(cashReceived) || receiptTotal) : receiptTotal,
      change: paymentMethod === 'dinheiro' ? changeAmount : 0,
      timestamp: new Date().toISOString(),
      peopleCount: splitCount,
      type: isPayingSelectedItemsOnly ? 'ITEMS' : isPayingFraction ? 'SPLIT_MEMBER' : 'FULL'
    };

    // Apply the actual business updates in database context
    setOrders(prevOrders => {
      let updatedOrders = [...prevOrders];

      if (isPayingSelectedItemsOnly) {
        // Increment paidQuantity for selected items
        updatedOrders = updatedOrders.map(order => {
          if (order.tableId !== selectedTableId || order.isPaid) return order;

          const updatedItems = order.items.map((item, idx) => {
            const key = `${order.id}_${idx}`;
            const qtyPaid = selectedIndividualItems[key] || 0;
            if (qtyPaid > 0) {
              const prevPaid = item.paidQuantity || 0;
              return {
                ...item,
                paidQuantity: prevPaid + qtyPaid
              };
            }
            return item;
          });

          // Check if entire order is fully paid now
          const isFullyPaid = updatedItems.every(item => (item.paidQuantity || 0) >= item.quantity);

          return {
            ...order,
            items: updatedItems,
            isPaid: isFullyPaid,
            status: isFullyPaid ? 'delivered' as const : order.status
          };
        });
      } else if (isPayingFraction) {
        // Splitting evenly usually means deducting value proportionally OR paying it down.
        // Since we are paying 1 fraction, we can simulate subtracting the quantity or registering a custom partial discount,
        // but to make it strictly bulletproof, we can register that 1 fraction is paid.
        // In our mock, if they pay the last remaining fraction, it closes the whole bill.
        // Let's create an elegant fractional state: if they pay the last fraction, or if splitCount <= 1, pay full!
        if (splitCount <= 1) {
          // Pay everything
          updatedOrders = updatedOrders.map(order => 
            order.tableId === selectedTableId ? { ...order, isPaid: true, status: 'delivered' as const } : order
          );
        } else {
          // Reduce the remaining liability of the table by updating the actual quantities, 
          // or if they pay 1 share, we can reduce the splitCount for the next customer!
          setSplitCount(prev => Math.max(1, prev - 1));
          
          // To track this payment, we can flag parts as paid, or we can just deduct a simulated partial payment from the orders total.
          // To keep it clean and simple: let's deduct proportional quantities of items as paid!
          // We distribute the 1/N fractional deduction across the items
          let remainingFractionToDeduct = 1 / splitCount;
          updatedOrders = updatedOrders.map(order => {
            if (order.tableId !== selectedTableId || order.isPaid) return order;
            
            const updatedItems = order.items.map(item => {
              const currentUnpaid = item.quantity - (item.paidQuantity || 0);
              if (currentUnpaid <= 0) return item;
              // deduct fraction of this item
              const deductQty = Math.max(0, Math.min(currentUnpaid, Math.round(item.quantity / splitCount) || 1));
              const prevPaid = item.paidQuantity || 0;
              return {
                ...item,
                paidQuantity: Math.min(item.quantity, prevPaid + deductQty)
              };
            });

            const isFullyPaid = updatedItems.every(item => (item.paidQuantity || 0) >= item.quantity);
            return {
              ...order,
              items: updatedItems,
              isPaid: isFullyPaid,
              status: isFullyPaid ? 'delivered' as const : order.status
            };
          });
        }
      } else {
        // Pay everything! Entire table bill cleared
        updatedOrders = updatedOrders.map(order => 
          order.tableId === selectedTableId ? { ...order, isPaid: true, status: 'delivered' as const } : order
        );
      }

      return updatedOrders;
    });

    // Check if everything is now paid on the table
    const tableOrdersWillAllBePaid = (() => {
      if (isPayingFraction && splitCount > 1) return false;
      if (isPayingSelectedItemsOnly) {
        // Check if there are items left unpaid after this payment
        const remainingUnpaidItems = activeBillItems.some(entry => {
          const qtyToPay = selectedIndividualItems[entry.key] || 0;
          return entry.quantityLeft - qtyToPay > 0;
        });
        return !remainingUnpaidItems;
      }
      return true;
    })();

    if (tableOrdersWillAllBePaid) {
      // Mark table as free and 0 people
      updateTable(selectedTableId, { peopleCount: 0 });
    }

    // Set and trigger receipt display
    setGeneratedReceiptData(receiptData);
    setShowReceipt(true);

    // Clean up inputs
    setSelectedIndividualItems({});
    setIndividualPaymentMode(false);
    setCashReceived('');
    if (tableOrdersWillAllBePaid) {
      setSelectedTableId(''); 
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto flex flex-col min-h-screen text-neutral-800 font-sans" id="cashier-view-root">
      
      {/* BANNER DE INSTABILIDADE DE CONEXÃO / RESILIÊNCIA */}
      {!isOnline && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex items-center gap-2.5 shadow-xs animate-pulse text-xs">
          <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <span className="font-extrabold block">Conexão Temporariamente Instável (Modo Resiliência)</span>
            <span className="opacity-90">O Caixa Registradora está funcionando offline. Suas emissões de cupom e fechamentos de comanda estão salvos localmente e serão sincronizados automaticamente assim que restabelecer a internet.</span>
          </div>
        </div>
      )}

      {/* HEADER ROW */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-neutral-900 text-amber-400 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
              <Sparkles className="w-3 h-3 text-amber-400" /> Operações PDV / Caixa
            </span>
            {isOnline ? (
              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-200 mb-2">
                <Wifi className="w-3 h-3 text-emerald-500 animate-pulse" /> Sincronizado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-[10px] font-bold border border-amber-200 mb-2 animate-pulse">
                <WifiOff className="w-3 h-3 text-amber-500" /> Offline (Local)
              </span>
            )}
          </div>
          <h1 className="text-3xl font-black text-neutral-900 tracking-tight">Caixa Registradora</h1>
          <p className="text-xs text-neutral-500 font-medium">Controle de consumo, taxas, divisão de contas e emissão de comprovantes.</p>
        </div>

        {/* COUNTER METRICS */}
        <div className="flex gap-4">
          <div className="bg-white border border-neutral-200 px-4 py-3 rounded-2xl shadow-xs flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${themeColors.bg} ${themeColors.text} flex items-center justify-center font-bold`}>
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider leading-none">Abertas</span>
              <span className="font-mono text-xl font-black text-neutral-900 leading-none">{openTablesCount}</span>
              <span className="text-[10px] text-neutral-400 block">Comandas ativas</span>
            </div>
          </div>
        </div>
      </div>

      {/* CORE CONTENT DOCK: 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT DOCK: TABLE SELECTOR & COMANDAS LIST (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-neutral-200 rounded-2xl shadow-xs overflow-hidden">
            
            {/* SEARCH AND FILTERS */}
            <div className="p-4 border-b border-neutral-100 space-y-3">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  id="search-table-input"
                  type="text"
                  placeholder="Pesquisar Mesa..."
                  value={searchTableQuery}
                  onChange={(e) => setSearchTableQuery(e.target.value)}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-hidden focus:border-neutral-400 transition"
                />
                {searchTableQuery && (
                  <button onClick={() => setSearchTableQuery('')} className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* TWO STATE BUTTON SWITCHER */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-neutral-100 rounded-xl text-xs font-bold border border-neutral-200">
                <button
                  id="tab-open-comandas"
                  onClick={() => setComandaTab('open')}
                  className={`py-2 rounded-lg transition-all text-center ${
                    comandaTab === 'open' 
                      ? 'bg-white text-neutral-900 shadow-xs' 
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  Comandas Abertas ({openTablesCount})
                </button>
                <button
                  id="tab-all-tables"
                  onClick={() => setComandaTab('all')}
                  className={`py-2 rounded-lg transition-all text-center ${
                    comandaTab === 'all' 
                      ? 'bg-white text-neutral-900 shadow-xs' 
                      : 'text-neutral-500 hover:text-neutral-800'
                  }`}
                >
                  Todas as Mesas ({tables.filter(t => t.isActive).length})
                </button>
              </div>
            </div>

            {/* TABLES LIST VIEW */}
            <div className="max-h-[550px] overflow-y-auto p-4 space-y-3 no-scrollbar">
              {filteredTables.length === 0 ? (
                <div className="py-12 text-center text-neutral-400 space-y-2">
                  <Layers className="w-8 h-8 mx-auto stroke-1 text-neutral-300" />
                  <p className="text-xs font-semibold">Nenhuma mesa encontrada</p>
                  <p className="text-[10px] text-neutral-400">Tente buscar por outro número ou altere o filtro acima.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-3">
                  {filteredTables.map((table) => {
                    const isSelected = selectedTableId === table.id;
                    const hasUnpaid = orders.some(o => o.tableId === table.id && !o.isPaid);
                    
                    // Sum total bill active
                    const tableUnpaidOrders = orders.filter(o => o.tableId === table.id && !o.isPaid);
                    const billSum = tableUnpaidOrders.reduce((sum, ord) => sum + ord.total, 0);

                    return (
                      <button
                        id={`btn-select-table-${table.id}`}
                        key={table.id}
                        onClick={() => setSelectedTableId(table.id)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? `${themeColors.border} ${themeColors.bg} shadow-xs ring-1 ring-neutral-200`
                            : hasUnpaid 
                              ? 'border-amber-250 bg-amber-50/40 hover:bg-amber-50/80 hover:border-amber-300' 
                              : 'border-neutral-200 bg-white hover:bg-neutral-50 hover:border-neutral-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl font-mono text-xs font-black flex items-center justify-center shadow-inner ${
                            isSelected 
                              ? `${themeColors.primary} text-white` 
                              : hasUnpaid 
                                ? 'bg-amber-500 text-neutral-950' 
                                : 'bg-neutral-100 text-neutral-500'
                          }`}>
                            #{table.id}
                          </div>

                          <div className="space-y-1">
                            <span className="font-extrabold text-xs text-neutral-900 block leading-none">Mesa {table.id}</span>
                            
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-neutral-400">
                              <Users className="w-3 h-3 text-neutral-400" />
                              <span>{table.peopleCount > 0 ? `${table.peopleCount} pessoas` : 'Livre'}</span>
                              {table.openedAt && (
                                <>
                                  <span className="text-neutral-300">•</span>
                                  <Clock className="w-3 h-3 text-neutral-400" />
                                  <span>{new Date(table.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* BILL ACCUMULATED STATUS */}
                        <div className="text-right">
                          {hasUnpaid ? (
                            <>
                              <span className="text-xs font-black text-neutral-950 font-mono block leading-none">R$ {billSum.toFixed(2)}</span>
                              <span className="text-[9px] font-black uppercase tracking-wide text-amber-600 block mt-1 animate-pulse">Comanda Aberta</span>
                            </>
                          ) : (
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Disponível</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* QUICK ACTIONS ON SIDEBAR FOOTER */}
            <div className="p-4 bg-neutral-50 border-t border-neutral-100 text-[11px] text-neutral-500 font-medium flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>O fluxo calcula somas em tempo real com base nos pedidos enviados ao KDS.</span>
            </div>

          </div>
        </div>

        {/* RIGHT DOCKS: BILL CONSUMPTION & CHECKOUT ACTIONS (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          <AnimatePresence mode="wait">
            {!selectedTableId ? (
              
              /* EMPTY CHOOSE STATE FOR UX REINFORCEMENT */
              <motion.div 
                key="empty-cashier"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="bg-white border border-neutral-200 rounded-3xl p-12 text-center shadow-xs flex flex-col items-center justify-center space-y-4 min-h-[500px]"
              >
                <div className={`w-16 h-16 rounded-2xl ${themeColors.bg} ${themeColors.text} flex items-center justify-center text-lg shadow-inner select-none animate-bounce`}>
                  💸
                </div>
                <div className="space-y-1.5 max-w-sm">
                  <h3 className="text-xl font-extrabold text-neutral-900 tracking-tight">Atendimento de Mesa</h3>
                  <p className="text-xs text-neutral-500 leading-relaxed font-semibold">
                    Para iniciar o fechamento de conta, aplicar descontos, cadastrar taxa ou faturar, <b>selecione uma mesa</b> com comanda ativa no menu lateral esquerda.
                  </p>
                </div>
                {openTablesCount > 0 && (
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold px-3 py-1.5 rounded-full">
                      Existem {openTablesCount} mesas ativas prontas para pagamento
                    </span>
                  </div>
                )}
              </motion.div>

            ) : (

              /* ACTIVE BILL WORKSPACE */
              <motion.div
                key={`table-workspace-${selectedTableId}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start"
              >
                
                {/* BILL ITEMS LIST (A: 7 COLS OF WORKSPACE) */}
                <div className="md:col-span-7 space-y-6 bg-white border border-neutral-200 rounded-2xl p-4 md:p-5 shadow-xs">
                  
                  {/* WORKSPACE HEADER */}
                  <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                    <div>
                      <span className="text-[10px] font-mono uppercase bg-neutral-100 px-2 py-0.5 rounded-sm font-bold text-neutral-500">CONSUMO ATIVO</span>
                      <h2 className="text-lg font-black text-neutral-905 tracking-tight flex items-center gap-1.5 mt-1">
                        Mesa {selectedTableId}
                        <span className="text-xs font-normal text-neutral-400">({selectedTableState?.peopleCount || 1} pessoas)</span>
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsExportOpen(true)}
                        className="flex items-center gap-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold py-1.5 px-3 rounded-xl transition cursor-pointer"
                        title="Exportar resumo para WhatsApp ou texto"
                      >
                        <Share2 className="w-3.5 h-3.5 text-neutral-500" />
                        <span>Exportar</span>
                      </button>

                      <button 
                        onClick={() => setSelectedTableId('')}
                        className="text-neutral-400 hover:text-neutral-600 p-1.5 rounded-full hover:bg-neutral-100 transition cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* CHOOSE MODALITY ROW: pagar comanda inteira vs pagar itens individuais */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-neutral-100 rounded-xl text-[11px] font-bold border border-neutral-200">
                    <button
                      id="opt-pay-full-bill"
                      onClick={() => {
                        setIndividualPaymentMode(false);
                        setSelectedIndividualItems({});
                      }}
                      className={`py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                        !individualPaymentMode 
                          ? 'bg-white text-neutral-900 shadow-xs' 
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Comanda Inteira</span>
                    </button>
                    <button
                      id="opt-pay-individual-items"
                      onClick={() => setIndividualPaymentMode(true)}
                      className={`py-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 ${
                        individualPaymentMode 
                          ? 'bg-white text-neutral-900 shadow-xs' 
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Itens Individuais</span>
                    </button>
                  </div>

                  {/* ACTIVE PRODUCTS LIST */}
                  <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1 no-scrollbar">
                    
                    {/* INFOMINIAL HELPER */}
                    {individualPaymentMode && (
                      <div className="bg-neutral-50 border border-neutral-200 p-3 rounded-xl flex items-start gap-2 text-[10px] text-neutral-600">
                        <Info className={`w-3.5 h-3.5 ${themeColors.text} shrink-0 mt-0.5`} />
                        <span className="font-semiboldLeading leading-snug">
                          Selecione os itens e as respectivas quantidades que deseja pagar nesta transação. O restante ficará pendente na mesa.
                        </span>
                      </div>
                    )}

                    {activeBillItems.length === 0 ? (
                      <div className="text-center py-12 text-neutral-400 space-y-1">
                        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 stroke-1" />
                        <p className="text-xs font-bold text-neutral-900">Nenhum item em aberto</p>
                        <p className="text-[10px]">Todos os itens desta mesa já foram integralmente liquidados!</p>
                      </div>
                    ) : (
                      activeBillItems.map((entry) => {
                        const isItemSelected = !!selectedIndividualItems[entry.key];
                        const selectedQty = selectedIndividualItems[entry.key] || 0;
                        const itemTotal = entry.unitPrice + entry.extrasCost;
                        
                        // Get total paid already tracker
                        const alreadyPaid = entry.item.paidQuantity || 0;

                        return (
                          <div
                            key={entry.key}
                            className={`p-3 rounded-xl border transition-all ${
                              individualPaymentMode && isItemSelected
                                ? `${themeColors.bg} ${themeColors.border}`
                                : 'bg-white border-neutral-150 hover:border-neutral-250'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              
                              <div className="flex items-start gap-2.5">
                                {/* Individual Selector Checkbox */}
                                {individualPaymentMode && (
                                  <button
                                    id={`checkbox-item-${entry.key}`}
                                    onClick={() => handleToggleItemCheckbox(entry.key, entry.quantityLeft)}
                                    className={`w-4 h-4 mt-0.5 rounded-sm border flex items-center justify-center transition shrink-0 cursor-pointer ${
                                      isItemSelected
                                        ? `${themeColors.primary} border-transparent text-white`
                                        : 'border-neutral-300 hover:border-neutral-400 bg-white'
                                    }`}
                                  >
                                    {isItemSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                  </button>
                                )}

                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span id={`item-qty-${entry.key}`} className="font-mono text-xs font-black text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded-sm">
                                      {entry.quantityLeft}x
                                    </span>
                                    <span id={`item-name-${entry.key}`} className="text-xs font-extrabold text-neutral-900">{entry.title}</span>
                                    
                                    {alreadyPaid > 0 && (
                                      <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1 rounded-sm">
                                        {alreadyPaid} pago{alreadyPaid > 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>

                                  {/* Item extras */}
                                  {entry.item.extras.length > 0 && (
                                    <p className="text-[10px] text-neutral-400 leading-tight">
                                      + {entry.item.extras.map(e => `${e.name} (+R$ ${e.price.toFixed(2)})`).join(', ')}
                                    </p>
                                  )}

                                  {/* Item customer name */}
                                  {entry.item.customerName && (
                                    <p className="text-[9px] font-bold text-neutral-400 leading-none">
                                      Cliente: {entry.item.customerName}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Price */}
                              <div className="text-right">
                                <span className="text-xs font-bold text-neutral-950 font-mono">
                                  R$ {itemTotal.toFixed(2)} uni
                                </span>
                                <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                  Total: R$ {(itemTotal * entry.quantityLeft).toFixed(2)}
                                </p>
                              </div>

                            </div>

                            {/* ADJUST QUANTITY BOX (ONLY WHEN CHECKED INDIVIDUAL PAYMENT) */}
                            {individualPaymentMode && isItemSelected && (
                              <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-neutral-500 uppercase">Qtd para pagar:</span>
                                
                                <div className="flex items-center gap-2">
                                  <button
                                    id={`btn-minus-qty-${entry.key}`}
                                    onClick={() => handleAdjustItemQuantity(entry.key, entry.quantityLeft, -1)}
                                    className="w-6 h-6 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center hover:bg-neutral-200 cursor-pointer"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span id={`qty-selected-display-${entry.key}`} className="font-mono text-xs font-black text-neutral-900 w-6 text-center">
                                    {selectedQty}
                                  </span>
                                  <button
                                    id={`btn-plus-qty-${entry.key}`}
                                    onClick={() => handleAdjustItemQuantity(entry.key, entry.quantityLeft, 1)}
                                    className="w-6 h-6 rounded-md bg-neutral-100 text-neutral-700 flex items-center justify-center hover:bg-neutral-200 cursor-pointer"
                                    disabled={selectedQty >= entry.quantityLeft}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}

                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* SPLITTING SETTINGS CARDS (EQUALLY SPLIT CONTROLS) */}
                  <div className="border-t border-neutral-150 pt-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="text-xs font-extrabold text-neutral-900 block leading-tight">Divisão por Pessoas</span>
                        <span className="text-[10px] text-neutral-400 block font-semibold">Dividir a conta igualmente entre os comensais da mesa.</span>
                      </div>

                      <button
                        id="toggle-split-bill"
                        onClick={() => setSplitModeEnabled(!splitModeEnabled)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold cursor-pointer transition ${
                          splitModeEnabled 
                            ? `${themeColors.primary} text-white shadow-xs` 
                            : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'
                        }`}
                      >
                        {splitModeEnabled ? 'Habilitado' : 'Dividir Conta'}
                      </button>
                    </div>

                    {splitModeEnabled && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 space-y-3.5 overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-neutral-600">Dividir igualmente em:</span>
                          
                          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-neutral-200 shadow-xs">
                            <button
                              id="btn-minus-people"
                              onClick={() => setSplitCount(prev => Math.max(1, prev - 1))}
                              className="w-7 h-7 bg-neutral-50 text-neutral-700 rounded-lg flex items-center justify-center hover:bg-neutral-100 cursor-pointer"
                            >
                              <Minus className="w-3 bg-transparent h-3" />
                            </button>
                            <input
                              id="people-count-input"
                              type="number"
                              min="1"
                              value={splitCount}
                              onChange={(e) => setSplitCount(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-10 text-center font-mono text-xs font-black text-neutral-900 focus:outline-hidden bg-transparent border-0"
                            />
                            <button
                              id="btn-plus-people"
                              onClick={() => setSplitCount(prev => prev + 1)}
                              className="w-7 h-7 bg-neutral-50 text-neutral-700 rounded-lg flex items-center justify-center hover:bg-neutral-100 cursor-pointer"
                            >
                              <Plus className="w-3 bg-transparent h-3" />
                            </button>
                          </div>
                        </div>

                        {/* LIVE CALCULATION METRICS CARD */}
                        <div className="bg-white p-3.5 rounded-xl border border-neutral-150 flex justify-between items-center shadow-xs">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-neutral-400 block tracking-wider leading-none">Divisão Igualitária</span>
                            <span className="text-xs font-black text-neutral-705 mt-1 block">R$ {currentTotal.toFixed(2)} total</span>
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] uppercase font-extrabold text-neutral-400 block tracking-wider leading-none">CADA PESSOA PAGA</span>
                            <span className="text-base font-black text-emerald-650 mt-1 block font-mono">
                              R$ {splitShareValue.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* SPLIT COMRADE ACTION BANNER */}
                        <div className="text-[10px] text-neutral-400 bg-white/50 border border-dashed border-neutral-200 p-2 text-center rounded-lg leading-snug">
                          Você pode faturar <b>apenas a fração</b> de 1 pessoa clicando em <b>"Pagar 1 Fração"</b> ou liquidar tudo de uma vez.
                        </div>
                      </motion.div>
                    )}
                  </div>

                </div>

                {/* THE CHECKOUT PANEL (B: 5 COLS OF WORKSPACE) */}
                <div className="md:col-span-5 space-y-6">
                  
                  {/* FEE & DISCOUNTS CARD */}
                  <div className="bg-white border border-neutral-200 rounded-2xl p-4 md:p-5 shadow-xs space-y-4">
                    <h4 className="font-extrabold text-xs text-neutral-900 uppercase tracking-tight pb-2 border-b border-neutral-100">
                      Taxas e Descontos
                    </h4>

                    {/* SERVICE TAX CHARGE */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-neutral-600">Taxa de Serviço: ({serviceTaxPercent}%)</label>
                      <div className="grid grid-cols-4 gap-1">
                        {[0, 10, 12, 15].map(pct => (
                          <button
                            id={`btn-service-pct-${pct}`}
                            key={pct}
                            onClick={() => setServiceTaxPercent(pct)}
                            className={`py-1.5 rounded-lg text-center font-mono text-[10px] font-extrabold cursor-pointer transition ${
                              serviceTaxPercent === pct 
                                ? `${themeColors.primary} text-white` 
                                : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* DISCOUNT TOGGLES */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-neutral-600">Aplicar Desconto:</label>
                        <div className="flex gap-1.5 text-[9px] font-bold">
                          <button
                            id="btn-discount-value"
                            onClick={() => {
                              setDiscountType('value');
                              setDiscountValue(0);
                            }}
                            className={`px-2 py-1 rounded-sm cursor-pointer ${discountType === 'value' ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-500'}`}
                          >
                            R$
                          </button>
                          <button
                            id="btn-discount-pct"
                            onClick={() => {
                              setDiscountType('percent');
                              setDiscountValue(0);
                            }}
                            className={`px-2 py-1 rounded-sm cursor-pointer ${discountType === 'percent' ? 'bg-neutral-800 text-white' : 'bg-neutral-100 text-neutral-500'}`}
                          >
                            %
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-xs font-extrabold text-neutral-400">
                          {discountType === 'value' ? 'R$' : '%'}
                        </span>
                        <input
                          id="discount-input"
                          type="number"
                          min="0"
                          max={discountType === 'percent' ? "100" : undefined}
                          value={discountValue || ''}
                          placeholder="0"
                          onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-semibold focus:outline-hidden focus:border-neutral-400 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* FINANCIAL TOTAL CHECKOUT PANEL SUMMARY */}
                  <div className="bg-neutral-900 text-white rounded-2xl p-4 md:p-5 space-y-4 shadow-md">
                    <h4 className="font-extrabold text-[10px] text-neutral-400 uppercase tracking-widest leading-none">Balanço / POS</h4>
                    
                    {/* FINANCIAL MATHS */}
                    <div className="space-y-3 font-mono text-[11px] text-neutral-350 pt-2 border-t border-neutral-800">
                      
                      {/* Subtotal row */}
                      <div className="flex justify-between items-center">
                        <span>Consumo Subtotal:</span>
                        <span className="text-white">R$ {currentSubtotal.toFixed(2)}</span>
                      </div>

                      {/* Service tax row */}
                      {calculatedServiceTax > 0 && (
                        <div className="flex justify-between items-center text-amber-350">
                          <span>Taxa Serviço (+{serviceTaxPercent}%):</span>
                          <span>+ R$ {calculatedServiceTax.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Discount row */}
                      {calculatedDiscount > 0 && (
                        <div className="flex justify-between items-center text-emerald-400">
                          <span>Desconto ({discountType === 'percent' ? `${discountValue}%` : 'Valor'}):</span>
                          <span>- R$ {calculatedDiscount.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="border-t border-neutral-800 my-1" />

                      {/* NET LIQUID PAYABLE */}
                      <div className="flex justify-between items-end pt-1">
                        <span className="font-sans font-bold text-white text-xs uppercase">TOTAL A COBRAR</span>
                        <div className="text-right">
                          <span id="pos-final-total" className="text-2xl font-black text-emerald-450 leading-none block">
                            R$ {currentTotal.toFixed(2)}
                          </span>
                        </div>
                      </div>

                    </div>

                    {/* SELECT METHOD OF ACTION */}
                    <div className="space-y-3 pt-3 border-t border-neutral-800">
                      <span className="text-[10px] font-bold uppercase text-neutral-400 block tracking-wider">Meio de Pagamento</span>
                      
                      {/* FOUR METHOD GRID */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: 'pix', label: 'PIX', icon: Sparkles },
                          { id: 'dinheiro', label: 'Dinheiro', icon: Wallet },
                          { id: 'credito', label: 'Crédito', icon: CreditCard },
                          { id: 'debito', label: 'Débito', icon: DollarSign }
                        ].map(method => {
                          const IconComp = method.icon;
                          const isSel = paymentMethod === method.id;
                          return (
                            <button
                              id={`payment-method-${method.id}`}
                              key={method.id}
                              onClick={() => {
                                setPaymentMethod(method.id as any);
                                setCashReceived('');
                              }}
                              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                                isSel
                                  ? `${themeColors.primary} text-white shadow-xs scale-102`
                                  : 'bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-750'
                              }`}
                            >
                              <IconComp className="w-3.5 h-3.5" />
                              <span>{method.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* CASH CALCULATOR DRAWER */}
                      {paymentMethod === 'dinheiro' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="bg-neutral-800 p-3 rounded-xl space-y-2 border border-neutral-700/50 overflow-hidden"
                        >
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase">Quantia Recebida:</label>
                            
                            {/* Preset Buttons */}
                            <div className="flex gap-1 text-[9px]">
                              {[10, 20, 50, 100].map(val => (
                                <button
                                  key={val}
                                  onClick={() => {
                                    const baseVal = splitModeEnabled ? splitShareValue : currentTotal;
                                    setCashReceived((Math.ceil(baseVal / 10) * 10 + val).toString());
                                  }}
                                  className="px-1.5 py-0.5 rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-300 font-mono"
                                >
                                  +{val}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-xs font-mono font-bold text-neutral-400">R$</span>
                            <input
                              id="cash-received-input"
                              type="number"
                              placeholder="Fórmula de Troco"
                              value={cashReceived}
                              onChange={(e) => setCashReceived(e.target.value)}
                              className="w-full bg-neutral-900 text-white font-mono border border-neutral-700 rounded-lg py-2 pl-9 pr-3 text-xs font-semibold focus:outline-hidden focus:border-neutral-500"
                            />
                          </div>

                          {parseFloat(cashReceived) > (splitModeEnabled ? splitShareValue : currentTotal) && (
                            <div className="flex justify-between items-center text-[10px] bg-neutral-950 p-2 rounded-lg font-mono text-emerald-450 border border-emerald-900/60 leading-none">
                              <span className="font-sans uppercase">TROCO DO CLIENTE:</span>
                              <span className="text-sm font-black text-emerald-400">
                                R$ {changeAmount.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {/* PROCESS BUTTON CONTROLLER */}
                      <div className="space-y-2 pt-2">
                        {splitModeEnabled && (
                          <button
                            id="btn-bill-pay-fraction"
                            onClick={() => handleProcessPayment(true)}
                            className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-250 font-extrabold text-xs py-2.5 rounded-xl border border-neutral-700 flex items-center justify-center gap-1.5 cursor-pointer transition"
                          >
                            <span>Pagar 1 Fração (R$ {splitShareValue.toFixed(2)})</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          id="btn-bill-checkout-submit"
                          onClick={() => handleProcessPayment(false)}
                          disabled={individualPaymentMode && subtotalSelectedItems <= 0}
                          className={`w-full text-neutral-950 font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition transform cursor-pointer active:scale-98 ${
                            individualPaymentMode && subtotalSelectedItems <= 0
                              ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
                              : 'bg-emerald-400 hover:bg-emerald-350 shadow-emerald-950/20'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4 text-neutral-950" />
                          <span>
                            {individualPaymentMode 
                              ? `Faturar Selecionados (R$ ${currentTotal.toFixed(2)})` 
                              : splitModeEnabled 
                                ? `Liquidar com Desconto Total (R$ ${currentTotal.toFixed(2)})` 
                                : `Finalizar e Registrar Comanda`}
                          </span>
                        </button>
                      </div>

                    </div>
                  </div>

                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* COMPROVANTE FISCAL E PRINT RECEIPT MODAL (ANALYTIC DIALOG DESIGNED BY ACCORDING RULE) */}
      <AnimatePresence>
        {showReceipt && generatedReceiptData && (
          <div className="fixed inset-0 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-white text-neutral-900 w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl relative border border-neutral-200"
            >
              
              {/* INTERLOCK THERMAL STRIP RECEIPT BAR */}
              <div className="bg-neutral-900 p-4 text-center text-white flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-xs font-black">
                  <Printer className="w-4 h-4 text-amber-400" />
                  <span>NFC-e Emitida</span>
                </div>
                <button 
                  onClick={() => setShowReceipt(false)}
                  className="p-1 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* RECEIPT PAPER GRAPHIC DESIGN */}
              <div className="p-6 space-y-4 font-mono text-[11px] bg-neutral-50 border-b-6 border-dashed border-neutral-200" id="thermal-receipt-container">
                
                <div className="text-center border-b border-dashed border-neutral-300 pb-3 space-y-1">
                  <span className="text-xl">🍔</span>
                  <h3 className="font-extrabold text-xs uppercase tracking-wider text-neutral-900">MesaMestre Lounge</h3>
                  <p className="text-[9px] text-neutral-400 uppercase">CNPJ: 50.812.390/0001-92</p>
                  <p className="text-[8px] text-neutral-400 uppercase leading-none">Vila Madalena, São Paulo - SP</p>
                </div>

                {/* TIMESTAMPS AND TABLE INFO */}
                <div className="space-y-1 text-neutral-500 border-b border-dashed border-neutral-300 pb-3">
                  <div className="flex justify-between"><span>DATA-HORA:</span> <span>{new Date(generatedReceiptData.timestamp).toLocaleString([], { hour12: false })}</span></div>
                  <div className="flex justify-between"><span>Nº VENDA:</span> <span>PDV-{Math.floor(100000 + Math.random() * 900000)}</span></div>
                  <div className="flex justify-between"><span>MESA ATENDIDA:</span> <span className="font-extrabold text-neutral-900">MESA #{generatedReceiptData.tableId}</span></div>
                  <div className="flex justify-between"><span>OPERADOR:</span> <span>GABRIEL G. - CAIXA 01</span></div>
                </div>

                {/* ITEMS TABLE */}
                <div className="space-y-2 border-b border-dashed border-neutral-300 pb-3">
                  <span className="font-bold text-neutral-900 uppercase block tracking-wide">ITENS DA COMPRA:</span>
                  
                  <div className="space-y-1.5 leading-tight">
                    {generatedReceiptData.items.map((it: any, k: number) => (
                      <div key={k} className="space-y-0.5">
                        <div className="flex justify-between">
                          <span>{it.qty}x {it.name}</span>
                          <span className="font-bold text-neutral-900">R$ {it.total.toFixed(2)}</span>
                        </div>
                        {it.extras && it.extras.length > 0 && (
                          <div className="text-[9px] text-neutral-400 pl-3">
                            + {it.extras.map((e: any) => e.name).join(', ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* VALUES MATH */}
                <div className="space-y-1 pt-1 text-neutral-700 leading-tight">
                  <div className="flex justify-between text-neutral-500"><span>SUBTOTAL DE ITENS:</span> <span>R$ {generatedReceiptData.subtotal.toFixed(2)}</span></div>
                  {generatedReceiptData.serviceTax > 0 && (
                    <div className="flex justify-between text-neutral-500"><span>TAXA SERVIÇO ({generatedReceiptData.serviceTaxPercent}%):</span> <span>R$ {generatedReceiptData.serviceTax.toFixed(2)}</span></div>
                  )}
                  {generatedReceiptData.discount > 0 && (
                    <div className="flex justify-between text-emerald-600"><span>DESCONTO DE CAIXA:</span> <span>- R$ {generatedReceiptData.discount.toFixed(2)}</span></div>
                  )}
                  
                  <div className="flex justify-between text-sm font-extrabold text-neutral-950 border-t border-dashed border-neutral-300 pt-2 font-black leading-none">
                    <span>VALOR TOTAL PAGO:</span>
                    <span>R$ {generatedReceiptData.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* PAYMENT INFO */}
                <div className="bg-white p-2 text-neutral-500 border border-neutral-200 rounded-lg space-y-1 text-[10px]">
                  <div className="flex justify-between text-neutral-800 font-bold"><span>FORMA PGTO:</span> <span className="uppercase">{generatedReceiptData.paymentMethod}</span></div>
                  {generatedReceiptData.paymentMethod === 'DINHEIRO' && (
                    <>
                      <div className="flex justify-between"><span>VALOR CONFIADO:</span> <span>R$ {generatedReceiptData.received}</span></div>
                      <div className="flex justify-between text-neutral-950 font-bold"><span>TROCO DISPENSADO:</span> <span>R$ {generatedReceiptData.change.toFixed(2)}</span></div>
                    </>
                  )}
                </div>

                <div className="text-center pt-2 space-y-1">
                  <p className="text-[8px] text-neutral-400 uppercase tracking-widest leading-none">OBRIGADO PELA PREFERÊNCIA!</p>
                  <p className="text-[7px] text-neutral-400 font-sans tracking-tight">Consulte pelo QR Code local ou acesse o Portal da Nota.</p>
                </div>

              </div>

              {/* ACTION ROW BAR */}
              <div className="p-4 bg-neutral-150 flex flex-col gap-2">
                <div className="flex gap-2">
                  <button
                    id="btn-print-thermal-action"
                    onClick={() => {
                      const printAlert = document.createElement('div');
                      printAlert.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-neutral-900 text-white border border-neutral-700 font-sans p-6 rounded-2xl shadow-2xl z-50 text-center text-xs max-w-sm';
                      printAlert.innerHTML = `
                        <span className="text-lg">🖨️</span>
                        <h4 className="font-extrabold text-sm mb-1 text-white">Disparando Bobina Térmica...</h4>
                        <p className="text-neutral-400">Cupom de venda enviado com sucesso para a impressora de balcão.</p>
                      `;
                      document.body.appendChild(printAlert);
                      setTimeout(() => printAlert.remove(), 2500);
                    }}
                    className={`flex-1 text-white font-black text-xs py-2.5 rounded-xl text-center flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 ${themeColors.primary}`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir Cupom</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsExportOpen(true);
                    }}
                    className="flex-1 bg-white border border-neutral-200 text-neutral-800 font-black text-xs py-2.5 rounded-xl text-center flex items-center justify-center gap-1.5 cursor-pointer hover:bg-neutral-50 transition"
                  >
                    <Share2 className="w-3.5 h-3.5 text-neutral-500" />
                    <span>WhatsApp / Texto</span>
                  </button>
                </div>
                <button
                  onClick={() => setShowReceipt(false)}
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-extrabold text-xs py-2.5 rounded-xl text-center transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE EXPORTAÇÃO COMPARTILHADA */}
      <AnimatePresence>
        {isExportOpen && (
          <ComandaExportModal
            tableId={selectedTableId || (generatedReceiptData ? generatedReceiptData.tableId : '')}
            isReceipt={!!generatedReceiptData && showReceipt}
            receiptData={generatedReceiptData}
            activeBillItems={activeBillItems}
            individualPaymentMode={individualPaymentMode}
            selectedIndividualItems={selectedIndividualItems}
            currentSubtotal={currentSubtotal}
            serviceTaxPercent={serviceTaxPercent}
            calculatedServiceTax={calculatedServiceTax}
            discountValue={discountValue}
            calculatedDiscount={calculatedDiscount}
            currentTotal={currentTotal}
            splitModeEnabled={splitModeEnabled}
            splitCount={splitCount}
            splitShareValue={splitShareValue}
            onClose={() => setIsExportOpen(false)}
          />
        )}
      </AnimatePresence>

    </div>
  );
};

// --- SUB-COMPONENT FOR EXPORTING BILL TO TEXT OR WHATSAPP ---
interface ComandaExportModalProps {
  tableId: string;
  isReceipt: boolean;
  receiptData: any;
  activeBillItems: any[];
  individualPaymentMode: boolean;
  selectedIndividualItems: Record<string, number>;
  currentSubtotal: number;
  serviceTaxPercent: number;
  calculatedServiceTax: number;
  discountValue: number;
  calculatedDiscount: number;
  currentTotal: number;
  splitModeEnabled: boolean;
  splitCount: number;
  splitShareValue: number;
  onClose: () => void;
}

const ComandaExportModal: React.FC<ComandaExportModalProps> = ({
  tableId,
  isReceipt,
  receiptData,
  activeBillItems,
  individualPaymentMode,
  selectedIndividualItems,
  currentSubtotal,
  serviceTaxPercent,
  calculatedServiceTax,
  discountValue,
  calculatedDiscount,
  currentTotal,
  splitModeEnabled,
  splitCount,
  splitShareValue,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  const summaryText = useMemo(() => {
    const restaurantName = "MesaMestre Lounge";
    const nowStr = new Date().toLocaleString('pt-BR', { hour12: false });

    if (isReceipt && receiptData) {
      let text = `*📄 ${restaurantName} - COMPROVANTE DE PGTO*\n`;
      text += `===================================\n`;
      text += `*MESA:* Mesa #${receiptData.tableId}\n`;
      text += `*DATA/HORA:* ${new Date(receiptData.timestamp).toLocaleString('pt-BR', { hour12: false })}\n`;
      text += `*COMPROVANTE:* PDV-${Math.floor(100000 + Math.random() * 900000)}\n`;
      text += `===================================\n`;
      text += `*ITENS PAGOS:*\n`;

      receiptData.items.forEach((it: any) => {
        text += `• ${it.qty}x ${it.name} - R$ ${it.total.toFixed(2)}`;
        if (it.extras && it.extras.length > 0) {
          text += `\n  └ _Adicionais: ${it.extras.map((e: any) => e.name).join(', ')}_`;
        }
        text += `\n`;
      });

      text += `===================================\n`;
      text += `*SUBTOTAL:* R$ ${receiptData.subtotal.toFixed(2)}\n`;
      if (receiptData.serviceTax > 0) {
        text += `*TAXA SERVIÇO (${receiptData.serviceTaxPercent}%):* R$ ${receiptData.serviceTax.toFixed(2)}\n`;
      }
      if (receiptData.discount > 0) {
        text += `*DESCONTO:* - R$ ${receiptData.discount.toFixed(2)}\n`;
      }
      text += `*TOTAL PAGO:* R$ ${receiptData.total.toFixed(2)}\n`;
      text += `===================================\n`;
      text += `*FORMA PGTO:* ${receiptData.paymentMethod}\n`;
      text += `===================================\n`;
      text += `_Obrigado pela preferência! Volte sempre!_`;
      return text;
    }

    // Pre-payment Active comanda summary
    let text = `*📋 ${restaurantName} - CONTA PARCIAL*\n`;
    text += `===================================\n`;
    text += `*MESA:* Mesa #${tableId}\n`;
    text += `*DATA/HORA:* ${nowStr}\n`;
    text += `===================================\n`;
    text += `*ITENS DO PEDIDO:*\n`;

    let itemsCount = 0;
    activeBillItems.forEach(entry => {
      const isPayingSelectedItemsOnly = individualPaymentMode;
      const qtyToInclude = isPayingSelectedItemsOnly ? (selectedIndividualItems[entry.key] || 0) : entry.quantityLeft;

      if (qtyToInclude > 0) {
        itemsCount++;
        const itemTotal = (entry.unitPrice + entry.extrasCost) * qtyToInclude;
        text += `• ${qtyToInclude}x ${entry.title} - R$ ${itemTotal.toFixed(2)}`;
        if (entry.item.extras && entry.item.extras.length > 0) {
          text += `\n  └ _Adicionais: ${entry.item.extras.map((e: any) => e.name).join(', ')}_`;
        }
        text += `\n`;
      }
    });

    if (itemsCount === 0) {
      text += `_Nenhum item selecionado_\n`;
    }

    text += `===================================\n`;
    text += `*SUBTOTAL:* R$ ${currentSubtotal.toFixed(2)}\n`;
    if (serviceTaxPercent > 0) {
      text += `*TAXA DE SERVIÇO (${serviceTaxPercent}%):* R$ ${calculatedServiceTax.toFixed(2)}\n`;
    }
    if (discountValue > 0) {
      text += `*DESCONTO:* - R$ ${calculatedDiscount.toFixed(2)}\n`;
    }

    text += `*TOTAL GERAL:* R$ ${currentTotal.toFixed(2)}\n`;

    if (splitModeEnabled && splitCount > 1) {
      text += `===================================\n`;
      text += `*DIVISÃO:* ${splitCount} pessoas\n`;
      text += `*VALOR INDIVIDUAL:* R$ ${splitShareValue.toFixed(2)} cada\n`;
    }

    text += `===================================\n`;
    text += `_Esta é uma prévia do consumo para conferência de mesa._`;
    return text;
  }, [
    tableId,
    isReceipt,
    receiptData,
    activeBillItems,
    individualPaymentMode,
    selectedIndividualItems,
    currentSubtotal,
    serviceTaxPercent,
    calculatedServiceTax,
    discountValue,
    calculatedDiscount,
    currentTotal,
    splitModeEnabled,
    splitCount,
    splitShareValue,
  ]);

  const handleCopy = () => {
    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(summaryText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
      <div className="bg-white rounded-3xl border border-neutral-205 p-6 max-w-md w-full shadow-2xl animate-fade-in relative flex flex-col max-h-[85vh]">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 bg-neutral-100 p-1.5 rounded-full cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1 pb-4 border-b border-neutral-100 shrink-0">
          <h3 className="text-lg font-black text-neutral-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-neutral-500" />
            <span>Exportar Resumo de Conta</span>
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            {isReceipt 
              ? 'Compartilhe o comprovante de pagamento final com o cliente.' 
              : 'Compartilhe a prévia do consumo da mesa via WhatsApp ou copie o texto formatado.'}
          </p>
        </div>

        {/* Text Area Preview styled beautifully */}
        <div className="flex-1 overflow-y-auto my-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-200 font-mono text-[11px] leading-relaxed whitespace-pre-wrap select-all">
          {summaryText}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className={`flex-1 py-3 px-4 rounded-xl border text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer ${
                copied 
                  ? 'bg-emerald-50 text-emerald-650 border-emerald-200' 
                  : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200'
              }`}
            >
              <Copy className="w-4 h-4" />
              <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 py-3 px-4 bg-[#25D366] hover:bg-[#1ebd54] text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              <MessageSquare className="w-4 h-4" />
              <span>WhatsApp</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-extrabold text-xs rounded-xl transition cursor-pointer"
          >
            Fechar Janela
          </button>
        </div>
      </div>
    </div>
  );
};

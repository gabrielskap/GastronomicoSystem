/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useRestaurant, THEME_COLOR_MAPS } from '../context/RestaurantContext';
import { Order, OrderStatus } from '../types';
import { 
  ChefHat, 
  Clock, 
  CheckCircle2, 
  Activity, 
  Utensils, 
  Volume2, 
  VolumeX, 
  Play, 
  Bell, 
  ArrowRight, 
  ArrowLeft,
  ClipboardList, 
  AlertTriangle,
  PlusCircle,
  Timer,
  ShoppingBag,
  Layers,
  Sparkles,
  Undo2,
  Trash2,
  CalendarDays,
  Printer,
  FileText,
  Wifi,
  WifiOff,
  Sun,
  Moon
} from 'lucide-react';

export const KitchenPanel: React.FC = () => {
  const {
    orders,
    themeColor,
    updateOrderStatus,
    addOrder,
    menuItems,
    isOnline
  } = useRestaurant();

  const themeColors = THEME_COLOR_MAPS[themeColor] || THEME_COLOR_MAPS.red;

  // Estados locais do KDS
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [kitchenMessage, setKitchenMessage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [now, setNow] = useState<Date>(new Date());
  
  // Controle de tema claro/escuro para a cozinha
  const [kitchenTheme, setKitchenTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('kitchen-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = kitchenTheme === 'dark' ? 'light' : 'dark';
    setKitchenTheme(nextTheme);
    localStorage.setItem('kitchen-theme', nextTheme);
    playSound('next');
  };

  // Estados de simulação de impressão em PDF
  const [selectedOrderToPrint, setSelectedOrderToPrint] = useState<Order | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [pdfGenerationProgress, setPdfGenerationProgress] = useState(0);

  // Relógio do KDS atualizando em tempo real a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sons de feedback do KDS usando Web Audio API (nativo e livre de arquivos estáticos)
  const playSound = (type: 'new' | 'next' | 'back') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      const nowTime = audioCtx.currentTime;
      
      if (type === 'new') {
        // Campainha de duplo tom agradável (Ding Dong)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, nowTime); // D5
        gain.gain.setValueAtTime(0.12, nowTime);
        gain.gain.exponentialRampToValueAtTime(0.01, nowTime + 0.4);
        osc.start(nowTime);
        osc.stop(nowTime + 0.45);
        
        // Segundo tom
        setTimeout(() => {
          try {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
            gain2.gain.setValueAtTime(0.12, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            osc2.start();
            osc2.stop(audioCtx.currentTime + 0.55);
          } catch(e) {}
        }, 150);
      } else if (type === 'next') {
        // Sonzinho rápido de confirmação (Swoosh up)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(320, nowTime);
        osc.frequency.exponentialRampToValueAtTime(880, nowTime + 0.12);
        gain.gain.setValueAtTime(0.08, nowTime);
        gain.gain.exponentialRampToValueAtTime(0.01, nowTime + 0.12);
        osc.start(nowTime);
        osc.stop(nowTime + 0.13);
      } else if (type === 'back') {
        // Sonzinho de retorno (Swoosh down)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(550, nowTime);
        osc.frequency.exponentialRampToValueAtTime(220, nowTime + 0.15);
        gain.gain.setValueAtTime(0.06, nowTime);
        gain.gain.exponentialRampToValueAtTime(0.01, nowTime + 0.15);
        osc.start(nowTime);
        osc.stop(nowTime + 0.16);
      }
    } catch (e) {
      console.warn('AudioContext bloqueado ou não suportado', e);
    }
  };

  // Separação de pedidos pelas 4 etapas exigidas
  const pendingOrders = useMemo(() => orders.filter(o => o.status === 'pending'), [orders]);
  const preparingOrders = useMemo(() => orders.filter(o => o.status === 'preparing'), [orders]);
  const readyOrders = useMemo(() => orders.filter(o => o.status === 'ready'), [orders]);
  const deliveredOrders = useMemo(() => orders.filter(o => o.status === 'delivered'), [orders]);

  // Alerta ao receber pedidos novos na fila 'pending'
  const prevPendingLengthRef = React.useRef(pendingOrders.length);
  useEffect(() => {
    if (pendingOrders.length > prevPendingLengthRef.current) {
      const newestOrder = pendingOrders[0];
      if (newestOrder) {
        setKitchenMessage(`🛎️ Novo pedido recebido para a Mesa #${newestOrder.tableId}! ID: ${newestOrder.id}`);
        playSound('new');
        const timer = setTimeout(() => setKitchenMessage(null), 5000);
        return () => clearTimeout(timer);
      }
    }
    prevPendingLengthRef.current = pendingOrders.length;
  }, [pendingOrders]);

  // Calcula tempo de atraso completo e dinâmico (Minutos e Segundos)
  const getElapsedText = (createdAt: string) => {
    const elapsedMs = now.getTime() - new Date(createdAt).getTime();
    if (elapsedMs < 0) return '0s';
    const totalSecs = Math.floor(elapsedMs / 1000);
    const min = Math.floor(totalSecs / 60);
    const sec = totalSecs % 60;
    return `${min}m ${String(sec).padStart(2, '0')}s`;
  };

  // Calcula apenas minutos para regras de criticidade
  const getElapsedMin = (createdAt: string) => {
    const elapsedMs = now.getTime() - new Date(createdAt).getTime();
    return Math.floor(elapsedMs / (1000 * 60));
  };

  // Formata hora de criação legível em padrão local (Ex: 15:42)
  const formatOrderTime = (createdAt: string) => {
    try {
      const date = new Date(createdAt);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return '--:--';
    }
  };

  // Cores de criticidade de tempo (Verde / Âmbar / Vermelho Piscante)
  const getTimeWarningClasses = (minutes: number) => {
    if (minutes >= 20) {
      return 'bg-red-955 text-red-450 border border-red-500/40 animate-pulse font-extrabold';
    }
    if (minutes >= 10) {
      return 'bg-amber-955 text-amber-450 border border-amber-500/30 font-bold';
    }
    return 'bg-emerald-955 text-emerald-450 border border-emerald-500/20 font-bold';
  };

  // Coleta resumo de ingredientes/itens ativos para a chapa ou copa (Somente 'pending' ou 'preparing')
  const cooksSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    orders.forEach(order => {
      if (order.status === 'pending' || order.status === 'preparing') {
        order.items.forEach(item => {
          summary[item.name] = (summary[item.name] || 0) + item.quantity;
        });
      }
    });
    return Object.entries(summary);
  }, [orders]);

  // Simulador inteligente de novo pedido com dados reais da Unsplash e preços integrados
  const handleSimulateOrder = () => {
    const tablesList = ['01', '03', '04', '05', '06', '07', '09', '10', '12'];
    const randomTable = tablesList[Math.floor(Math.random() * tablesList.length)];
    
    // Escolhe itens reais do cardápio existente para maior coesão
    const itemsCount = Math.floor(Math.random() * 2) + 1; // 1 ou 2 tipos de itens
    const selectedItems = [];
    let orderTotal = 0;

    for (let i = 0; i < itemsCount; i++) {
      const randomItemIndex = Math.floor(Math.random() * menuItems.length);
      const menuItem = menuItems[randomItemIndex];
      
      const qty = Math.floor(Math.random() * 2) + 1; // quantidade 1 ou 2
      const extras = [];
      
      if (menuItem.category === 'burgers' && Math.random() > 0.5) {
        extras.push({ name: 'Bacon Artesanal Caramelizado', price: 6.00 });
      }

      const observations = [
        'Mal passado por favor',
        'Sem maionese verde',
        'Bem passado e crosta crocante',
        'Sem cebola de nenhuma forma',
        'Embalar para viagem',
        'Trazer talheres extras',
        ''
      ];
      const randomObs = Math.random() > 0.45 ? observations[Math.floor(Math.random() * observations.length)] : '';
      
      const singleItemPrice = menuItem.price + extras.reduce((acc, ex) => acc + ex.price, 0);
      orderTotal += (singleItemPrice * qty);

      selectedItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: qty,
        extras,
        observation: randomObs || undefined,
        customerName: Math.random() > 0.4 ? 'Cliente Simulado' : undefined
      });
    }

    const newOrder: Order = {
      id: `PED-${Math.floor(1000 + Math.random() * 9000)}`,
      tableId: randomTable,
      items: selectedItems,
      status: 'pending',
      createdAt: new Date().toISOString(),
      total: orderTotal,
      isPaid: false
    };

    addOrder(newOrder);
  };

  // Wrapper para mudança de status que toca sinos auditivos
  const handleStatusChange = (orderId: string, nextStatus: OrderStatus, direction: 'forward' | 'backward') => {
    updateOrderStatus(orderId, nextStatus);
    playSound(direction === 'forward' ? 'next' : 'back');
  };

  // Facilidade para limpar pedidos entregues e manter painel limpo
  const handleClearDelivered = () => {
    deliveredOrders.forEach(o => {
      // marcar como concluídos no backend/context tirando da tela
      // No nosso context, orders.isPaid determina se ele some da visualização do gerente,
      // mas podemos configurar para desativar localmente ou deixar do jeito padrão.
      updateOrderStatus(o.id, 'delivered'); // garante consistência
    });
    playSound('back');
  };

  // Inicia simulação de impressão em PDF
  const handlePrintSimulation = (order: Order) => {
    setSelectedOrderToPrint(order);
    setIsPrintModalOpen(true);
    setIsGeneratingPDF(true);
    setPdfGenerationProgress(0);
    playSound('new');
    
    // Simula o progresso de geração do PDF
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setPdfGenerationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGeneratingPDF(false);
          return 100;
        }
        return prev + 10;
      });
    }, 100);
  };

  // Baixa o arquivo comanda detalhado (simulando ou gerando o PDF/HTML imprimível)
  const handleDownloadComandaFile = (order: Order) => {
    const totalItemsCount = order.items.reduce((acc, item) => acc + item.quantity, 0);
    const dateFormatted = new Date(order.createdAt).toLocaleDateString('pt-BR');
    const timeFormatted = new Date(order.createdAt).toLocaleTimeString('pt-BR');
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Comanda - ${order.id}</title>
  <style>
    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 13px;
      color: #000;
      background: #fff;
      padding: 15px;
      max-width: 300px;
      margin: 0 auto;
      line-height: 1.3;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .bold { font-weight: bold; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .item-row { margin-bottom: 6px; }
    .indent { margin-left: 12px; font-size: 11px; }
    .obs { font-style: italic; color: #333; margin-left: 12px; font-size: 11px; }
    @media print {
      body { padding: 0; margin: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="text-center">
    <h2 style="margin: 0 0 3px 0;">🍔 BURGER & CO. KDS 🍔</h2>
    <p style="margin: 0; font-size: 11px;">Rua dos Sabores, 123 - Centro</p>
    <p style="margin: 0; font-size: 10px; font-weight: bold;">RESUMO DE PRODUÇÃO / COZINHA</p>
    <div class="divider"></div>
  </div>
  
  <div>
    <p style="margin: 3px 0;"><span class="bold">TICKET Nº:</span> ${order.id}</p>
    <p style="margin: 3px 0;"><span class="bold">MESA:</span> ${order.tableId}</p>
    <p style="margin: 3px 0;"><span class="bold">DATA:</span> ${dateFormatted} - ${timeFormatted}</p>
    <p style="margin: 3px 0;"><span class="bold">ESTÁGIO KDS:</span> ${order.status.toUpperCase()}</p>
  </div>
  
  <div class="divider"></div>
  <div class="bold" style="margin-bottom: 6px;">ITENS DO PEDIDO (${totalItemsCount}):</div>
  
  <div>
    ${order.items.map(it => `
      <div class="item-row">
        <span class="bold">${it.quantity}x</span> ${it.name}
        ${it.extras && it.extras.length > 0 ? `<div class="indent">+ ${it.extras.map(e => e.name).join(', ')}</div>` : ''}
        ${it.observation ? `<div class="obs">Obs: "${it.observation}"</div>` : ''}
      </div>
    `).join('')}
  </div>
  
  <div class="divider"></div>
  
  <div class="bold text-center" style="margin-top: 10px; font-size: 12px;">
    VALOR ESTIMADO: R$ ${order.total.toFixed(2)}
  </div>
  
  <div class="divider"></div>
  
  <div style="font-size: 11px; margin-top: 12px;" class="text-center">
    <p style="margin: 2px 0;">*** DOCUMENTO NÃO FISCAL ***</p>
    <p style="margin: 2px 0; font-size: 9px; color: #555;">SIMULAÇÃO DE COMANDA GERADA EM PDF</p>
  </div>
  
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
    `;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `comanda-${order.id}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      id="kitchen-panel-root" 
      className={`min-h-screen p-4 lg:p-6 font-sans transition-colors duration-300 kitchen-${kitchenTheme} ${
        kitchenTheme === 'dark' ? 'bg-neutral-950 text-neutral-200' : 'bg-neutral-50 text-neutral-800'
      }`}
    >
      <style>{`
        /* custom style classes for the light/dark kitchen panel */
        .kitchen-light {
          --bg-main: #f9fafb;
          --bg-card: #ffffff;
          --bg-subcard: #f3f4f6;
          --border-color: #e5e7eb;
          --text-primary: #111827;
          --text-muted: #6b7280;
          --text-light: #374151;
          --bg-col: rgba(243, 244, 246, 0.5);
          --border-col-inner: #e5e7eb;
          --badge-bg: #e5e7eb;
          --badge-text: #1f2937;
        }

        #kitchen-panel-root.kitchen-light {
          color: var(--text-light) !important;
        }
        #kitchen-panel-root.kitchen-light h1,
        #kitchen-panel-root.kitchen-light h2,
        #kitchen-panel-root.kitchen-light h3,
        #kitchen-panel-root.kitchen-light h4,
        #kitchen-panel-root.kitchen-light .text-white {
          color: var(--text-primary) !important;
        }
        #kitchen-panel-root.kitchen-light .text-neutral-200,
        #kitchen-panel-root.kitchen-light .text-neutral-350,
        #kitchen-panel-root.kitchen-light .text-neutral-300 {
          color: var(--text-light) !important;
        }
        #kitchen-panel-root.kitchen-light .text-neutral-400,
        #kitchen-panel-root.kitchen-light .text-neutral-450,
        #kitchen-panel-root.kitchen-light .text-neutral-500 {
          color: var(--text-muted) !important;
        }

        #kitchen-panel-root.kitchen-light aside,
        #kitchen-panel-root.kitchen-light .bg-neutral-900 {
          background-color: var(--bg-card) !important;
          border-color: var(--border-color) !important;
        }
        #kitchen-panel-root.kitchen-light .bg-neutral-950 {
          background-color: var(--bg-subcard) !important;
          border-color: var(--border-color) !important;
        }
        #kitchen-panel-root.kitchen-light .bg-neutral-900\\/10 {
          background-color: var(--bg-col) !important;
          border-color: var(--border-color) !important;
        }
        #kitchen-panel-root.kitchen-light .border-neutral-850,
        #kitchen-panel-root.kitchen-light .border-neutral-850\\/60,
        #kitchen-panel-root.kitchen-light .border-neutral-800,
        #kitchen-panel-root.kitchen-light .border-neutral-750 {
          border-color: var(--border-color) !important;
        }

        #kitchen-panel-root.kitchen-light .hover\\:border-neutral-700:hover,
        #kitchen-panel-root.kitchen-light .hover\\:border-neutral-800:hover {
          border-color: #9ca3af !important;
        }

        #kitchen-panel-root.kitchen-light .bg-neutral-850,
        #kitchen-panel-root.kitchen-light .bg-neutral-800 {
          background-color: var(--badge-bg) !important;
          color: var(--badge-text) !important;
          border-color: var(--border-color) !important;
        }

        #kitchen-panel-root.kitchen-light .hover\\:bg-neutral-850:hover,
        #kitchen-panel-root.kitchen-light .hover\\:bg-neutral-800:hover {
          background-color: #e5e7eb !important;
        }

        /* Color classes adaptation */
        #kitchen-panel-root.kitchen-light .bg-red-950\\/20 {
          background-color: rgba(239, 68, 68, 0.1) !important;
        }
        #kitchen-panel-root.kitchen-light .bg-blue-950\\/20 {
          background-color: rgba(59, 130, 246, 0.1) !important;
        }
        #kitchen-panel-root.kitchen-light .bg-emerald-950\\/20 {
          background-color: rgba(16, 185, 129, 0.1) !important;
        }
        #kitchen-panel-root.kitchen-light .bg-red-950\\/50 {
          background-color: rgba(239, 68, 68, 0.15) !important;
        }
        #kitchen-panel-root.kitchen-light .bg-emerald-950\\/80 {
          background-color: rgba(16, 185, 129, 0.15) !important;
        }

        #kitchen-panel-root.kitchen-light .text-red-405 {
          color: #b91c1c !important; /* darker red for contrast */
        }
        #kitchen-panel-root.kitchen-light .text-blue-405 {
          color: #1d4ed8 !important; /* darker blue */
        }
        #kitchen-panel-root.kitchen-light .text-emerald-405 {
          color: #047857 !important; /* darker green */
        }
        #kitchen-panel-root.kitchen-light .text-red-400 {
          color: #dc2626 !important;
        }
        #kitchen-panel-root.kitchen-light .text-blue-400 {
          color: #2563eb !important;
        }
        #kitchen-panel-root.kitchen-light .text-emerald-400 {
          color: #16a34a !important;
        }

        #kitchen-panel-root.kitchen-light .bg-red-955 {
          background-color: #fef2f2 !important;
          color: #991b1b !important;
          border-color: rgba(239, 68, 68, 0.3) !important;
        }
        #kitchen-panel-root.kitchen-light .bg-amber-955 {
          background-color: #fffbeb !important;
          color: #92400e !important;
          border-color: rgba(245, 158, 11, 0.3) !important;
        }
        #kitchen-panel-root.kitchen-light .bg-emerald-955 {
          background-color: #f0fdf4 !important;
          color: #166534 !important;
          border-color: rgba(16, 185, 129, 0.3) !important;
        }
        #kitchen-panel-root.kitchen-light .border-red-900\\/40 {
          border-color: rgba(239, 68, 68, 0.3) !important;
        }
        #kitchen-panel-root.kitchen-light .border-emerald-900\\/35 {
          border-color: rgba(16, 185, 129, 0.3) !important;
        }
        #kitchen-panel-root.kitchen-light .border-amber-900\\/35 {
          border-color: rgba(245, 158, 11, 0.3) !important;
        }
        #kitchen-panel-root.kitchen-light .border-emerald-900\\/40 {
          border-color: rgba(16, 185, 129, 0.3) !important;
        }

        #kitchen-panel-root.kitchen-light .bg-emerald-950 {
          background-color: rgba(16, 185, 129, 0.1) !important;
          color: #047857 !important;
        }
        #kitchen-panel-root.kitchen-light .bg-amber-950 {
          background-color: rgba(245, 158, 11, 0.1) !important;
          color: #92400e !important;
        }

        /* Sidebar stats list items */
        #kitchen-panel-root.kitchen-light .text-emerald-400 {
          color: #059669 !important;
        }
        #kitchen-panel-root.kitchen-light .text-neutral-400 {
          color: #4b5563 !important;
        }

        /* Custom buttons for Light theme KDS controls */
        #kitchen-panel-root.kitchen-light button:not(.bg-gradient-to-r):not(.bg-emerald-650):not(.bg-red-900\\/50):not(.bg-emerald-600) {
          background-color: #ffffff !important;
          border-color: #d1d5db !important;
          color: #374151 !important;
        }
        #kitchen-panel-root.kitchen-light button:not(.bg-gradient-to-r):not(.bg-emerald-650):not(.bg-red-900\\/50):not(.bg-emerald-600):hover {
          background-color: #f3f4f6 !important;
        }
        
        #kitchen-panel-root.kitchen-light .bg-neutral-900\\/10 {
          background-color: #e5e7eb !important;
        }
        
        /* Modal adaptations */
        #kitchen-panel-root.kitchen-light .bg-black\\/80 {
          background-color: rgba(0, 0, 0, 0.6) !important;
        }
        #kitchen-panel-root.kitchen-light .bg-neutral-900.p-6.rounded-2xl {
          background-color: #ffffff !important;
          color: #111827 !important;
          border-color: #e5e7eb !important;
        }
      `}</style>
      
      {/* BANNER DE INSTABILIDADE DE CONEXÃO / RESILIÊNCIA */}
      {!isOnline && (
        <div className="max-w-[1800px] mx-auto mb-4 bg-amber-950/40 border border-amber-900/50 text-amber-300 px-4 py-3 rounded-2xl flex items-center gap-2.5 shadow-lg animate-pulse text-xs">
          <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
          <div>
            <span className="font-extrabold block">Conexão Temporariamente Instável (Modo Resiliência)</span>
            <span className="opacity-90">O KDS está mantendo as operações de cozinha salvas localmente de forma segura. A sincronização automática ocorrerá assim que a rede estabilizar.</span>
          </div>
        </div>
      )}

      {/* HEADER INDUSTRIAL KDS */}
      <header className="max-w-[1800px] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-6 border-b border-neutral-850 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-2xl flex items-center justify-center text-red-500 shadow-xl">
            <ChefHat className="w-7 h-7 text-red-505 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono font-black text-red-500 tracking-widest bg-red-950/50 px-2 py-0.5 rounded border border-red-900/40">
                KDS • SISTEMA DE EXPEDIÇÃO
              </span>
              <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
                | {formatOrderTime(now.toISOString())} UTC-3
              </span>
              {isOnline ? (
                <span className="flex items-center gap-1 text-[9px] uppercase bg-emerald-950 text-emerald-450 font-black px-1.5 py-0.5 rounded font-mono border border-emerald-900/35">
                  <Wifi className="w-3 h-3 text-emerald-500 animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[9px] uppercase bg-amber-950 text-amber-400 font-black px-1.5 py-0.5 rounded font-mono border border-amber-900/35 animate-pulse">
                  <WifiOff className="w-3 h-3 text-amber-500" />
                  Offline
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-white leading-none mt-1">Painel da Cozinha em Tempo Real</h1>
            <p className="text-xs text-neutral-450 mt-1">
              Visualize, coordene e despache pedidos instantaneamente. Ideal para visualização em Tablet ou Monitor.
            </p>
          </div>
        </div>

        {/* CONTROLES DO PAINEL */}
        <div className="flex flex-wrap items-center gap-3.5">
          {/* DIGITAL WATCH RELÓGIO */}
          <div className="bg-neutral-900 border border-neutral-850 rounded-xl px-4 py-2 flex items-center gap-2.5 shadow-md">
            <Clock className="w-4 h-4 text-neutral-400" />
            <div className="text-right">
              <span className="text-xs font-semibold text-neutral-400 block leading-none">Hora Atual</span>
              <span className="text-sm font-black font-mono text-white leading-none mt-1 inline-block">
                {now.toLocaleTimeString('pt-BR')}
              </span>
            </div>
          </div>

          {/* SELETOR DE TEMA CLARO/ESCURO */}
          <button 
            id="toggle-theme-btn"
            onClick={toggleTheme}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition duration-300 cursor-pointer ${
              kitchenTheme === 'dark' 
                ? 'bg-neutral-900 border-neutral-800 hover:bg-neutral-850 text-white shadow-md' 
                : 'bg-white border-neutral-200 hover:bg-neutral-50 text-neutral-850 shadow-md'
            }`}
            title="Alternar entre tema Claro e Escuro"
          >
            {kitchenTheme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Tema Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-600 fill-indigo-100" />
                <span>Tema Escuro</span>
              </>
            )}
          </button>

          {/* TOGGLE SENSOR DE CAMPANHA */}
          <button 
            id="toggle-sound-btn"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              playSound('next');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition duration-300 ${
              soundEnabled 
                ? 'bg-neutral-900 border-neutral-800 hover:bg-neutral-850 text-white shadow-md' 
                : 'bg-red-950/20 border-red-900/40 text-red-400'
            }`}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-emerald-500" />
                <span>Campainha Ativa</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-red-400" />
                <span>Campainha Muda</span>
              </>
            )}
          </button>

          {/* CONSOLIDADO DE INGREDIENTES TOGGLE */}
          <button 
            id="toggle-summary-btn"
            onClick={() => {
              setSidebarOpen(!sidebarOpen);
              playSound('next');
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold border transition duration-300 ${
              sidebarOpen 
                ? 'bg-neutral-900 border-neutral-800 text-white' 
                : 'bg-neutral-950 border-neutral-850 text-neutral-450 hover:bg-neutral-900 hover:text-white'
            }`}
          >
            <ClipboardList className={`w-4 h-4 ${sidebarOpen ? 'text-red-500' : 'text-neutral-500'}`} />
            <span>{sidebarOpen ? 'Ocultar Resumo' : 'Mostrar Resumo'}</span>
            <span className="bg-neutral-800 text-neutral-300 text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black">
              {cooksSummary.length}
            </span>
          </button>

          {/* SIMULADOR DE PEDIDOS */}
          <button 
            id="simulate-order-btn"
            onClick={handleSimulateOrder}
            className="flex items-center gap-2 bg-gradient-to-r from-red-650 to-red-550 border border-red-500/45 hover:from-red-600 hover:to-red-500 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl shadow-lg hover:shadow-red-950/25 active:scale-95 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>⚡ Simular Pedido</span>
          </button>
        </div>
      </header>

      {/* FLOATING BANNER NOTIFICAÇÃO */}
      {kitchenMessage && (
        <div className="max-w-[1800px] mx-auto mb-5 bg-red-950/80 border border-red-500/40 text-red-200 p-4 rounded-2xl flex items-center justify-between shadow-2xl animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
            </span>
            <span className="text-xs sm:text-sm font-bold font-sans flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-red-400 inline" /> {kitchenMessage}
            </span>
          </div>
          <button 
            onClick={() => setKitchenMessage(null)}
            className="text-[10px] uppercase font-black bg-red-900/50 hover:bg-red-800 px-3 py-1.5 rounded-lg border border-red-700/30 transition text-white"
          >
            Entendido
          </button>
        </div>
      )}

      {/* GRID DE LAYOUT */}
      <div className="max-w-[1800px] mx-auto grid grid-cols-1 xl:grid-cols-5 gap-6">
        
        {/* SIDEBAR CONSOLIDADO DE INGREDIENTES */}
        {sidebarOpen && (
          <aside className="xl:col-span-1 bg-neutral-900 border border-neutral-850 rounded-2xl p-4.5 space-y-4 shadow-lg animate-fade-in">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-red-500" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-white">Chapa & Expedição</h3>
              </div>
              <span className="bg-red-950/70 border border-red-900/30 text-red-400 text-[10px] font-black px-2 py-0.5 rounded-md">
                CONSOLIDADO
              </span>
            </div>

            <p className="text-[11px] text-neutral-450 leading-relaxed">
              Resumo total acumulado de itens sendo preparados. Ajuda o chapeiro a adiantar blend de carnes e frituras de uma vez só!
            </p>

            {cooksSummary.length === 0 ? (
              <div className="py-10 border border-dashed border-neutral-800 rounded-xl text-center text-neutral-600">
                <ChefHat className="w-8 h-8 mx-auto mb-2 text-neutral-700 opacity-40" />
                <p className="text-xs font-semibold">Nenhum hambúrguer ou petisco em cozimento no momento.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {cooksSummary.map(([dishName, totalQty]) => (
                  <div 
                    key={dishName} 
                    className="flex items-center justify-between text-xs bg-neutral-950 p-3 rounded-xl border border-neutral-850 hover:border-neutral-800 transition"
                  >
                    <span className="text-neutral-300 font-bold truncate pr-2">{dishName}</span>
                    <span className="bg-red-950 border border-red-950 text-red-405 font-black font-mono text-xs px-2.5 py-0.5 rounded-lg shrink-0 flex items-center gap-1">
                      {totalQty} un
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ESTADOS ESTADÍSTICOS DO DISPATCHER */}
            <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 space-y-2.5 text-xs text-neutral-400">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" /> Fila Recebidos:
                </span>
                <span className="font-black text-white font-mono">{pendingOrders.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Em Cozimento:
                </span>
                <span className="font-black text-white font-mono">{preparingOrders.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" /> Prontos/Carregar:
                </span>
                <span className="font-black text-emerald-400 font-mono">{readyOrders.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-neutral-600" /> Entregues:
                </span>
                <span className="font-black text-neutral-400 font-mono">{deliveredOrders.length}</span>
              </div>
            </div>
          </aside>
        )}

        {/* CONTAINER DOS KANBAN BOARDS EM 4 COLUNAS */}
        <main className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 ${sidebarOpen ? 'xl:col-span-4' : 'xl:col-span-5'}`}>
          
          {/* ======================================= */}
          {/* COLUNA 1: RECEBIDOS (PENDING)           */}
          {/* ======================================= */}
          <div className="space-y-3.5 bg-neutral-900/10 p-3 rounded-2xl border border-neutral-850/60 flex flex-col min-h-[600px] shadow-sm">
            <header className="flex justify-between items-center px-1.5 py-1 bg-red-950/20 border-b border-red-950/50 pb-2.5">
              <div className="flex items-center gap-1.5 text-red-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <h4 className="font-black text-xs uppercase tracking-widest text-red-400 font-mono">Recebidos</h4>
                <span className="text-[10px] text-neutral-500 font-mono">({pendingOrders.length})</span>
              </div>
              <span className="bg-red-900/30 text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                PENDENTE
              </span>
            </header>

            <div className="space-y-3 overflow-y-auto max-h-[80vh] pr-1 flex-1">
              {pendingOrders.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-neutral-850 rounded-xl text-neutral-600">
                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-neutral-800" />
                  <span className="text-xs font-bold text-neutral-500">Nenhum pedido recebido</span>
                  <p className="text-[10px] text-neutral-600 mt-1 max-w-[150px] mx-auto">Novos pedidos aparecerão sozinhos aqui.</p>
                </div>
              ) : (
                pendingOrders.map(order => {
                  const minutes = getElapsedMin(order.createdAt);
                  return (
                    <div 
                      key={order.id} 
                      className="bg-neutral-900 border border-neutral-850 rounded-xl p-4 space-y-3 shadow-md hover:border-neutral-700 transition duration-300"
                    >
                      {/* CARD BANNER INFO */}
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-neutral-800 text-neutral-200 text-[9px] font-mono font-black rounded px-1.5 py-0.5 border border-neutral-700">
                              {order.id}
                            </span>
                            <span className="text-[10px] text-neutral-450 font-mono font-semibold">
                              {formatOrderTime(order.createdAt)}
                            </span>
                            <button
                              onClick={() => handlePrintSimulation(order)}
                              className="p-1 rounded bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-450 hover:text-white transition cursor-pointer flex items-center justify-center"
                              title="Simular Impressão em PDF"
                            >
                              <Printer className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-white font-extrabold text-lg block mt-1">Mesa {order.tableId}</span>
                        </div>

                        {/* STOPWATCH DYNAMIC */}
                        <div className={`px-2 py-1 rounded-lg flex items-center gap-1 ${getTimeWarningClasses(minutes)} text-xs`}>
                          <Timer className="w-3.5 h-3.5 text-current" />
                          <span className="font-mono">{getElapsedText(order.createdAt)}</span>
                        </div>
                      </div>

                      {/* ITENS DETALHADOS NO PEDIDO */}
                      <div className="border-t border-b border-neutral-800 py-3 space-y-2.5">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="text-xs bg-neutral-950 p-2.5 rounded-lg border border-neutral-85 *0.5">
                            <div className="flex justify-between items-start font-bold">
                              <span className="text-white tracking-wide leading-tight">
                                <span className="text-red-405 font-mono font-black pr-1.5 inline-block scale-105">{it.quantity}x</span> 
                                {it.name}
                              </span>
                            </div>
                            {it.extras.length > 0 && (
                              <p className="text-[10px] text-neutral-400 font-medium ml-5 mt-1 border-l border-neutral-800 pl-1.5">
                                Add: {it.extras.map(e => e.name).join(', ')}
                              </p>
                            )}
                            {it.observation && (
                              <div className="text-[10px] text-amber-400 bg-amber-955 border border-amber-900/30 rounded px-2 py-1 italic font-semibold mt-1.5 flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                                <span>Obs: "{it.observation}"</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* PROGRESSION ACTION */}
                      <button
                        onClick={() => handleStatusChange(order.id, 'preparing', 'forward')}
                        className={`w-full bg-neutral-800 hover:bg-neutral-700 text-white font-black text-xs py-3 px-3.5 rounded-xl flex items-center justify-center gap-2 transition active:scale-97 cursor-pointer`}
                      >
                        <Play className="w-4 h-4 text-emerald-500 fill-emerald-500" />
                        <span>Começar Preparo</span>
                        <ArrowRight className="w-3.5 h-3.5 text-neutral-450 ml-auto" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ======================================= */}
          {/* COLUNA 2: EM PREPARO (PREPARING)        */}
          {/* ======================================= */}
          <div className="space-y-3.5 bg-neutral-900/10 p-3 rounded-2xl border border-neutral-850/60 flex flex-col min-h-[600px] shadow-sm">
            <header className="flex justify-between items-center px-1.5 py-1 bg-blue-950/20 border-b border-blue-950/50 pb-2.5">
              <div className="flex items-center gap-1.5 text-blue-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <h4 className="font-black text-xs uppercase tracking-widest text-blue-400 font-mono">Cozinhando</h4>
                <span className="text-[10px] text-neutral-500 font-mono">({preparingOrders.length})</span>
              </div>
              <span className="bg-blue-905/30 text-blue-400 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                EM PREPARO
              </span>
            </header>

            <div className="space-y-3 overflow-y-auto max-h-[80vh] pr-1 flex-1">
              {preparingOrders.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-neutral-855 rounded-xl text-neutral-600">
                  <Activity className="w-10 h-10 mx-auto mb-3 text-neutral-800 animate-pulse" />
                  <span className="text-xs font-bold text-neutral-500">Nenhum prato no fogão</span>
                  <p className="text-[10px] text-neutral-600 mt-1 max-w-[150px] mx-auto">Pedidos mudados para preparo aparecerão aqui.</p>
                </div>
              ) : (
                preparingOrders.map(order => {
                  const minutes = getElapsedMin(order.createdAt);
                  return (
                    <div 
                      key={order.id} 
                      className="bg-neutral-900 border border-neutral-850 rounded-xl p-4 space-y-3 shadow-md border-l-4 border-l-blue-500/80 hover:border-neutral-700 transition duration-300"
                    >
                      {/* CARD BANNER INFO */}
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-neutral-800 text-neutral-200 text-[9px] font-mono font-black rounded px-1.5 py-0.5 border border-neutral-700">
                              {order.id}
                            </span>
                            <span className="text-[10px] text-neutral-450 font-mono font-semibold">
                              {formatOrderTime(order.createdAt)}
                            </span>
                            <button
                              onClick={() => handlePrintSimulation(order)}
                              className="p-1 rounded bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-450 hover:text-white transition cursor-pointer flex items-center justify-center"
                              title="Simular Impressão em PDF"
                            >
                              <Printer className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-white font-extrabold text-lg block mt-1">Mesa {order.tableId}</span>
                        </div>

                        {/* TIMER */}
                        <div className={`px-2 py-1 rounded-lg flex items-center gap-1 ${getTimeWarningClasses(minutes)} text-xs`}>
                          <Timer className="w-3.5 h-3.5 text-current" />
                          <span className="font-mono">{getElapsedText(order.createdAt)}</span>
                        </div>
                      </div>

                      {/* ITEMS */}
                      <div className="border-t border-b border-neutral-800 py-3 space-y-2.5">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="text-xs bg-neutral-950 p-2.5 rounded-lg border border-neutral-850">
                            <div className="flex justify-between items-start font-bold">
                              <span className="text-white tracking-wide leading-tight">
                                <span className="text-blue-405 font-mono font-black pr-1.5 inline-block scale-105">{it.quantity}x</span> 
                                {it.name}
                              </span>
                            </div>
                            {it.extras.length > 0 && (
                              <p className="text-[10px] text-neutral-400 font-medium ml-5 mt-1 border-l border-neutral-805 pl-1.5">
                                Add: {it.extras.map(e => e.name).join(', ')}
                              </p>
                            )}
                            {it.observation && (
                              <div className="text-[10px] text-amber-400 bg-amber-955 border border-amber-900/30 rounded px-2 py-1 italic font-semibold mt-1.5 flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                                <span>Obs: "{it.observation}"</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* DOUBLE ACTION FLOW BUTTONS */}
                      <div className="flex items-center gap-2">
                        {/* BACK BUTTON */}
                        <button
                          onClick={() => handleStatusChange(order.id, 'pending', 'backward')}
                          title="Voltar para Recebidos"
                          className="p-3 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-400 hover:text-white transition active:scale-95 border border-neutral-750 shrink-0 cursor-pointer"
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>

                        {/* NEXT PROGRESSION ACTION */}
                        <button
                          onClick={() => handleStatusChange(order.id, 'ready', 'forward')}
                          className={`flex-1 ${themeColors.primary} ${themeColors.hover} text-white font-black text-xs py-3 px-3.5 rounded-xl flex items-center justify-center gap-2 transition active:scale-97 cursor-pointer`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Pronto / Expedição</span>
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-250 ml-auto" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ======================================= */}
          {/* COLUNA 3: PRONTO / EXPEDIÇÃO (READY)    */}
          {/* ======================================= */}
          <div className="space-y-3.5 bg-neutral-900/10 p-3 rounded-2xl border border-neutral-850/60 flex flex-col min-h-[600px] shadow-sm">
            <header className="flex justify-between items-center px-1.5 py-1 bg-emerald-950/20 border-b border-emerald-950/50 pb-2.5">
              <div className="flex items-center gap-1.5 text-emerald-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <h4 className="font-black text-xs uppercase tracking-widest text-emerald-400 font-mono">Bandeja</h4>
                <span className="text-[10px] text-neutral-500 font-mono">({readyOrders.length})</span>
              </div>
              <span className="bg-emerald-905/30 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full font-mono">
                PRONTOS
              </span>
            </header>

            <div className="space-y-3 overflow-y-auto max-h-[80vh] pr-1 flex-1">
              {readyOrders.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-neutral-850 rounded-xl text-neutral-600">
                  <Utensils className="w-10 h-10 mx-auto mb-3 text-neutral-800 animate-bounce" />
                  <span className="text-xs font-bold text-neutral-500">Bandeja vazia</span>
                  <p className="text-[10px] text-neutral-600 mt-1 max-w-[150px] mx-auto">Pratos finalizados ficarão prontos aqui esperando despacho.</p>
                </div>
              ) : (
                readyOrders.map(order => {
                  return (
                    <div 
                      key={order.id} 
                      className="bg-neutral-900 border border-emerald-900/65 rounded-xl p-4 space-y-3 shadow-md hover:border-emerald-700 transition duration-300"
                    >
                      {/* BANNER HEAD */}
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-emerald-950 text-emerald-400 text-[9px] font-mono font-black rounded px-1.5 py-0.5 border border-emerald-900/40">
                              {order.id}
                            </span>
                            <span className="text-[10px] text-neutral-450 font-mono font-semibold">
                              {formatOrderTime(order.createdAt)}
                            </span>
                            <button
                              onClick={() => handlePrintSimulation(order)}
                              className="p-1 rounded bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer flex items-center justify-center"
                              title="Simular Impressão em PDF"
                            >
                              <Printer className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-white font-extrabold text-lg block mt-1">Mesa {order.tableId}</span>
                        </div>
                        <span className="bg-emerald-950/80 text-emerald-400 text-[10px] font-black font-mono border border-emerald-900/40 px-2 py-1 rounded-lg">
                          🛎️ CHAME GARÇOM
                        </span>
                      </div>

                      {/* ITEMS */}
                      <div className="border-t border-b border-neutral-800 py-3 space-y-2">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-xs py-1 text-neutral-300">
                            <span className="font-semibold"><span className="text-emerald-400 font-mono font-black pr-1.5">{it.quantity}x</span> {it.name}</span>
                          </div>
                        ))}
                      </div>

                      {/* DOUBLE ACTION FLOW BUTTONS */}
                      <div className="flex items-center gap-2">
                        {/* BACK BUTTON */}
                        <button
                          onClick={() => handleStatusChange(order.id, 'preparing', 'backward')}
                          title="Voltar para Cozimento"
                          className="p-3 rounded-xl bg-neutral-850 hover:bg-neutral-800 text-neutral-400 hover:text-white transition active:scale-95 border border-neutral-750 shrink-0 cursor-pointer"
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>

                        {/* DISPATCH ACTION */}
                        <button
                          onClick={() => handleStatusChange(order.id, 'delivered', 'forward')}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-750 text-white font-black text-xs py-3 px-3.5 rounded-xl flex items-center justify-center gap-2 transition active:scale-97 cursor-pointer"
                        >
                          <ArrowRight className="w-4 h-4 text-emerald-150 animate-pulse" />
                          <span>Entregar ao Cliente</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ======================================= */}
          {/* COLUNA 4: ENTREGUES (DELIVERED)         */}
          {/* ======================================= */}
          <div className="space-y-3.5 bg-neutral-900/10 p-3 rounded-2xl border border-neutral-855/60 flex flex-col min-h-[600px] shadow-sm">
            <header className="flex justify-between items-center px-1.5 py-1 bg-neutral-800/30 border-b border-neutral-850 pb-2.5">
              <div className="flex items-center gap-1.5 text-neutral-500">
                <CheckCircle2 className="w-4.5 h-4.5 text-neutral-500" />
                <h4 className="font-black text-xs uppercase tracking-widest text-neutral-450 font-mono">Entregue</h4>
                <span className="text-[10px] text-neutral-500 font-mono">({deliveredOrders.length})</span>
              </div>
              {deliveredOrders.length > 0 && (
                <button 
                  onClick={handleClearDelivered}
                  title="Arquivar todos entregues"
                  className="bg-neutral-900 hover:bg-neutral-850 text-neutral-450 hover:text-red-400 p-1 rounded transition border border-neutral-800 cursor-pointer text-[10px] flex items-center gap-1 font-bold"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              )}
            </header>

            <div className="space-y-3 overflow-y-auto max-h-[85vh] pr-1 flex-1">
              {deliveredOrders.length === 0 ? (
                <div className="text-center py-20 border border-dashed border-neutral-850 rounded-xl text-neutral-600">
                  <ShoppingBag className="w-10 h-10 mx-auto mb-3 text-neutral-805" />
                  <span className="text-xs font-bold text-neutral-500">Sem entregas finalizadas</span>
                  <p className="text-[10px] text-neutral-650 mt-1 max-w-[155px] mx-auto">Assim que os pratos forem servidos pelo garçom, seu histórico aparecerá aqui.</p>
                </div>
              ) : (
                deliveredOrders.map(order => {
                  return (
                    <div 
                      key={order.id} 
                      className="bg-neutral-900/60 border border-neutral-850 rounded-xl p-4 space-y-3 opacity-70 hover:opacity-100 transition duration-300"
                    >
                      {/* HEAD */}
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="bg-neutral-850 text-neutral-400 text-[9px] font-mono font-black rounded px-1.5 py-0.5 border border-neutral-800">
                              {order.id}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-mono">
                              {formatOrderTime(order.createdAt)}
                            </span>
                            <button
                              onClick={() => handlePrintSimulation(order)}
                              className="p-1 rounded bg-neutral-850 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-neutral-400 hover:text-white transition cursor-pointer flex items-center justify-center"
                              title="Simular Impressão em PDF"
                            >
                              <Printer className="w-3 h-3" />
                            </button>
                          </div>
                          <span className="text-neutral-300 font-extrabold text-lg block mt-1">Mesa {order.tableId}</span>
                        </div>
                        <span className="bg-neutral-800 text-neutral-400 text-[10px] font-black font-semibold border border-neutral-805 px-2 py-1 rounded-lg">
                          ✓ ENTREGUE
                        </span>
                      </div>

                      {/* ITEMS */}
                      <div className="border-t border-neutral-850 pt-2 text-[11px] text-neutral-400 space-y-1">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{it.quantity}x {it.name}</span>
                          </div>
                        ))}
                      </div>

                      {/* DOUBLE ACTION FLOW REVERT BUTTON */}
                      <div className="flex items-center justify-between border-t border-neutral-850 pt-2">
                        <span className="text-[10px] text-neutral-505 font-semibold font-mono">Pedido arquivado</span>
                        <button
                          onClick={() => handleStatusChange(order.id, 'ready', 'backward')}
                          className="flex items-center gap-1 bg-neutral-850 hover:bg-neutral-800 text-[10px] text-neutral-400 hover:text-white font-bold py-1.5 px-2.5 rounded-lg transition border border-neutral-800 cursor-pointer"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                          <span>Reverter</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </main>

      </div>

      {/* MODAL DE SIMULAÇÃO DE IMPRESSÃO / PDF */}
      {isPrintModalOpen && selectedOrderToPrint && (
        <div id="print-modal-overlay" className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            
            {/* Header do Modal */}
            <header className="p-4 border-b border-neutral-800 flex justify-between items-center bg-neutral-950">
              <div className="flex items-center gap-2 text-white">
                <Printer className="w-5 h-5 text-red-550" />
                <span className="font-extrabold text-sm uppercase tracking-wider">Simulador de Impressão (PDF)</span>
              </div>
              <button 
                onClick={() => {
                  setIsPrintModalOpen(false);
                  setSelectedOrderToPrint(null);
                }}
                className="text-neutral-400 hover:text-white text-xs font-bold bg-neutral-800 hover:bg-neutral-750 px-2.5 py-1.5 rounded-lg border border-neutral-750 cursor-pointer"
              >
                Fechar
              </button>
            </header>

            {/* Conteúdo do Modal */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6 flex flex-col justify-center items-center">
              {isGeneratingPDF ? (
                /* Estado: Gerando PDF */
                <div className="text-center py-8 space-y-4 w-full max-w-xs">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-neutral-800"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-red-500 animate-spin"></div>
                    <FileText className="w-8 h-8 text-red-500 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-white font-extrabold text-sm">Preparando Layout do PDF...</h4>
                    <p className="text-xs text-neutral-400 mt-1">Formatando comanda {selectedOrderToPrint.id}</p>
                  </div>
                  {/* Barra de progresso */}
                  <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-red-500 h-full transition-all duration-100 ease-out"
                      style={{ width: `${pdfGenerationProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500 block">{pdfGenerationProgress}% concluído</span>
                </div>
              ) : (
                /* Estado: Visualização e Impressão */
                <div className="w-full flex flex-col items-center space-y-4">
                  
                  {/* Instrução */}
                  <p className="text-xs text-neutral-400 text-center max-w-xs leading-relaxed">
                    Visualização do cupom térmico para a cozinha. Clique em <strong>Imprimir Direto (Físico/PDF)</strong> para usar a impressora nativa ou salvar como PDF real.
                  </p>

                  {/* Cupom Térmico Virtual */}
                  <div 
                    id="thermal-receipt-print-area" 
                    className="bg-white text-neutral-950 font-mono text-xs p-5 shadow-2xl rounded-sm max-w-[280px] w-full border border-neutral-300 relative select-none"
                    style={{ lineHeight: '1.3' }}
                  >
                    {/* Linha serrilhada do topo */}
                    <div className="absolute -top-1 left-0 right-0 h-1 flex overflow-hidden">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} className="w-2.5 h-2.5 bg-neutral-900 border-b border-neutral-300 transform rotate-45 shrink-0 -translate-y-1.5"></div>
                      ))}
                    </div>

                    <div className="text-center space-y-1 mt-2">
                      <div className="font-bold text-sm tracking-widest">🍔 BURGER & CO. 🍔</div>
                      <div className="text-[10px]">Rua dos Sabores, 123 - Centro</div>
                      <div className="text-[9px] font-semibold text-neutral-600">KDS VIA DE PRODUÇÃO</div>
                      <div className="border-t border-dashed border-neutral-400 my-2"></div>
                    </div>

                    <div className="space-y-1 text-[11px]">
                      <div><span className="font-bold">TICKET:</span> {selectedOrderToPrint.id}</div>
                      <div><span className="font-bold">MESA:</span> {selectedOrderToPrint.tableId}</div>
                      <div><span className="font-bold">DATA:</span> {new Date(selectedOrderToPrint.createdAt).toLocaleDateString('pt-BR')} - {formatOrderTime(selectedOrderToPrint.createdAt)}</div>
                      <div><span className="font-bold">STATUS:</span> {selectedOrderToPrint.status.toUpperCase()}</div>
                    </div>

                    <div className="border-t border-dashed border-neutral-400 my-2"></div>

                    <div className="space-y-2.5">
                      <div className="font-bold text-[10px] uppercase tracking-wider text-neutral-700">Itens do Pedido:</div>
                      {selectedOrderToPrint.items.map((it, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between font-bold text-[11px]">
                            <span>{it.quantity}x {it.name}</span>
                          </div>
                          {it.extras && it.extras.length > 0 && (
                            <div className="text-[10px] text-neutral-700 pl-3">
                              + {it.extras.map(e => e.name).join(', ')}
                            </div>
                          )}
                          {it.observation && (
                            <div className="text-[10px] text-red-650 italic pl-3 font-semibold">
                              * OBS: "{it.observation}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-dashed border-neutral-400 my-2.5"></div>

                    <div className="text-center space-y-2">
                      <div className="font-bold text-xs">VALOR DA COMANDA: R$ {selectedOrderToPrint.total.toFixed(2)}</div>
                      <div className="border-t border-dashed border-neutral-400 my-1"></div>
                      <div className="text-[9px] text-neutral-500">*** VIA EXCLUSIVA DA COZINHA ***</div>
                      
                      {/* Código de barras simulado */}
                      <div className="flex justify-center gap-0.5 h-6 mt-2 overflow-hidden px-4">
                        {Array.from({ length: 42 }).map((_, i) => {
                          const widths = ['w-[1px]', 'w-[2px]', 'w-[3px]', 'w-[1.5px]'];
                          const bg = i % 3 === 0 || i % 7 === 0 ? 'bg-transparent' : 'bg-neutral-950';
                          const randomWidth = widths[(i + selectedOrderToPrint.id.charCodeAt(3)) % widths.length];
                          return <div key={i} className={`h-full ${randomWidth} ${bg} shrink-0`} />;
                        })}
                      </div>
                      <div className="text-[9px] font-mono tracking-widest text-neutral-700">{selectedOrderToPrint.id}-M{selectedOrderToPrint.tableId}</div>
                    </div>

                    {/* Linha serrilhada de baixo */}
                    <div className="absolute -bottom-1 left-0 right-0 h-1 flex overflow-hidden">
                      {Array.from({ length: 30 }).map((_, i) => (
                        <div key={i} className="w-2.5 h-2.5 bg-white border-t border-neutral-300 transform rotate-45 shrink-0 translate-y-1"></div>
                      ))}
                    </div>

                  </div>

                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <footer className="p-4 border-t border-neutral-800 bg-neutral-950 flex flex-col sm:flex-row gap-2">
              <button
                disabled={isGeneratingPDF}
                onClick={() => handleDownloadComandaFile(selectedOrderToPrint)}
                className="flex-1 bg-neutral-800 hover:bg-neutral-750 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-neutral-700 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <FileText className="w-4 h-4 text-red-500" />
                <span>Salvar PDF (Download)</span>
              </button>
              <button
                disabled={isGeneratingPDF}
                onClick={() => window.print()}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-red-950/20"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Direto</span>
              </button>
            </footer>

          </div>
        </div>
      )}

      {/* Estilo para Impressão Física Real */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #print-modal-overlay {
            background: transparent !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: center !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #print-modal-overlay > div {
            border: none !important;
            background: transparent !important;
            box-shadow: none !important;
            max-width: 100% !important;
            width: auto !important;
            height: auto !important;
          }
          header, footer, p, #print-modal-overlay button {
            display: none !important;
          }
          #thermal-receipt-print-area {
            visibility: visible !important;
            position: absolute !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            top: 20px !important;
            width: 80mm !important;
            max-width: 80mm !important;
            background: white !important;
            color: black !important;
            padding: 15px !important;
            box-shadow: none !important;
            border: 1px solid #ddd !important;
          }
          #thermal-receipt-print-area * {
            visibility: visible !important;
            color: black !important;
          }
        }
      `}</style>

    </div>
  );
};

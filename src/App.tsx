/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CustomerView } from './components/CustomerView';
import { AdminPanel } from './components/AdminPanel';
import { KitchenPanel } from './components/KitchenPanel';
import { CashierPanel } from './components/CashierPanel';
import { LoginScreen } from './components/LoginScreen';
import { 
  Smartphone, 
  ChefHat, 
  BarChart3, 
  Info, 
  Sparkles, 
  Settings, 
  Coffee, 
  Table,
  CreditCard
} from 'lucide-react';

function NavigationManager() {
  const [currentView, setCurrentView] = useState<'customer' | 'admin' | 'kitchen' | 'cashier'>('customer');
  const [isMobileWrapperEnabled, setIsMobileWrapperEnabled] = useState(true);
  const { activeTable, calls, orders } = useRestaurant();
  const { session, loading: authLoading } = useAuth();

  // Painéis da equipe exigem autenticação (o RLS depende do usuário logado).
  const painelLabels: Record<string, string> = { admin: 'Gerente', kitchen: 'Cozinha', cashier: 'Caixa' };
  const requiresAuth = currentView === 'admin' || currentView === 'kitchen' || currentView === 'cashier';
  const showLogin = requiresAuth && !authLoading && !session;

  // Badge alert counts for visual feedback
  const pendingCallsCount = calls.filter(c => c.status === 'pending').length;
  const activeOrdersCount = orders.filter(o => !o.isPaid && o.status !== 'delivered').length;

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col selection:bg-red-500 selection:text-white">
      
      {/* GLOBAL PERSISTENT FLIGHT CONTROL SWITCHER BAR */}
      <nav className="bg-neutral-950 border-b border-neutral-850 px-4 py-3 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🍽️</span>
            <div>
              <span className="text-white font-black text-sm tracking-tight block">MenuMesa POS & Digital Cardápio</span>
              <span className="text-[10px] text-neutral-400 block font-mono">React v19 + Tailwind v4 • Demonstração Reativa</span>
            </div>
          </div>

          {/* VIEW SWITCHER BUTTONS */}
          <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-800 gap-1 text-xs font-bold shadow-inner">
            <button
              id="switch-btn-customer"
              onClick={() => setCurrentView('customer')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 cursor-pointer ${
                currentView === 'customer' 
                  ? 'bg-neutral-800 text-white shadow-xs scale-102' 
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>📱 Cliente (Mesa {activeTable})</span>
            </button>

            <button
              id="switch-btn-admin"
              onClick={() => setCurrentView('admin')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 relative cursor-pointer ${
                currentView === 'admin' 
                  ? 'bg-neutral-850 text-white shadow-xs scale-102' 
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>🖥️ Painel Gerente</span>
              {pendingCallsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-neutral-950 text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black animate-bounce">
                  {pendingCallsCount}
                </span>
              )}
            </button>

            <button
              id="switch-btn-kitchen"
              onClick={() => setCurrentView('kitchen')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 relative cursor-pointer ${
                currentView === 'kitchen' 
                  ? 'bg-neutral-850 text-white shadow-xs scale-102' 
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>🍳 Cozinha (KDS)</span>
              {activeOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-650 text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-black">
                  {activeOrdersCount}
                </span>
              )}
            </button>

            <button
              id="switch-btn-cashier"
              onClick={() => setCurrentView('cashier')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 relative cursor-pointer ${
                currentView === 'cashier' 
                  ? 'bg-neutral-850 text-white shadow-xs scale-102' 
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>💸 Caixa</span>
            </button>
          </div>

          {/* SIMULATION GUIDE TOAST (HENCE PRODUCING HIGHEST UX CRAFT) */}
          <div className="hidden lg:flex items-center gap-2 bg-neutral-900/50 border border-neutral-800 rounded-lg px-3 py-1 text-[11px] text-neutral-350 max-w-sm">
            <Info className="w-3.5 h-3.5 text-red-500 shrink-0 animate-pulse" />
            <span className="leading-tight">
              <b>Dica:</b> Abra o Cliente, faça pedidos e veja-os atualizar na <b>Cozinha</b> e no <b>Gerente</b> instantaneamente!
            </span>
          </div>

        </div>
      </nav>

      {/* CORE WORKSPACE CONSOLE */}
      <div className="flex-1 flex flex-col">
        {showLogin ? (
          <div className="flex-1 bg-neutral-100 animate-fade-in">
            <LoginScreen painel={painelLabels[currentView]} />
          </div>
        ) : requiresAuth && authLoading ? (
          <div className="flex-1 flex items-center justify-center bg-neutral-100 text-neutral-400 text-sm animate-pulse">
            Verificando sessão...
          </div>
        ) : currentView === 'customer' ? (
          
          /* OPTIONAL SMARTPHONE CONTAINER SIMULATION ON WIDE SCREENS FOR DELIGHTFUL PRESENTATION */
          <div className="w-full h-full flex-1 md:bg-neutral-800 md:bg-[radial-gradient(#262626_1px,transparent_1px)] md:[background-size:16px_16px] flex flex-col items-center justify-start p-0 md:py-8 transition-all relative">
            
            {/* TOGGLE CONTAINER WRAPPER ON DESKTOP */}
            <div className="hidden md:flex items-center gap-4 mb-3 text-neutral-400 text-xs font-bold leading-none bg-neutral-950 border border-neutral-850 p-2.5 rounded-full shadow-lg">
              <span>Layout de Visualização:</span>
              <button
                onClick={() => setIsMobileWrapperEnabled(true)}
                className={`px-3 py-1.5 rounded-full transition ${isMobileWrapperEnabled ? 'bg-neutral-800 text-white' : 'hover:text-white'}`}
              >
                Simular Smartphone (Mobile First)
              </button>
              <button
                onClick={() => setIsMobileWrapperEnabled(false)}
                className={`px-3 py-1.5 rounded-full transition ${!isMobileWrapperEnabled ? 'bg-neutral-800 text-white' : 'hover:text-white'}`}
              >
                Ocupar Tela Cheia (Responsivo)
              </button>
            </div>

            {isMobileWrapperEnabled ? (
              /* REALISTIC PHONE VIEWPORT WITH PREMIUM SMOOTH EDGE BORDERS */
              <div className="w-full max-w-md bg-white md:rounded-[40px] md:shadow-2xl overflow-hidden md:border-[10px] md:border-neutral-950 flex flex-col relative aspect-[9/19.5] min-h-[750px] shadow-red-950/25">
                
                {/* Simulated Physical Notch Speaker on Top Spacer */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-4 bg-neutral-950 rounded-b-xl z-50 hidden md:block" />
                
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  <CustomerView />
                </div>
                
                {/* Bottom Home Indicator Bar simulated on phone view */}
                <div className="bg-white py-1.5 text-center hidden md:block shrink-0 border-t border-neutral-100">
                  <div className="w-28 h-1 bg-neutral-850 rounded-full mx-auto" />
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md mx-auto bg-white flex-1 flex flex-col shadow-inner">
                <CustomerView />
              </div>
            )}
          </div>

        ) : currentView === 'admin' ? (
          <div className="flex-1 bg-neutral-100 animate-fade-in">
            <AdminPanel />
          </div>
        ) : currentView === 'cashier' ? (
          <div className="flex-1 bg-neutral-100 animate-fade-in">
            <CashierPanel />
          </div>
        ) : (
          <div className="flex-1 bg-neutral-950 animate-fade-in">
            <KitchenPanel />
          </div>
        )}
      </div>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RestaurantProvider>
        <NavigationManager />
      </RestaurantProvider>
    </AuthProvider>
  );
}

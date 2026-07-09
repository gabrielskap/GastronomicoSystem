/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useRestaurant, THEME_COLOR_MAPS } from '../context/RestaurantContext';
import { MenuItem, Order, OrderStatus, TableState, WaiterCall, WaiterCallReason } from '../types';
import { EXTRA_ITEMS } from '../data/menuData';
import { 
  TrendingUp, 
  Users, 
  BellRing, 
  ChefHat, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Inbox, 
  Layers, 
  Palette, 
  Eye, 
  EyeOff,
  RefreshCw, 
  Check, 
  X,
  Search,
  Plus,
  Menu,
  ShoppingBag,
  Sliders,
  Calendar,
  CreditCard,
  Wallet,
  Settings,
  Utensils,
  PlusCircle,
  FolderOpen,
  Edit,
  Trash2,
  Star,
  Tag,
  QrCode,
  Download,
  Printer,
  Copy,
  History,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  AlertTriangle,
  Package,
  PackageX,
  Sparkles,
  Upload,
  Shield,
  Lock,
  Unlock,
  UserCheck,
  UserPlus,
  Key
} from 'lucide-react';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  AreaChart,
  Area,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

export const AdminPanel: React.FC = () => {
  const {
    menuItems,
    orders,
    calls,
    tables,
    themeColor,
    setThemeColor,
    customColor,
    setCustomColor,
    resolveCallWaiter,
    payAllOrdersOfTable,
    toggleItemAvailability,
    changeActiveTable,
    addMenuItem,
    updateItemPrice,
    updateMenuItem,
    removeMenuItem,
    createTable,
    updateTable,
    toggleTableActive
  } = useRestaurant();

  const themeColors = THEME_COLOR_MAPS[themeColor] || THEME_COLOR_MAPS.red;

  // Navigation state / Sidebar item selection
  const [activeSidebarTab, setActiveSidebarTab] = useState<'dashboard' | 'cardapio' | 'mesas' | 'pedidos' | 'cozinha' | 'caixa' | 'config' | 'auditoria' | 'estoque' | 'usuarios'>('dashboard');
  const [chartViewMode, setChartViewMode] = useState<'hour' | 'day'>('hour');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // --- STOCK RUPTURA STATES ---
  const [stockSearchQuery, setStockSearchQuery] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState<'all' | 'entradas' | 'burgers' | 'bebidas' | 'sobremesas'>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'out_of_stock' | 'normal'>('all');
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [editingStockValue, setEditingStockValue] = useState<string>('');

  // --- STOCK RUPTURA HELPER ACTIONS ---
  const handleDecreaseStock = (item: MenuItem) => {
    const currentStock = item.stock ?? 0;
    const newStock = Math.max(0, currentStock - 1);
    updateMenuItem({
      ...item,
      stock: newStock,
      isAvailable: newStock > 0 ? item.isAvailable : false
    });
  };

  const handleIncreaseStock = (item: MenuItem) => {
    const currentStock = item.stock ?? 0;
    const newStock = currentStock + 1;
    updateMenuItem({
      ...item,
      stock: newStock,
      isAvailable: newStock > 0 ? true : item.isAvailable
    });
  };

  const handleUpdateStockDirectly = (item: MenuItem, value: number) => {
    const val = isNaN(value) ? 0 : Math.max(0, value);
    updateMenuItem({
      ...item,
      stock: val,
      isAvailable: val > 0 ? item.isAvailable : false
    });
  };

  // --- PERSISTENT CASH AUDIT LOG STATES ---
  interface CashAuditLog {
    id: string;
    type: 'abertura' | 'fechamento' | 'sangria' | 'suprimento';
    timestamp: string;
    user: string;
    amount: number;
    description: string;
    balanceAfter: number;
  }

  const [auditLogs, setAuditLogs] = useState<CashAuditLog[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('menumesa_cashier_audit_logs');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // ignore
        }
      }
    }
    // Default initial logs representing today and yesterday
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    return [
      {
        id: 'LOG-1004',
        type: 'suprimento',
        timestamp: `${todayStr}T08:45:00.000Z`,
        user: 'Carlos (Supervisor)',
        amount: 150.00,
        description: 'Aporte de moedas e notas baixas para troco matutino',
        balanceAfter: 650.00
      },
      {
        id: 'LOG-1003',
        type: 'abertura',
        timestamp: `${todayStr}T08:00:00.000Z`,
        user: 'Gabriel (Gerente)',
        amount: 500.00,
        description: 'Abertura de caixa - Saldo base padrão em gaveta',
        balanceAfter: 500.00
      },
      {
        id: 'LOG-1002',
        type: 'fechamento',
        timestamp: '2026-07-08T23:30:00.000Z',
        user: 'Mariana (Operadora)',
        amount: 2840.50,
        description: 'Fechamento de caixa noturno - Conciliado com sucesso',
        balanceAfter: 0.00
      },
      {
        id: 'LOG-1001',
        type: 'sangria',
        timestamp: '2026-07-08T19:15:00.000Z',
        user: 'Gabriel (Gerente)',
        amount: 1200.00,
        description: 'Sangria de caixa - Recolhimento de excesso de cédulas para cofre',
        balanceAfter: 1640.50
      }
    ];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('menumesa_cashier_audit_logs', JSON.stringify(auditLogs));
    }
  }, [auditLogs]);

  // Audit log creation state
  const [isAddAuditLogOpen, setIsAddAuditLogOpen] = useState(false);
  const [newAuditType, setNewAuditType] = useState<'abertura' | 'fechamento' | 'sangria' | 'suprimento'>('sangria');
  const [newAuditUser, setNewAuditUser] = useState('Gabriel (Gerente)');
  const [newAuditAmount, setNewAuditAmount] = useState('');
  const [newAuditDescription, setNewAuditDescription] = useState('');
  const [auditLogSearch, setAuditLogSearch] = useState('');
  const [auditLogFilterType, setAuditLogFilterType] = useState<string>('all');

  // --- CASH METRICS AND FILTERING ---
  const cashMetrics = useMemo(() => {
    const sortedLogs = [...auditLogs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    let currentBalance = 0;
    let totalSangrias = 0;
    let totalSuprimentos = 0;
    let isCaixaAberto = false;
    let lastOpeningAmount = 0;
    
    sortedLogs.forEach(log => {
      if (log.type === 'abertura') {
        currentBalance = log.amount;
        lastOpeningAmount = log.amount;
        isCaixaAberto = true;
      } else if (log.type === 'fechamento') {
        currentBalance = 0;
        isCaixaAberto = false;
      } else if (log.type === 'suprimento') {
        currentBalance += log.amount;
        totalSuprimentos += log.amount;
      } else if (log.type === 'sangria') {
        currentBalance -= log.amount;
        totalSangrias += log.amount;
      }
    });
    
    return {
      currentBalance,
      totalSangrias,
      totalSuprimentos,
      isCaixaAberto,
      lastOpeningAmount
    };
  }, [auditLogs]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (auditLogFilterType !== 'all' && log.type !== auditLogFilterType) {
        return false;
      }
      
      if (auditLogSearch.trim()) {
        const query = auditLogSearch.toLowerCase();
        const matchesUser = log.user.toLowerCase().includes(query);
        const matchesDesc = log.description.toLowerCase().includes(query);
        const matchesId = log.id.toLowerCase().includes(query);
        const matchesType = log.type.toLowerCase().includes(query);
        return matchesUser || matchesDesc || matchesId || matchesType;
      }
      
      return true;
    });
  }, [auditLogs, auditLogFilterType, auditLogSearch]);

  const handleAddAuditLog = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(newAuditAmount);
    if (isNaN(amountNum) || amountNum < 0) {
      alert('Por favor, insira um valor válido e positivo.');
      return;
    }
    
    let newBalance = cashMetrics.currentBalance;
    if (newAuditType === 'abertura') {
      newBalance = amountNum;
    } else if (newAuditType === 'fechamento') {
      newBalance = 0;
    } else if (newAuditType === 'suprimento') {
      newBalance += amountNum;
    } else if (newAuditType === 'sangria') {
      newBalance -= amountNum;
    }
    
    const newLog: CashAuditLog = {
      id: `LOG-${Math.floor(1005 + Math.random() * 9000)}`,
      type: newAuditType,
      timestamp: new Date().toISOString(),
      user: newAuditUser,
      amount: amountNum,
      description: newAuditDescription.trim() || `${newAuditType.toUpperCase()} de caixa manual`,
      balanceAfter: Number(newBalance.toFixed(2))
    };
    
    setAuditLogs([newLog, ...auditLogs]);
    setIsAddAuditLogOpen(false);
    
    setNewAuditAmount('');
    setNewAuditDescription('');
    
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-5 right-5 bg-neutral-900 text-white font-sans px-4 py-2.5 rounded-xl shadow-2xl z-50 flex items-center gap-2 border border-neutral-700 text-xs';
    toast.innerHTML = `<span>✓ Registro de <b>${newAuditType.toUpperCase()}</b> inserido com sucesso!</span>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const handlePrintAuditReport = () => {
    const printAlert = document.createElement('div');
    printAlert.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-neutral-900 text-white border border-neutral-700 font-sans p-6 rounded-2xl shadow-2xl z-50 text-center text-xs max-w-sm';
    printAlert.innerHTML = `
      <span class="text-2xl block mb-2">🖨️</span>
      <h4 class="font-extrabold text-sm mb-1 text-white">Gerando Relatório de Auditoria...</h4>
      <p class="text-neutral-400">O log completo de auditoria de caixa foi formatado e enviado para a impressora administrativa de relatórios.</p>
    `;
    document.body.appendChild(printAlert);
    setTimeout(() => printAlert.remove(), 3000);
  };

  // States for Table Management Modals and Forms
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isAllQRsOpen, setIsAllQRsOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [tableFormError, setTableFormError] = useState('');

  const [editingTable, setEditingTable] = useState<TableState | null>(null);
  const [editTableNumber, setEditTableNumber] = useState('');
  const [editTableCapacity, setEditTableCapacity] = useState('4');
  const [editTablePeopleCount, setEditTablePeopleCount] = useState('0');
  const [editTableIsActive, setEditTableIsActive] = useState(true);

  // States for Modals and Forms
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [selectedTableDetails, setSelectedTableDetails] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'delivered'>('all');

  // AI & Upload states
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingImageEdit, setIsGeneratingImageEdit] = useState(false);
  const [dragActiveNew, setDragActiveNew] = useState(false);
  const [dragActiveEdit, setDragActiveEdit] = useState(false);

  const handleImageFileChange = (file: File, isEdit: boolean) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (isEdit) {
        setEditProductImage(base64);
      } else {
        setNewProductImage(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateImageAI = async (isEdit: boolean) => {
    const prompt = isEdit ? editProductName : newProductName;
    const category = isEdit ? editProductCategory : newProductCategory;

    if (!prompt.trim()) {
      setFormError('Por favor, insira o nome do prato antes de gerar uma imagem.');
      return;
    }

    if (isEdit) {
      setIsGeneratingImageEdit(true);
    } else {
      setIsGeneratingImage(true);
    }
    setFormError('');

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, category }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erro ao gerar imagem.');
      }

      if (isEdit) {
        setEditProductImage(data.imageUrl);
      } else {
        setNewProductImage(data.imageUrl);
      }
    } catch (err: any) {
      console.error('Erro ao gerar imagem:', err);
      setFormError(`Erro ao gerar imagem: ${err.message || 'Falha ao conectar com o serviço de IA'}. Verifique se a sua GEMINI_API_KEY está configurada nos Secrets.`);
    } finally {
      if (isEdit) {
        setIsGeneratingImageEdit(false);
      } else {
        setIsGeneratingImage(false);
      }
    }
  };
  
  // Custom Product Form state
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState<'entradas' | 'burgers' | 'bebidas' | 'sobremesas'>('burgers');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductOriginalPrice, setNewProductOriginalPrice] = useState('');
  const [newProductTime, setNewProductTime] = useState('15');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductImage, setNewProductImage] = useState('');
  const [newProductTags, setNewProductTags] = useState('Artesanal');
  const [newProductDisplayOrder, setNewProductDisplayOrder] = useState('0');
  const [newProductIsFeatured, setNewProductIsFeatured] = useState(false);
  const [newProductIsPromo, setNewProductIsPromo] = useState(false);
  const [newProductIsAvailable, setNewProductIsAvailable] = useState(true);
  const [newProductShowInMenu, setNewProductShowInMenu] = useState(true);
  const [newProductAvailableExtras, setNewProductAvailableExtras] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  // Editing Product states
  const [editingProduct, setEditingProduct] = useState<MenuItem | null>(null);
  const [editProductName, setEditProductName] = useState('');
  const [editProductCategory, setEditProductCategory] = useState<'entradas' | 'burgers' | 'bebidas' | 'sobremesas'>('burgers');
  const [editProductPrice, setEditProductPrice] = useState('');
  const [editProductOriginalPrice, setEditProductOriginalPrice] = useState('');
  const [editProductTime, setEditProductTime] = useState('15');
  const [editProductDescription, setEditProductDescription] = useState('');
  const [editProductImage, setEditProductImage] = useState('');
  const [editProductTags, setEditProductTags] = useState('');
  const [editProductDisplayOrder, setEditProductDisplayOrder] = useState('0');
  const [editProductIsFeatured, setEditProductIsFeatured] = useState(false);
  const [editProductIsPromo, setEditProductIsPromo] = useState(false);
  const [editProductIsAvailable, setEditProductIsAvailable] = useState(true);
  const [editProductShowInMenu, setEditProductShowInMenu] = useState(true);
  const [editProductAvailableExtras, setEditProductAvailableExtras] = useState<string[]>([]);

  // Deletion confirmation state
  const [productToDelete, setProductToDelete] = useState<MenuItem | null>(null);

  // Quick Edit states for price and stock
  const [quickEditItem, setQuickEditItem] = useState<MenuItem | null>(null);
  const [quickEditPrice, setQuickEditPrice] = useState<string>('');
  const [quickEditStock, setQuickEditStock] = useState<string>('');

  // Preset image collections for ease of mock registration
  const PRESET_IMAGES = [
    { name: 'Smashed Burger', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80' },
    { name: 'French Fries', url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80' },
    { name: 'Bruschetta', url: 'https://images.unsplash.com/photo-1572656631137-7935297eff55?auto=format&fit=crop&w=600&q=80' },
    { name: 'Cold Soda', url: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=600&q=80' },
    { name: 'Craft Beer', url: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=600&q=80' },
    { name: 'Sweet Dessert', url: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80' }
  ];

  // --- SYSTEM USERS & PERMISSIONS MODULE ---
  const DEFAULT_USERS = [
    {
      id: 'usr-1',
      name: 'Gabriel Gustavo',
      role: 'Gerente',
      color: 'bg-red-500 text-white',
      cpf: '123.456.789-00',
      birthDate: '1995-10-15',
      phone: '(11) 98888-7777',
      email: 'gabriel@barcrown.com',
      password: 'gerente123',
      permissions: {
        dashboard: true,
        cardapio: true,
        estoque: true,
        mesas: true,
        pedidos: true,
        cozinha: true,
        caixa: true,
        auditoria: true,
        config: true,
        usuarios: true
      }
    },
    {
      id: 'usr-2',
      name: 'Mariana Costa',
      role: 'Operadora',
      color: 'bg-emerald-500 text-white',
      cpf: '987.654.321-11',
      birthDate: '1998-04-20',
      phone: '(11) 97777-6666',
      email: 'mariana@barcrown.com',
      password: 'operadora123',
      permissions: {
        dashboard: false,
        cardapio: true,
        estoque: false,
        mesas: true,
        pedidos: true,
        cozinha: true,
        caixa: true,
        auditoria: false,
        config: false,
        usuarios: false
      }
    },
    {
      id: 'usr-3',
      name: 'Carlos Andrade',
      role: 'Supervisor',
      color: 'bg-amber-500 text-white',
      cpf: '555.666.777-88',
      birthDate: '1990-08-05',
      phone: '(11) 96666-5555',
      email: 'carlos@barcrown.com',
      password: 'supervisor123',
      permissions: {
        dashboard: true,
        cardapio: true,
        estoque: true,
        mesas: true,
        pedidos: true,
        cozinha: true,
        caixa: true,
        auditoria: true,
        config: false,
        usuarios: false
      }
    },
    {
      id: 'usr-4',
      name: 'Juliana Silveira',
      role: 'Mestre-Cervejeiro',
      color: 'bg-indigo-500 text-white',
      cpf: '444.333.222-11',
      birthDate: '1993-12-25',
      phone: '(11) 95555-4444',
      email: 'juliana@barcrown.com',
      password: 'mestre123',
      permissions: {
        dashboard: false,
        cardapio: true,
        estoque: true,
        mesas: false,
        pedidos: false,
        cozinha: true,
        caixa: false,
        auditoria: false,
        config: false,
        usuarios: false
      }
    }
  ];

  const [systemUsers, setSystemUsers] = useState<any[]>(() => {
    const saved = localStorage.getItem('crown_system_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure legacy parsed users have the fields, otherwise mix defaults
        return parsed.map((u: any, idx: number) => {
          const def = DEFAULT_USERS.find(d => d.id === u.id) || DEFAULT_USERS[idx] || DEFAULT_USERS[0];
          return {
            cpf: def.cpf,
            birthDate: def.birthDate,
            phone: def.phone,
            email: def.email,
            password: def.password,
            ...u
          };
        });
      } catch (e) {
        return DEFAULT_USERS;
      }
    }
    return DEFAULT_USERS;
  });

  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    return localStorage.getItem('crown_current_user_id') || 'usr-1';
  });

  // Track changes to users list
  useEffect(() => {
    localStorage.setItem('crown_system_users', JSON.stringify(systemUsers));
  }, [systemUsers]);

  // Track changes to current active user
  useEffect(() => {
    localStorage.setItem('crown_current_user_id', currentUserId);
  }, [currentUserId]);

  const currentUser = systemUsers.find(u => u.id === currentUserId) || systemUsers[0] || DEFAULT_USERS[0];

  // Form states for creating/editing a user (Unified CRUD)
  const [showUserCrudModal, setShowUserCrudModal] = useState(false);
  const [userCrudMode, setUserCrudMode] = useState<'create' | 'edit'>('create');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const [userFormName, setUserFormName] = useState('');
  const [userFormCpf, setUserFormCpf] = useState('');
  const [userFormBirthDate, setUserFormBirthDate] = useState('');
  const [userFormPhone, setUserFormPhone] = useState('');
  const [userFormEmail, setUserFormEmail] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormRole, setUserFormRole] = useState('Operador');
  const [userFormColor, setUserFormColor] = useState('bg-indigo-500 text-white');

  // Selected user to edit in the permissions tab
  const [selectedPermissionsUserId, setSelectedPermissionsUserId] = useState<string>('usr-1');
  const userToEditPermissions = systemUsers.find(u => u.id === selectedPermissionsUserId) || currentUser;

  // Dynamic search state inside Menu Tab
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuFilterCategory, setMenuFilterCategory] = useState<'all' | 'entradas' | 'burgers' | 'bebidas' | 'sobremesas'>('all');

  // --- REVENUE & STATS CALCULATIONS ---
  const [tableFilter, setTableFilter] = useState<string>('all');

  const activeTablesCount = useMemo(() => {
    return tables.filter(t => t.isActive && t.status !== 'livre').length;
  }, [tables]);

  const totalActiveTablesCount = useMemo(() => {
    return tables.filter(t => t.isActive).length;
  }, [tables]);

  const filteredTables = useMemo(() => {
    return tables.filter(t => {
      if (tableFilter === 'all') return true;
      if (tableFilter === 'inativas') return !t.isActive;
      if (!t.isActive) return false;
      return t.status === tableFilter;
    });
  }, [tables, tableFilter]);

  const pendingCallsCount = useMemo(() => {
    return calls.filter(c => c.status === 'pending').length;
  }, [calls]);

  // Faturamento Confirmado (Is Paid)
  const totalPaidRevenue = useMemo(() => {
    return orders
      .filter(o => o.isPaid)
      .reduce((sum, order) => sum + order.total, 0);
  }, [orders]);

  // Faturamento Estimado (All orders regardless of paid status)
  const totalEstimatedRevenue = useMemo(() => {
    return orders.reduce((sum, order) => sum + order.total, 0);
  }, [orders]);

  // Orders in cooking/serving stages
  const activeOrdersInKitchenCount = useMemo(() => {
    return orders.filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready').length;
  }, [orders]);

  // --- SALES PERFORMANCE GRAPH CALCULATIONS (RECHARTS) ---
  const hourlyData = useMemo(() => {
    const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '23:00'];
    const baseSales: Record<string, number> = {
      '08:00': 180,
      '10:00': 310,
      '12:00': 1250,
      '14:00': 950,
      '16:00': 420,
      '18:00': 1480,
      '20:00': 2100,
      '22:00': 1150,
      '23:00': 580,
    };
    const baseOrdersCount: Record<string, number> = {
      '08:00': 6,
      '10:00': 11,
      '12:00': 29,
      '14:00': 22,
      '16:00': 13,
      '18:00': 34,
      '20:00': 48,
      '22:00': 26,
      '23:00': 12,
    };

    orders.forEach(order => {
      try {
        const date = new Date(order.createdAt);
        const hourNum = date.getHours();
        
        let hourBucket = '23:00';
        if (hourNum < 9) hourBucket = '08:00';
        else if (hourNum < 11) hourBucket = '10:00';
        else if (hourNum < 13) hourBucket = '12:00';
        else if (hourNum < 15) hourBucket = '14:00';
        else if (hourNum < 17) hourBucket = '16:00';
        else if (hourNum < 19) hourBucket = '18:00';
        else if (hourNum < 21) hourBucket = '20:00';
        else if (hourNum < 23) hourBucket = '22:00';
        
        baseSales[hourBucket] += order.total;
        baseOrdersCount[hourBucket] += 1;
      } catch (e) {
        // Safe fail
      }
    });

    return hours.map(h => ({
      label: h,
      'Faturamento (R$)': Number(baseSales[h].toFixed(2)),
      'Pedidos': baseOrdersCount[h]
    }));
  }, [orders]);

  const dailyData = useMemo(() => {
    const daysOfWeek = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const baseSales = [3200, 2800, 3900, 4100, 6800, 8900, 7200];
    const baseOrders = [72, 65, 88, 92, 148, 195, 160];

    const todayIdx = (new Date().getDay() + 6) % 7; // monday=0 to sunday=6
    
    let todayExtraRevenue = 0;
    let todayExtraOrders = 0;
    orders.forEach(order => {
      todayExtraRevenue += order.total;
      todayExtraOrders += 1;
    });

    baseSales[todayIdx] += todayExtraRevenue;
    baseOrders[todayIdx] += todayExtraOrders;

    return daysOfWeek.map((day, idx) => ({
      label: day,
      'Faturamento (R$)': Number(baseSales[idx].toFixed(2)),
      'Pedidos': baseOrders[idx]
    }));
  }, [orders]);

  const chartData = useMemo(() => {
    return chartViewMode === 'hour' ? hourlyData : dailyData;
  }, [chartViewMode, hourlyData, dailyData]);

  // --- BEST SELLING PRODUCTS (Visão Geral - Produtos mais vendidos) ---
  const bestSellers = useMemo(() => {
    const initialMockSales: Record<string, { name: string; category: string; count: number; totalSales: number; image: string }> = {
      'burg-1': { name: 'Crown Smash Double Bacon', category: 'burgers', count: 48, totalSales: 48 * 46, image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=150&q=80' },
      'ent-1': { name: 'Batatas Rústicas com Trufa & Parmesão', category: 'entradas', count: 35, totalSales: 35 * 36, image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=150&q=80' },
      'beb-2': { name: 'Craft Beer IPA Imperial 450ml', category: 'bebidas', count: 28, totalSales: 28 * 24, image: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=150&q=80' },
      'sob-1': { name: 'Cheesecake Desconstruída de Pistache', category: 'sobremesas', count: 22, totalSales: 22 * 34, image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=150&q=80' },
    };

    // Aggregate real orders dynamically to reflect actual customer usage
    orders.forEach(order => {
      order.items.forEach(item => {
        const itemId = item.menuItemId;
        const menuItem = menuItems.find(m => m.id === itemId);
        const image = menuItem?.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=150&q=80';
        const category = menuItem?.category || 'burgers';
        
        if (initialMockSales[itemId]) {
          initialMockSales[itemId].count += item.quantity;
          initialMockSales[itemId].totalSales += item.price * item.quantity;
        } else {
          initialMockSales[itemId] = {
            name: item.name,
            category,
            count: item.quantity,
            totalSales: item.price * item.quantity,
            image
          };
        }
      });
    });

    return Object.values(initialMockSales)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [orders, menuItems]);

  // --- ANALYTICAL SELECTORS FOR THE NEW DASHBOARD COMPONENT ---
  const categorySalesData = useMemo(() => {
    const categoryTotals: Record<string, { category: string; name: string; value: number; revenue: number; color: string }> = {
      'burgers': { category: 'burgers', name: 'Hambúrgueres', value: 48, revenue: 2208, color: '#ef4444' },
      'entradas': { category: 'entradas', name: 'Entradas', value: 35, revenue: 1260, color: '#f97316' },
      'bebidas': { category: 'bebidas', name: 'Bebidas', value: 28, revenue: 672, color: '#3b82f6' },
      'sobremesas': { category: 'sobremesas', name: 'Sobremesas', value: 22, revenue: 748, color: '#8b5cf6' },
    };

    // Calculate real sales dynamically to add to base
    orders.forEach(order => {
      order.items.forEach(item => {
        const menuItem = menuItems.find(m => m.id === item.menuItemId || m.name === item.name);
        const cat = menuItem?.category || 'burgers';
        const key = cat.toLowerCase();
        
        if (categoryTotals[key]) {
          categoryTotals[key].value += item.quantity;
          categoryTotals[key].revenue += item.price * item.quantity;
        } else {
          const capitalizedLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
          categoryTotals[key] = {
            category: cat,
            name: capitalizedLabel,
            value: item.quantity,
            revenue: item.price * item.quantity,
            color: '#10b981'
          };
        }
      });
    });

    return Object.values(categoryTotals);
  }, [orders, menuItems]);

  const hourlyFlowData = useMemo(() => {
    // Generate hours of flow data grouped by hour block
    const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '23:00'];
    const baseOrdersCount: Record<string, number> = {
      '08:00': 6,
      '10:00': 11,
      '12:00': 29,
      '14:00': 22,
      '16:00': 13,
      '18:00': 34,
      '20:00': 48,
      '22:00': 26,
      '23:00': 12,
    };
    
    // Add real-time dynamic count
    orders.forEach(order => {
      try {
        const date = new Date(order.createdAt);
        const hourNum = date.getHours();
        
        let hourBucket = '23:00';
        if (hourNum < 9) hourBucket = '08:00';
        else if (hourNum < 11) hourBucket = '10:00';
        else if (hourNum < 13) hourBucket = '12:00';
        else if (hourNum < 15) hourBucket = '14:00';
        else if (hourNum < 17) hourBucket = '16:00';
        else if (hourNum < 19) hourBucket = '18:00';
        else if (hourNum < 21) hourBucket = '20:00';
        else if (hourNum < 23) hourBucket = '22:00';
        
        baseOrdersCount[hourBucket] += 1;
      } catch (e) {
        // Safe fail
      }
    });

    return hours.map(h => ({
      hour: h,
      'Pedidos': baseOrdersCount[h],
      'Taxa de Ocupação (%)': Math.min(100, Math.round((baseOrdersCount[h] / 50) * 100))
    }));
  }, [orders]);

  // Filtered lists
  const filteredMenuItems = useMemo(() => {
    return menuItems
      .filter(item => {
        const matchSearch = item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) || 
                            item.description.toLowerCase().includes(menuSearchQuery.toLowerCase());
        const matchCategory = menuFilterCategory === 'all' || item.category === menuFilterCategory;
        return matchSearch && matchCategory;
      })
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [menuItems, menuSearchQuery, menuFilterCategory]);

  const lowAvailabilityCount = useMemo(() => {
    return menuItems.filter(item => (item.stock !== undefined && item.stock <= 3) || !item.isAvailable).length;
  }, [menuItems]);

  const filteredStockItems = useMemo(() => {
    return menuItems.filter(item => {
      // Search
      if (stockSearchQuery.trim()) {
        const query = stockSearchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(query);
        const matchId = item.id.toLowerCase().includes(query);
        if (!matchName && !matchId) return false;
      }
      // Category
      if (stockCategoryFilter !== 'all' && item.category !== stockCategoryFilter) {
        return false;
      }
      // Status
      const isLow = item.stock !== undefined && item.stock > 0 && item.stock <= 3;
      const isOut = item.stock === 0 || !item.isAvailable;
      if (stockStatusFilter === 'low') {
        return isLow;
      }
      if (stockStatusFilter === 'out_of_stock') {
        return isOut;
      }
      if (stockStatusFilter === 'normal') {
        return !isLow && !isOut;
      }
      return true;
    });
  }, [menuItems, stockSearchQuery, stockCategoryFilter, stockStatusFilter]);

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return orders;
    return orders.filter(o => o.status === orderFilter);
  }, [orders, orderFilter]);

  // Selected table helper objects
  const selectedTableState = useMemo(() => {
    if (!selectedTableDetails) return null;
    return tables.find(t => t.id === selectedTableDetails) || null;
  }, [tables, selectedTableDetails]);

  const selectedTableOrders = useMemo(() => {
    if (!selectedTableDetails) return [];
    return orders.filter(o => o.tableId === selectedTableDetails && !o.isPaid);
  }, [orders, selectedTableDetails]);

  const selectedTableCalls = useMemo(() => {
    if (!selectedTableDetails) return [];
    return calls.filter(c => c.tableId === selectedTableDetails && c.status === 'pending');
  }, [calls, selectedTableDetails]);

  // --- ACTIONS ---
  const handleAddNewProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newProductName.trim()) {
      setFormError('O nome do produto é obrigatório.');
      return;
    }
    const priceNum = parseFloat(newProductPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('Insira um preço de venda válido.');
      return;
    }

    const imageToUse = newProductImage.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

    const tagsArray = newProductTags.split(',').map(t => t.trim()).filter(Boolean);

    const newItem: MenuItem = {
      id: `prod-${Date.now()}`,
      name: newProductName,
      description: newProductDescription.trim() || 'Produto delicioso artesanal feito com ingredientes frescos.',
      price: priceNum,
      originalPrice: newProductOriginalPrice ? parseFloat(newProductOriginalPrice) : undefined,
      category: newProductCategory,
      image: imageToUse,
      isAvailable: newProductIsAvailable,
      showInMenu: newProductShowInMenu,
      estimatedTimeMin: parseInt(newProductTime) || 12,
      tags: tagsArray.length > 0 ? tagsArray : ['Novo'],
      displayOrder: parseInt(newProductDisplayOrder) || 0,
      isFeatured: newProductIsFeatured,
      isPromo: newProductIsPromo,
      availableExtras: newProductAvailableExtras
    };

    addMenuItem(newItem);

    // Show custom visual success notification
    const snack = document.createElement('div');
    snack.className = 'fixed top-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 font-bold text-xs animate-bounce border border-emerald-500';
    snack.innerHTML = `🌟 <span><b>${newProductName}</b> cadastrado no cardápio!</span>`;
    document.body.appendChild(snack);
    setTimeout(() => snack.remove(), 3500);

    // Reset Form
    setNewProductName('');
    setNewProductPrice('');
    setNewProductOriginalPrice('');
    setNewProductTime('15');
    setNewProductDescription('');
    setNewProductImage('');
    setNewProductTags('Artesanal');
    setNewProductDisplayOrder('0');
    setNewProductIsFeatured(false);
    setNewProductIsPromo(false);
    setNewProductIsAvailable(true);
    setNewProductShowInMenu(true);
    setNewProductAvailableExtras([]);
    setIsAddProductOpen(false);
  };

  const handleOpenEditProduct = (item: MenuItem) => {
    setEditingProduct(item);
    setEditProductName(item.name);
    setEditProductCategory(item.category);
    setEditProductPrice(String(item.price));
    setEditProductOriginalPrice(item.originalPrice ? String(item.originalPrice) : '');
    setEditProductTime(String(item.estimatedTimeMin));
    setEditProductDescription(item.description);
    setEditProductImage(item.image);
    setEditProductTags(item.tags.join(', '));
    setEditProductDisplayOrder(String(item.displayOrder ?? 0));
    setEditProductIsFeatured(!!item.isFeatured);
    setEditProductIsPromo(!!item.isPromo);
    setEditProductIsAvailable(item.isAvailable);
    setEditProductShowInMenu(item.showInMenu !== false);
    setEditProductAvailableExtras(item.availableExtras ?? []);
  };

  const handleEditProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!editingProduct) return;

    if (!editProductName.trim()) {
      setFormError('O nome do produto é obrigatório.');
      return;
    }
    const priceNum = parseFloat(editProductPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormError('Insira um preço de venda válido.');
      return;
    }

    const imageToUse = editProductImage.trim() || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

    const tagsArray = editProductTags.split(',').map(t => t.trim()).filter(Boolean);

    const updatedItem: MenuItem = {
      ...editingProduct,
      name: editProductName,
      description: editProductDescription.trim() || 'Produto delicioso artesanal feito com ingredientes frescos.',
      price: priceNum,
      originalPrice: editProductOriginalPrice ? parseFloat(editProductOriginalPrice) : undefined,
      category: editProductCategory,
      image: imageToUse,
      isAvailable: editProductIsAvailable,
      showInMenu: editProductShowInMenu,
      estimatedTimeMin: parseInt(editProductTime) || 12,
      tags: tagsArray,
      displayOrder: parseInt(editProductDisplayOrder) || 0,
      isFeatured: editProductIsFeatured,
      isPromo: editProductIsPromo,
      availableExtras: editProductAvailableExtras
    };

    updateMenuItem(updatedItem);

    // Show custom visual success notification
    const snack = document.createElement('div');
    snack.className = 'fixed top-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 font-bold text-xs animate-bounce border border-emerald-500';
    snack.innerHTML = `🌟 <span><b>${editProductName}</b> editado com sucesso!</span>`;
    document.body.appendChild(snack);
    setTimeout(() => snack.remove(), 3500);

    setEditingProduct(null);
  };

  const [quickEditError, setQuickEditError] = useState('');

  const handleQuickEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickEditError('');
    if (!quickEditItem) return;

    const priceNum = parseFloat(quickEditPrice);
    const stockNum = parseInt(quickEditStock);

    if (isNaN(priceNum) || priceNum <= 0) {
      setQuickEditError('Insira um preço de venda válido maior que R$ 0,00.');
      return;
    }

    if (isNaN(stockNum) || stockNum < 0) {
      setQuickEditError('O estoque não pode ser negativo.');
      return;
    }

    updateMenuItem({
      ...quickEditItem,
      price: priceNum,
      stock: stockNum,
      isAvailable: stockNum > 0 ? quickEditItem.isAvailable : false
    });

    // Show custom visual success notification
    const snack = document.createElement('div');
    snack.className = 'fixed top-6 right-6 bg-amber-600 text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 font-bold text-xs animate-bounce border border-amber-500';
    snack.innerHTML = `🌟 <span><b>${quickEditItem.name}</b> preço (R$ ${priceNum.toFixed(2)}) e estoque (${stockNum} un) atualizados!</span>`;
    document.body.appendChild(snack);
    setTimeout(() => snack.remove(), 3500);

    setQuickEditItem(null);
  };

  const handleRemoveProductConfirmed = () => {
    if (!productToDelete) return;
    
    removeMenuItem(productToDelete.id);
    
    const snack = document.createElement('div');
    snack.className = 'fixed top-6 right-6 bg-red-600 text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 font-bold text-xs animate-bounce border border-red-500';
    snack.innerHTML = `🗑️ <span><b>${productToDelete.name}</b> removido com sucesso!</span>`;
    document.body.appendChild(snack);
    setTimeout(() => snack.remove(), 3500);
    
    setProductToDelete(null);
  };

  const handleUserCrudSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFormName.trim()) return;

    if (userCrudMode === 'create') {
      const newUser = {
        id: `usr-${Date.now()}`,
        name: userFormName.trim(),
        role: userFormRole,
        color: userFormColor,
        cpf: userFormCpf.trim(),
        birthDate: userFormBirthDate,
        phone: userFormPhone.trim(),
        email: userFormEmail.trim(),
        password: userFormPassword,
        permissions: {
          dashboard: false,
          cardapio: true,
          estoque: false,
          mesas: true,
          pedidos: true,
          cozinha: true,
          caixa: false,
          auditoria: false,
          config: false,
          usuarios: false
        }
      };

      setSystemUsers(prev => [...prev, newUser]);

      // Notify user creation
      const snack = document.createElement('div');
      snack.className = 'fixed top-6 right-6 bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 font-bold text-xs border border-emerald-500';
      snack.innerHTML = `🌟 <span>Novo operador <b>${newUser.name}</b> cadastrado com sucesso!</span>`;
      document.body.appendChild(snack);
      setTimeout(() => snack.remove(), 3500);

    } else {
      // Edit mode
      setSystemUsers(prev => prev.map(u => {
        if (u.id === editingUserId) {
          return {
            ...u,
            name: userFormName.trim(),
            role: userFormRole,
            color: userFormColor,
            cpf: userFormCpf.trim(),
            birthDate: userFormBirthDate,
            phone: userFormPhone.trim(),
            email: userFormEmail.trim(),
            password: userFormPassword
          };
        }
        return u;
      }));

      // Notify edit success
      const snack = document.createElement('div');
      snack.className = 'fixed top-6 right-6 bg-amber-600 text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 font-bold text-xs border border-amber-550';
      snack.innerHTML = `📝 <span>Operador <b>${userFormName}</b> atualizado com sucesso!</span>`;
      document.body.appendChild(snack);
      setTimeout(() => snack.remove(), 3500);
    }

    setShowUserCrudModal(false);
  };

  const handleDeleteUser = (idToDelete: string) => {
    if (idToDelete === 'usr-1') {
      const snack = document.createElement('div');
      snack.className = 'fixed top-6 right-6 bg-red-650 text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 font-bold text-xs border border-red-500';
      snack.innerHTML = `⚠️ <span>Não é permitido excluir o Gerente Administrador Principal!</span>`;
      document.body.appendChild(snack);
      setTimeout(() => snack.remove(), 3500);
      return;
    }
    if (idToDelete === currentUserId) {
      const snack = document.createElement('div');
      snack.className = 'fixed top-6 right-6 bg-red-650 text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 font-bold text-xs border border-red-500';
      snack.innerHTML = `⚠️ <span>Não é permitido excluir o usuário da sessão ativa atual!</span>`;
      document.body.appendChild(snack);
      setTimeout(() => snack.remove(), 3500);
      return;
    }

    const uName = systemUsers.find(u => u.id === idToDelete)?.name || '';
    setSystemUsers(prev => prev.filter(u => u.id !== idToDelete));
    if (selectedPermissionsUserId === idToDelete) {
      setSelectedPermissionsUserId('usr-1');
    }

    const snack = document.createElement('div');
    snack.className = 'fixed top-6 right-6 bg-red-650 text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 font-bold text-xs border border-red-500';
    snack.innerHTML = `🗑️ <span>Operador <b>${uName}</b> excluído com sucesso!</span>`;
    document.body.appendChild(snack);
    setTimeout(() => snack.remove(), 3500);
  };

  // --- TABLE OPERATIONS EVENT HANDLERS ---
  const handleCreateTable = (e: React.FormEvent) => {
    e.preventDefault();
    setTableFormError('');
    if (!newTableNumber.trim()) {
      setTableFormError('Digite o número da mesa.');
      return;
    }
    
    const num = parseInt(newTableNumber, 10);
    if (isNaN(num) || num <= 0) {
      setTableFormError('O número da mesa deve ser um valor inteiro positivo.');
      return;
    }

    const paddedId = String(num).padStart(2, '0');
    const capacityNum = parseInt(newTableCapacity, 10);
    if (isNaN(capacityNum) || capacityNum <= 0) {
      setTableFormError('A capacidade deve ser maior que zero.');
      return;
    }

    const success = createTable(paddedId, capacityNum);
    if (success) {
      setIsAddTableOpen(false);
      setNewTableNumber('');
      setNewTableCapacity('4');
      setTableFormError('');
      
      const toast = document.createElement('div');
      toast.className = 'fixed bottom-6 right-6 bg-emerald-650 border border-emerald-500 text-white px-4 py-3 rounded-xl shadow-xl z-50 text-xs font-bold font-sans animate-fade-in flex items-center gap-2';
      toast.innerHTML = `<span>✓ Mesa #${paddedId} cadastrada com sucesso!</span>`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3050);
    } else {
      setTableFormError(`A Mesa ${paddedId} já existe no sistema.`);
    }
  };

  const handleOpenEditTable = (table: TableState) => {
    setEditingTable(table);
    setEditTableNumber(table.id);
    setEditTableCapacity(String(table.capacity));
    setEditTablePeopleCount(String(table.peopleCount));
    setEditTableIsActive(table.isActive);
    setTableFormError('');
  };

  const handleUpdateTable = (e: React.FormEvent) => {
    e.preventDefault();
    setTableFormError('');
    if (!editingTable) return;

    if (!editTableNumber.trim()) {
      setTableFormError('Digite o número da mesa.');
      return;
    }

    const num = parseInt(editTableNumber, 10);
    if (isNaN(num) || num <= 0) {
      setTableFormError('O número da mesa deve ser positivo.');
      return;
    }

    const paddedId = String(num).padStart(2, '0');
    const capacityNum = parseInt(editTableCapacity, 10);
    const peopleCountNum = parseInt(editTablePeopleCount, 10);

    if (isNaN(capacityNum) || capacityNum <= 0) {
      setTableFormError('Capacidade deve ser maior que zero.');
      return;
    }

    if (isNaN(peopleCountNum) || peopleCountNum < 0) {
      setTableFormError('Quantidade de pessoas não pode ser negativa.');
      return;
    }

    if (peopleCountNum > capacityNum) {
      setTableFormError(`O número de pessoas (${peopleCountNum}) excede a capacidade da mesa (${capacityNum}).`);
      return;
    }

    const success = updateTable(editingTable.id, {
      id: paddedId,
      capacity: capacityNum,
      peopleCount: peopleCountNum,
      isActive: editTableIsActive
    });

    if (success) {
      setEditingTable(null);
      setTableFormError('');
      
      if (!editTableIsActive && selectedTableDetails === editingTable.id) {
        setSelectedTableDetails(null);
      } else if (editingTable.id !== paddedId && selectedTableDetails === editingTable.id) {
        setSelectedTableDetails(paddedId);
      }

      const toast = document.createElement('div');
      toast.className = 'fixed bottom-6 right-6 bg-neutral-900 text-white px-4 py-3 rounded-xl shadow-xl z-50 text-xs font-bold font-sans animate-fade-in';
      toast.innerText = `✓ Mesa #${paddedId} atualizada com sucesso!`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 3000);
    } else {
      setTableFormError(`Erro ao atualizar: A Mesa ${paddedId} já existe.`);
    }
  };

  const currentLocalTime = "18:06:45";

  return (
    <div id="admin-panel-viewport" className="min-h-screen bg-neutral-50 flex flex-col md:flex-row antialiased text-neutral-800">
      
      {/* SIDEBAR COMPONENT (LATERAL MENU WITH 7 SECTIONS) */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-neutral-900 text-neutral-300 transform ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative md:flex flex-col border-r border-neutral-800 transition-transform duration-300 ease-in-out shrink-0`}>
        
        {/* LOGO AREA */}
        <div className="h-16 flex items-center gap-3 px-6 bg-neutral-950 border-b border-neutral-850">
          <div className="w-8 h-8 rounded-lg bg-red-650 flex items-center justify-center text-white font-black text-sm shadow-md">
            👑
          </div>
          <div>
            <h2 className="text-white font-black text-sm leading-none uppercase tracking-wide">Crown Admin</h2>
            <span className="text-[10px] text-neutral-400 font-bold font-mono">CONSOLE POS v2.5</span>
          </div>
        </div>

        {/* ADMIN IDENTITY SUMMARY */}
        <div className="p-4 mx-3 my-4 bg-neutral-950/45 rounded-xl border border-neutral-800 space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full ${currentUser.color || 'bg-red-500 text-white'} flex items-center justify-center font-black text-xs shrink-0`}>
              {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[9px] text-neutral-500 uppercase font-black tracking-wider block">Sessão Ativa</span>
              <p className="text-xs font-black text-white truncate">{currentUser.name}</p>
              <p className="text-[9px] text-red-500 font-bold font-mono tracking-wide">{currentUser.role}</p>
            </div>
          </div>
          
          <div className="space-y-1">
            <label className="text-[8px] text-neutral-400 uppercase font-black tracking-widest block">Alternar Operador</label>
            <select
              value={currentUserId}
              onChange={(e) => {
                setCurrentUserId(e.target.value);
                setSelectedPermissionsUserId(e.target.value);
              }}
              className="w-full bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border border-neutral-750 rounded-lg px-2 py-1.5 text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-red-500 transition cursor-pointer"
            >
              {systemUsers.map(u => (
                <option key={u.id} value={u.id} className="bg-neutral-900 text-neutral-200">
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* MENU LIST */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Sliders },
            { id: 'cardapio', label: 'Cardápio', icon: ShoppingBag, badge: menuItems.length },
            { id: 'estoque', label: 'Estoque / Ruptura', icon: Package, badge: lowAvailabilityCount, badgeColor: lowAvailabilityCount > 0 ? 'bg-red-600 text-white font-black animate-pulse' : 'bg-neutral-600 text-white font-black' },
            { id: 'mesas', label: 'Mesas', icon: Users, badge: activeTablesCount, badgeColor: 'bg-blue-600' },
            { id: 'pedidos', label: 'Pedidos', icon: Calendar, badge: orders.length, badgeColor: 'bg-neutral-700' },
            { id: 'cozinha', label: 'Cozinha', icon: ChefHat, badge: activeOrdersInKitchenCount, badgeColor: 'bg-red-650' },
            { id: 'caixa', label: 'Caixa / POS', icon: CreditCard },
            { id: 'auditoria', label: 'Auditoria de Caixa', icon: History },
            { id: 'config', label: 'Configurações', icon: Settings },
            { id: 'usuarios', label: 'Permissões do Sistema', icon: Shield }
          ].map(item => {
            const IconComponent = item.icon;
            const isActive = activeSidebarTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSidebarTab(item.id as any);
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                  isActive 
                    ? 'bg-red-600 text-white shadow-md' 
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-neutral-500 group-hover:text-white'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white text-neutral-900' : item.badgeColor || 'bg-neutral-800 text-neutral-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* SIDEBAR FOOTER */}
        <div className="h-14 border-t border-neutral-850 bg-neutral-950/50 flex items-center justify-between px-4 text-[10px] text-neutral-500 font-mono">
          <span>SESSÃO ATIVA</span>
          <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> ONLINE</span>
        </div>
      </aside>

      {/* MOBILE TRIGGER HEADER (ONLY VISIBLE ON SM/MOBILE) */}
      <header className="md:hidden h-16 bg-neutral-900 text-white flex items-center justify-between px-4 z-30 shrink-0 sticky top-0 shadow-md">
        <div className="flex items-center gap-3.5">
          <button 
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-sm tracking-tight">Crown Admin</span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs bg-red-600/25 border border-red-500/30 text-rose-300 font-bold px-2 py-1 rounded-md text-[10px] font-mono">
            MESA {calls.length > 0 ? calls[0].tableId : '04'}
          </span>
        </div>
      </header>

      {/* CORE CONTENT REGION */}
      <main className="flex-1 overflow-x-hidden flex flex-col min-w-0">
        
        {/* TOP STATUS SUB-HEADER BAR */}
        <div className="h-14 bg-white border-b border-neutral-200 hidden md:flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-500 uppercase font-mono tracking-wider">SALÃO PRINCIPAL:</span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
              Aberto
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-xs font-bold text-neutral-600">
            <span className="font-mono text-neutral-400">25 Mai 2026 • {currentLocalTime} UTC</span>
            <div className="h-4 w-px bg-neutral-200" />
            <span className="text-neutral-500">Filtrando: <b className="text-neutral-800 capitalize">{activeSidebarTab}</b></span>
          </div>
        </div>

        {/* WORKSPACE PAGES */}
        <div className="flex-1 p-4 lg:p-6">
          
          {/* PERMISSION CHECK OVERLAY */}
          {currentUser.permissions[activeSidebarTab] === false ? (
            <div className="min-h-[450px] flex flex-col items-center justify-center text-center p-8 bg-white border border-neutral-200 rounded-2xl shadow-sm max-w-xl mx-auto my-10 space-y-6 animate-scale-up">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center border border-red-100 text-red-650 animate-pulse shrink-0">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-extrabold text-neutral-900 uppercase tracking-tight">Acesso Restrito ao Setor</h2>
                <p className="text-xs text-neutral-500 leading-relaxed max-w-sm">
                  O seu perfil atual (<b>{currentUser.name}</b> como <i>{currentUser.role}</i>) não possui autorização para acessar a aba <b className="capitalize">{activeSidebarTab === 'usuarios' ? 'Permissões' : activeSidebarTab}</b>.
                </p>
              </div>

              <div className="bg-neutral-50 border border-neutral-150 rounded-xl p-4 w-full text-left space-y-2.5">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-neutral-400">
                  <Shield className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Níveis de Autorização Requeridos</span>
                </div>
                <p className="text-[11px] text-neutral-600 font-semibold leading-relaxed">
                  Entre em contato com o administrador do sistema para habilitar o parâmetro <code className="bg-neutral-200 px-1 py-0.5 rounded text-neutral-800 font-mono text-[10px] font-bold">{activeSidebarTab}</code> nas configurações de segurança do console.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentUserId('usr-1');
                    const snack = document.createElement('div');
                    snack.className = 'fixed top-6 right-6 bg-red-650 text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 font-bold text-xs border border-red-500';
                    snack.innerHTML = `🔑 <span>Sessão restaurada como <b>Gabriel Gustavo (Gerente)</b></span>`;
                    document.body.appendChild(snack);
                    setTimeout(() => snack.remove(), 3500);
                  }}
                  className="flex-1 py-2.5 bg-red-650 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  <span>Entrar como Gabriel (Gerente)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const allowedTab = ['cardapio', 'mesas', 'pedidos', 'cozinha', 'caixa', 'estoque'].find(t => currentUser.permissions[t] !== false) || 'cardapio';
                    setActiveSidebarTab(allowedTab as any);
                  }}
                  className="px-4 py-2.5 border border-neutral-200 hover:bg-neutral-50 text-neutral-650 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Ir para Área Permitida
                </button>
              </div>
            </div>
          ) : (
            <>
          
          {/* ========================================================= */}
          {/* TAB 1: DASHBOARD (VISÃO GERAL DO DIA) */}
          {activeSidebarTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* PAGE MAIN HEADING */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-neutral-950 font-sans tracking-tight">Painel Executivo do Dia</h1>
                  <p className="text-xs text-neutral-500">Métricas analíticas, faturamento estimado em tempo real e produtos mais vendidos.</p>
                </div>
                
                {/* NEW PRODUCT TRIGGER ON DASHBOARD FOR EXTRA HIGH REVENUE ENGAGEMENT */}
                <button
                  onClick={() => {
                    setActiveSidebarTab('cardapio');
                    setIsAddProductOpen(true);
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs cursor-pointer text-white shadow-lg transition duration-205 active:scale-98 ${themeColors.primary} ${themeColors.hover}`}
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Cadastrar Novo Produto</span>
                </button>
              </div>

              {/* BENTO STAT BARS (VISÃO GERAL & FATURAMENTO ESTIMADO) */}
              <div id="stats-bento-grid" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* METRICS 1: ESTIMATED REVENUE (FATURAMENTO ESTIMADO) */}
                <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between relative group overflow-hidden">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono tracking-wider">Faturamento Estimado</span>
                    <h3 className="text-2xl font-black text-neutral-900 font-mono leading-none">R$ {totalEstimatedRevenue.toFixed(2)}</h3>
                    <p className="text-[10px] text-neutral-400 font-medium">Contabilizando comandas em aberto</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-500 shrink-0 select-none">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                </div>

                {/* METRICS 2: PAID REVENUE (FATURAMENTO CONFIRMADO) */}
                <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between relative group overflow-hidden">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-emerald-650 block font-mono tracking-wider">caixa fechado</span>
                    <h3 className="text-2xl font-black text-neutral-900 font-mono leading-none">R$ {totalPaidRevenue.toFixed(2)}</h3>
                    <p className="text-[10px] text-neutral-400 font-medium">Valor pago registrado no POS</p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 select-none">
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div className="absolute bottom-0 inset-x-0 h-1 bg-emerald-500" />
                </div>

                {/* METRICS 3: BUSY TABLES (MESAS OCUPADAS) */}
                <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs flex items-center justify-between relative group overflow-hidden">
                  <div className="space-y-2 w-2/3">
                    <span className="text-[10px] uppercase font-bold text-sky-650 block font-mono tracking-wider">Mesas Ativas</span>
                    <div className="flex items-baseline gap-1.5">
                      <h3 className="text-2xl font-black text-neutral-900 font-mono leading-none">{activeTablesCount} / {totalActiveTablesCount || 1}</h3>
                      <span className="text-[10px] text-neutral-400 font-bold font-mono">({Math.round((activeTablesCount / (totalActiveTablesCount || 1)) * 100)}%)</span>
                    </div>
                    {/* Progress slider bar representation */}
                    <div className="w-full bg-neutral-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                      <div className="bg-sky-500 h-full transition-all duration-500" style={{ width: `${(activeTablesCount / (totalActiveTablesCount || 1)) * 100}%` }} />
                    </div>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 select-none">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                {/* METRICS 4: WAITER CALLS (CHAMADOS ATIVOS) */}
                <div className={`p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between relative overflow-hidden ${
                  pendingCallsCount > 0 
                    ? 'bg-amber-50/50 border-amber-300 shadow-md ring-1 ring-amber-400/25' 
                    : 'bg-white border-neutral-200 shadow-xs'
                }`}>
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-amber-700 block font-mono tracking-wider">Chamados de Garçom</span>
                    <h3 className="text-2xl font-black text-neutral-900 font-mono leading-none">
                      {pendingCallsCount} {pendingCallsCount === 1 ? 'Pendente' : 'Pendentes'}
                    </h3>
                    <p className="text-[10px] text-neutral-500 font-medium">
                      {pendingCallsCount > 0 ? '⚠️ Mesas aguardando atendimento' : '✓ Todos os clientes atendidos'}
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveSidebarTab('mesas')}
                    className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border select-none transition cursor-pointer ${
                      pendingCallsCount > 0 
                        ? 'bg-amber-500 text-white border-amber-400 hover:scale-105 animate-pulse' 
                        : 'bg-neutral-100 text-neutral-400 border-neutral-200'
                    }`}
                  >
                    <BellRing className="w-5 h-5" />
                  </button>
                </div>

              </div>

              {/* SALES PERFORMANCE GRAPH CARD */}
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-neutral-900 uppercase tracking-tight flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" />
                      <span>Volume de Vendas & Performance</span>
                    </h3>
                    <p className="text-[11px] text-neutral-450">Analise tendências, picos de faturamento e fluxo de pedidos em tempo real.</p>
                  </div>
                  
                  <div className="flex bg-neutral-100 p-0.5 rounded-xl border border-neutral-200/50 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => setChartViewMode('hour')}
                      className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                        chartViewMode === 'hour'
                          ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/20 font-extrabold'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      Por Hora (Hoje)
                    </button>
                    <button
                      type="button"
                      onClick={() => setChartViewMode('day')}
                      className={`px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                        chartViewMode === 'day'
                          ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200/20 font-extrabold'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                    >
                      Por Dia (Últimos 7 dias)
                    </button>
                  </div>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                      <XAxis 
                        dataKey="label" 
                        stroke="#888888" 
                        fontSize={10} 
                        fontWeight={700}
                        tickLine={false} 
                        axisLine={false} 
                        dy={8}
                      />
                      <YAxis 
                        stroke="#888888" 
                        fontSize={10} 
                        fontWeight={700}
                        tickLine={false} 
                        axisLine={false} 
                        tickFormatter={(val) => `R$${val}`}
                        dx={-4}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#ffffff', 
                          borderRadius: '16px', 
                          border: '1px solid #e5e5e5',
                          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                          fontFamily: 'inherit',
                          fontSize: '11px',
                          padding: '10px 14px'
                        }}
                        labelStyle={{ fontWeight: '900', color: '#171717', marginBottom: '4px' }}
                      />
                      <Legend 
                        wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '12px' }} 
                        iconType="circle"
                        iconSize={8}
                      />
                      <Line 
                        name="Faturamento Estimado (R$)"
                        type="monotone" 
                        dataKey="Faturamento (R$)" 
                        stroke={themeColors.primary.includes('red') ? '#ef4444' : themeColors.primary.includes('emerald') ? '#10b981' : themeColors.primary.includes('blue') ? '#3b82f6' : themeColors.primary.includes('orange') ? '#f97316' : themeColors.primary.includes('violet') ? '#8b5cf6' : '#10b981'} 
                        strokeWidth={3} 
                        dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }} 
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                      <Line 
                        name="Volume de Pedidos"
                        type="monotone" 
                        dataKey="Pedidos" 
                        stroke="#737373" 
                        strokeWidth={2} 
                        strokeDasharray="4 4"
                        dot={{ r: 3, strokeWidth: 1.5, fill: '#ffffff' }} 
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* CORE METRIC VISUALS (BEST SELLER PRODUCTS & RECENT ORDERS) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* LEFT: PRODUCTS MOST SOLD COLUMN (PRODUTOS MAIS VENDIDOS) */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                    <div>
                      <h3 className="font-extrabold text-sm text-neutral-900 uppercase tracking-tight">Produtos Mais Vendidos</h3>
                      <p className="text-[11px] text-neutral-400">Total acumulado de faturamento e volume de pedidos.</p>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-neutral-400 font-mono">Ranking Dinâmico</span>
                  </div>

                  <div className="divide-y divide-neutral-100 space-y-3.5 pt-1.5">
                    {bestSellers.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4 pt-3 first:pt-0">
                        <div className="flex items-center gap-3 min-w-0">
                          
                          {/* Rank indicator badge */}
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center font-black text-xs shrink-0 ${
                            idx === 0 ? 'bg-amber-400 text-neutral-900' :
                            idx === 1 ? 'bg-neutral-250 text-neutral-700' :
                            idx === 2 ? 'bg-amber-700 text-white' : 'bg-neutral-100 text-neutral-400'
                          }`}>
                            {idx + 1}
                          </div>

                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className="w-10 h-10 object-cover rounded-lg border border-neutral-100 shrink-0"
                            referrerPolicy="no-referrer"
                          />

                          <div className="min-w-0">
                            <span className="font-bold text-xs text-neutral-900 block truncate">{item.name}</span>
                            <span className="text-[9px] uppercase font-black text-neutral-400 font-mono tracking-wider block">{item.category}</span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-neutral-900 font-mono block">{item.count} un compradas</span>
                          <span className="text-[10px] font-semibold text-emerald-650 font-mono">R$ {item.totalSales.toFixed(2)} acumulados</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* RIGHT: LIVE PIPELINE STATUS */}
                <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 flex flex-col justify-between space-y-4">
                  <div className="border-b border-neutral-100 pb-3">
                    <h3 className="font-extrabold text-sm text-neutral-900 uppercase tracking-tight">Carga de Trabalho da Chapa</h3>
                    <p className="text-[11px] text-neutral-400">Distribuição operacional dos pedidos ativos.</p>
                  </div>

                  {/* Visual graph layout */}
                  <div className="space-y-4 flex-1 flex flex-col justify-center">
                    
                    <div className="space-y-1">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-bold text-neutral-600">Pedidos Recebidos (Pendente)</span>
                        <span className="font-black text-neutral-905">{orders.filter(o => o.status === 'pending').length}</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-neutral-400 h-full" style={{ width: `${(orders.filter(o => o.status === 'pending').length / (orders.length || 1)) * 100}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-bold text-neutral-600">Em Preparo (Cozinhando)</span>
                        <span className="font-black text-blue-650">{orders.filter(o => o.status === 'preparing').length}</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full" style={{ width: `${(orders.filter(o => o.status === 'preparing').length / (orders.length || 1)) * 100}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-bold text-neutral-600">Prontos p/ Entrega</span>
                        <span className="font-black text-emerald-650">{orders.filter(o => o.status === 'ready').length}</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full animate-pulse" style={{ width: `${(orders.filter(o => o.status === 'ready').length / (orders.length || 1)) * 100}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="font-bold text-neutral-600">Entregues hoje</span>
                        <span className="font-black text-neutral-805">{orders.filter(o => o.status === 'delivered').length}</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-neutral-800 h-full" style={{ width: `${(orders.filter(o => o.status === 'delivered').length / (orders.length || 1)) * 100}%` }} />
                      </div>
                    </div>

                  </div>

                  <button
                    onClick={() => setActiveSidebarTab('cozinha')}
                    className="w-full border border-neutral-200 hover:border-neutral-350 bg-neutral-50 hover:bg-neutral-100 py-3 rounded-xl font-bold text-xs text-neutral-700 transition"
                  >
                    Ver Linha de Produção KDS
                  </button>
                </div>

              </div>

              {/* ANALYTICAL DASHBOARD COMPONENT */}
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm p-5 space-y-6">
                <div>
                  <h3 className="font-extrabold text-sm text-neutral-900 uppercase tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-red-600" />
                    <span>Dashboard de Inteligência Analítica</span>
                  </h3>
                  <p className="text-[11px] text-neutral-450">Indicadores detalhados do fluxo de clientes e performance de vendas por categoria de produto.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* CHART 1: VOLUME DE VENDAS POR CATEGORIA */}
                  <div className="border border-neutral-150 rounded-xl p-4 space-y-3">
                    <div>
                      <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Volume de Vendas por Categoria</h4>
                      <p className="text-[10px] text-neutral-400">Total acumulado de unidades vendidas e receita estimada.</p>
                    </div>
                    
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categorySalesData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                          <XAxis 
                            dataKey="name" 
                            stroke="#888888" 
                            fontSize={10} 
                            fontWeight={700}
                            tickLine={false} 
                            axisLine={false} 
                          />
                          <YAxis 
                            stroke="#888888" 
                            fontSize={10} 
                            fontWeight={700}
                            tickLine={false} 
                            axisLine={false} 
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#ffffff', 
                              borderRadius: '16px', 
                              border: '1px solid #e5e5e5',
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                              fontSize: '11px',
                              padding: '10px 14px'
                            }}
                            formatter={(value: any, name: any) => {
                              if (name === "Receita (R$)") return [`R$ ${Number(value).toFixed(2)}`, "Receita"];
                              return [value, "Unidades"];
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '8px' }} 
                            iconType="circle"
                            iconSize={8}
                          />
                          <Bar name="Unidades Vendidas" dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                            {categorySalesData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                          <Bar name="Receita (R$)" dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* CHART 2: FLUXO DE PEDIDOS POR HORA */}
                  <div className="border border-neutral-150 rounded-xl p-4 space-y-3">
                    <div>
                      <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Fluxo de Pedidos por Hora</h4>
                      <p className="text-[10px] text-neutral-400">Picos de demanda ao longo do horário operacional do restaurante.</p>
                    </div>

                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={hourlyFlowData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorPedidos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f1" />
                          <XAxis 
                            dataKey="hour" 
                            stroke="#888888" 
                            fontSize={10} 
                            fontWeight={700}
                            tickLine={false} 
                            axisLine={false} 
                          />
                          <YAxis 
                            stroke="#888888" 
                            fontSize={10} 
                            fontWeight={700}
                            tickLine={false} 
                            axisLine={false} 
                          />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: '#ffffff', 
                              borderRadius: '16px', 
                              border: '1px solid #e5e5e5',
                              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                              fontSize: '11px',
                              padding: '10px 14px'
                            }}
                          />
                          <Legend 
                            wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '8px' }} 
                            iconType="circle"
                            iconSize={8}
                          />
                          <Area 
                            name="Pedidos Realizados" 
                            type="monotone" 
                            dataKey="Pedidos" 
                            stroke="#ef4444" 
                            fillOpacity={1} 
                            fill="url(#colorPedidos)" 
                            strokeWidth={3}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: CARDÁPIO (GESTÃO DE PRODUTOS & CADASTRO) */}
          {activeSidebarTab === 'cardapio' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-neutral-905">Cardápio do Restaurante</h1>
                  <p className="text-xs text-neutral-550">Modifique preços, ative ou inative itens e cadastre novos insumos no salão de vendas.</p>
                </div>

                <button
                  onClick={() => setIsAddProductOpen(true)}
                  className={`flex items-center gap-1.5 px-5 py-3 rounded-xl font-bold text-xs cursor-pointer text-white shadow-lg transition duration-200 active:scale-97 ${themeColors.primary} ${themeColors.hover}`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Novo Produto</span>
                </button>
              </div>

              {/* CONTROLS BAR: SEARCH & CATEGORY SELECTOR */}
              <div className="bg-white p-4 rounded-2xl border border-neutral-200 flex flex-col md:flex-row gap-4 items-center justify-between">
                
                {/* Search query input */}
                <div className="relative w-full md:w-96">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                    placeholder="Pesquisar prato, hambúrguer, bebida..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  {menuSearchQuery && (
                    <button
                      onClick={() => setMenuSearchQuery('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-neutral-600 text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category filters inside Admin menu */}
                <div className="flex bg-neutral-100 p-1 rounded-xl border border-neutral-200 gap-1 overflow-x-auto w-full md:w-auto">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'entradas', label: 'Entradas' },
                    { id: 'burgers', label: 'Hamburguers' },
                    { id: 'bebidas', label: 'Bebidas' },
                    { id: 'sobremesas', label: 'Sobremesas' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setMenuFilterCategory(cat.id as any)}
                      className={`text-[11px] font-extrabold px-3 py-1.5 rounded-lg whitespace-nowrap cursor-pointer transition ${
                        menuFilterCategory === cat.id 
                          ? 'bg-white text-neutral-900 shadow-xs' 
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

              </div>

              {/* CARDÁPIO PRODUCTS GRID */}
              {filteredMenuItems.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-neutral-300 p-12 text-center text-neutral-500 max-w-xl mx-auto space-y-3">
                  <FolderOpen className="w-12 h-12 text-neutral-300 mx-auto" />
                  <h3 className="font-bold text-sm text-neutral-800">Prato não localizado</h3>
                  <p className="text-xs text-neutral-400">Modifique o filtro ou os termos de busca para localizar o produto.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMenuItems.map(item => (
                    <div 
                      key={item.id} 
                      className={`bg-white rounded-2xl border p-4 shadow-sm flex flex-col justify-between transition gap-4 relative group ${
                        item.isAvailable ? 'border-neutral-200' : 'border-red-200 bg-red-50/5'
                      }`}
                    >
                      <div className="space-y-3">
                        
                        {/* Image + Header row */}
                        <div className="relative">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className={`w-full h-36 object-cover rounded-xl border border-neutral-150 ${!item.isAvailable && 'grayscale opacity-60'}`}
                            referrerPolicy="no-referrer"
                          />
                          <span className="absolute top-2 left-2 bg-neutral-900/80 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-md uppercase">
                            {item.category}
                          </span>
                          
                          {/* Featured Product Star Badge */}
                          {item.isFeatured && (
                            <span className="absolute top-2 right-2 bg-amber-500 text-white font-bold text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                              <Star className="w-3 h-3 fill-current" />
                              Destaque
                            </span>
                          )}

                          {/* Promotional Product Badge */}
                          {item.isPromo && (
                            <span className={`absolute ${item.isFeatured ? 'top-9' : 'top-2'} right-2 bg-rose-600 text-white font-bold text-[9px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm`}>
                              <Tag className="w-3 h-3" />
                              Promoção
                            </span>
                          )}

                          {/* Display Order mini badge */}
                          <span className="absolute bottom-2 left-2 bg-neutral-900/60 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                            Ordem: {item.displayOrder ?? 0}
                          </span>

                          {/* Live time indicator */}
                          <span className="absolute bottom-2 right-2 bg-neutral-950/70 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {item.estimatedTimeMin} min
                          </span>
                        </div>

                        {/* Title and tags */}
                        <div>
                          <div className="flex items-start justify-between gap-1">
                            <h3 className="font-extrabold text-sm text-neutral-900 leading-tight truncate flex-1" title={item.name}>
                              {item.name}
                            </h3>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setQuickEditItem(item);
                                  setQuickEditPrice(String(item.price));
                                  setQuickEditStock(item.stock !== undefined ? String(item.stock) : '0');
                                }}
                                className="p-1.5 bg-neutral-50 hover:bg-neutral-150 text-amber-600 rounded-lg transition cursor-pointer"
                                title="Edição Rápida (Preço e Estoque)"
                              >
                                <Sliders className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenEditProduct(item)}
                                className="p-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 rounded-lg transition cursor-pointer"
                                title="Editar Produto"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setProductToDelete(item)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-lg transition cursor-pointer"
                                title="Remover Produto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          
                          <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 min-h-8">
                            {item.description}
                          </p>
                          
                          {/* Item tags list & Stock Info */}
                          <div className="flex flex-wrap gap-1 mt-2 items-center justify-between">
                            <div className="flex flex-wrap gap-1">
                              {item.tags.map((tg, key) => (
                                <span key={key} className="bg-neutral-100 text-neutral-500 text-[8px] font-bold uppercase rounded px-1.5 py-0.25">
                                  {tg}
                                </span>
                              ))}
                            </div>
                            <span className={`text-[9px] font-mono font-black rounded px-1.5 py-0.5 uppercase tracking-wider border ${
                              (item.stock ?? 0) === 0 ? 'bg-red-50 text-red-700 border-red-150 animate-pulse' : 
                              (item.stock ?? 0) <= 3 ? 'bg-amber-50 text-amber-700 border-amber-150' : 
                              'bg-neutral-50 text-neutral-550 border-neutral-150'
                            }`}>
                              Estoque: {item.stock !== undefined ? `${item.stock}` : 'Ilmitado'}
                            </span>
                          </div>

                          {/* Available add-ons checklist overview */}
                          {item.availableExtras && item.availableExtras.length > 0 && (
                            <div className="mt-2 text-[10px] text-neutral-400 font-medium pb-1 border-b border-neutral-50">
                              <span className="font-bold text-neutral-500">Adicionais: </span>
                              <span className="truncate block text-[10px] text-neutral-500">
                                {item.availableExtras.map(id => EXTRA_ITEMS.find(e => e.id === id)?.name).filter(Boolean).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Pricing and toggle active control */}
                      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2.5">
                        
                        {/* Price change input */}
                        <div>
                          <span className="text-[9px] text-neutral-450 uppercase font-black block leading-none">Preço:</span>
                          <div className="flex flex-col mt-0.5">
                            {item.originalPrice && (
                              <span className="text-[9px] text-neutral-400 line-through leading-none font-mono font-medium">
                                R$ {item.originalPrice.toFixed(2)}
                              </span>
                            )}
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-xs text-neutral-550 font-bold font-mono">R$</span>
                              <input
                                type="number"
                                step="0.5"
                                value={item.price}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value);
                                  if (!isNaN(val)) {
                                    updateItemPrice(item.id, val);
                                  }
                                }}
                                className="w-14 bg-neutral-100 border-none font-sans font-black text-xs text-neutral-900 px-1 py-0.5 rounded focus:outline-none focus:ring-1 focus:ring-neutral-400 font-mono"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Enable / Disable Availability (Ativar/Desativar) */}
                        <button
                          onClick={() => toggleItemAvailability(item.id)}
                          className={`flex items-center gap-1.5 text-[11px] font-bold py-2 px-3 rounded-xl transition cursor-pointer select-none ${
                            item.isAvailable 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-250 hover:bg-emerald-100' 
                              : 'bg-red-50 text-red-650 border border-red-205 hover:bg-red-100'
                          }`}
                        >
                          {item.isAvailable ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Ativo</span>
                            </>
                          ) : (
                            <>
                              <X className="w-3.5 h-3.5" />
                              <span>Inativo</span>
                            </>
                          )}
                        </button>

                      </div>

                      {/* EXIBIR NO CARDÁPIO PARA OS CLIENTES TOGGLE */}
                      <div className="pt-2.5 mt-1 border-t border-dashed border-neutral-100 flex items-center justify-between">
                        <span className="text-[10px] text-neutral-500 font-extrabold flex items-center gap-1 uppercase tracking-tight">
                          {item.showInMenu !== false ? (
                            <>
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Visível no Menu</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                              <span className="text-neutral-400">Oculto do Menu</span>
                            </>
                          )}
                        </span>
                        
                        <button
                          type="button"
                          onClick={() => {
                            updateMenuItem({
                              ...item,
                              showInMenu: item.showInMenu !== false ? false : true
                            });
                          }}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            item.showInMenu !== false ? 'bg-emerald-600' : 'bg-neutral-200'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              item.showInMenu !== false ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                    </div>
                  ))}
                </div>
              )}

              {/* OVERLAY CADASTRO MODAL FOR ADDING PRODUCTS */}
              {isAddProductOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/75 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-lg border border-neutral-200 overflow-hidden shadow-2xl relative animate-scale-up">
                    
                    {/* Header */}
                    <div className="bg-neutral-900 text-white px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🍔</span>
                        <div>
                          <h3 className="font-extrabold text-sm uppercase tracking-wide">Cadastrar Novo Produto</h3>
                          <p className="text-[10px] text-neutral-400">Insira as informações do novo item do cardápio.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsAddProductOpen(false)}
                        className="text-neutral-400 hover:text-white transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Form body */}
                    <form onSubmit={handleAddNewProductSubmit} className="p-5 space-y-4">
                      
                      {formError && (
                        <div className="bg-red-50 text-red-750 border border-red-200 p-3 rounded-lg text-xs font-bold leading-tight">
                          ⚠️ {formError}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Nome do Prato *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Hambúrguer Gorgonzola Especial"
                            value={newProductName}
                            onChange={(e) => setNewProductName(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-205 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 text-neutral-900"
                          />
                        </div>

                        <div className="col-span-1 space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Categoria *</label>
                          <select
                            required
                            value={newProductCategory}
                            onChange={(e) => setNewProductCategory(e.target.value as any)}
                            className="w-full bg-neutral-50 border border-neutral-205 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 text-neutral-900"
                          >
                            <option value="burgers">Burgers / Sanduíches</option>
                            <option value="entradas">Entradas / Porções</option>
                            <option value="bebidas">Sodas / Bebidas</option>
                            <option value="sobremesas">Sobremesas</option>
                          </select>
                        </div>

                        <div className="col-span-1 space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Preparo Médio (un/min)</label>
                          <input
                            type="number"
                            min="1"
                            value={newProductTime}
                            onChange={(e) => setNewProductTime(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-205 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 text-neutral-900 font-mono"
                          />
                        </div>

                        <div className="col-span-1 space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Preço de Venda (R$)*</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="38.00"
                            value={newProductPrice}
                            onChange={(e) => setNewProductPrice(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-205 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 text-neutral-900 font-mono"
                          />
                        </div>

                        <div className="col-span-1 space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Preço Promocional (Opcional)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="45.00"
                            value={newProductOriginalPrice}
                            onChange={(e) => setNewProductOriginalPrice(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-205 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 text-neutral-900 font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-neutral-500 block">Breve Descrição Gourmet</label>
                        <textarea
                          placeholder="Ex: Blend artesanal de 150g no vapor, queijo gongorzola derretido, cebolas caramelizadas e rúcula no brioche."
                          rows={2}
                          value={newProductDescription}
                          onChange={(e) => setNewProductDescription(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-205 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 text-neutral-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-neutral-500 block">Tags (separadas por vírgula)</label>
                        <input
                          type="text"
                          placeholder="Ex: Mais vendido, Apimentado, Artesanal"
                          value={newProductTags}
                          onChange={(e) => setNewProductTags(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-205 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 text-neutral-905"
                        />
                      </div>

                      {/* Fotografia do Prato with Upload, AI & Presets */}
                      <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                        <label className="text-[10px] font-black uppercase text-neutral-500 block">Fotografia do Prato</label>
                        
                        {/* Current Image Preview */}
                        {newProductImage ? (
                          <div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-white aspect-video flex items-center justify-center group/img">
                            <img 
                              src={newProductImage} 
                              alt="Visualização" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition duration-200 flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setNewProductImage('')}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-750 text-white rounded-lg text-[10px] font-bold shadow-md transition cursor-pointer"
                              >
                                Remover Imagem
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Drag and Drop Zone */
                          <div 
                            onDragEnter={(e) => { e.preventDefault(); setDragActiveNew(true); }}
                            onDragOver={(e) => { e.preventDefault(); setDragActiveNew(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setDragActiveNew(false); }}
                            onDrop={(e) => { 
                              e.preventDefault(); 
                              setDragActiveNew(false); 
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleImageFileChange(e.dataTransfer.files[0], false);
                              }
                            }}
                            className={`border-2 border-dashed rounded-xl p-4 text-center transition flex flex-col items-center justify-center gap-2 cursor-pointer relative bg-white min-h-[140px] ${
                              dragActiveNew ? 'border-red-500 bg-red-50/30' : 'border-neutral-250 hover:border-neutral-400'
                            }`}
                          >
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleImageFileChange(e.target.files[0], false);
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Upload className="w-8 h-8 text-neutral-450" />
                            <div>
                              <p className="text-xs font-bold text-neutral-800">Arraste uma imagem aqui ou clique para selecionar</p>
                              <p className="text-[10px] text-neutral-400 mt-1">PNG, JPG, JPEG até 5MB</p>
                            </div>
                          </div>
                        )}

                        {/* IA & Manual Controls */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* AI Generation Button */}
                          <button
                            type="button"
                            disabled={isGeneratingImage || !newProductName.trim()}
                            onClick={() => handleGenerateImageAI(false)}
                            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-bold text-[11px] cursor-pointer shadow-xs transition duration-200 border w-full select-none ${
                              isGeneratingImage 
                                ? 'bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed' 
                                : !newProductName.trim()
                                ? 'bg-neutral-100 border-neutral-200 text-neutral-405 cursor-not-allowed'
                                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-750 hover:to-indigo-750 text-white border-transparent active:scale-97'
                            }`}
                            title={!newProductName.trim() ? "Insira o nome do prato antes de gerar" : "Gerar com IA"}
                          >
                            {isGeneratingImage ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Gerando...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 fill-current animate-pulse" />
                                <span>Gerar Foto com IA</span>
                              </>
                            )}
                          </button>

                          {/* URL Direct Input */}
                          <input
                            type="url"
                            placeholder="Ou cole uma URL (https://...)"
                            value={newProductImage}
                            onChange={(e) => setNewProductImage(e.target.value)}
                            className="bg-white border border-neutral-250 rounded-lg px-2.5 py-2 text-[10px] font-semibold text-neutral-805 focus:outline-none focus:ring-1 focus:ring-red-550 focus:border-red-550 w-full font-mono placeholder:font-sans placeholder:font-normal"
                          />
                        </div>

                        {/* Presets Grid Toggle */}
                        <div>
                          <p className="text-[10px] font-bold text-neutral-400 mb-1.5 uppercase">Ou use uma imagem padrão</p>
                          <div className="grid grid-cols-3 gap-1 pt-0.5">
                            {PRESET_IMAGES.map((img, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => setNewProductImage(img.url)}
                                className={`text-[9px] font-bold py-1 px-1.5 rounded-lg border flex flex-col items-center justify-center gap-1 hover:bg-neutral-50 transition cursor-pointer shrink-0 ${
                                  newProductImage === img.url 
                                    ? 'border-red-500 bg-red-50 text-red-750' 
                                    : 'border-neutral-200 text-neutral-600 bg-white'
                                }`}
                              >
                                <img src={img.url} alt="" className="w-5 h-5 object-cover rounded" referrerPolicy="no-referrer" />
                                <span className="truncate max-w-[80px]">{img.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Novas Configurações: Ordem de Exibição, Ativo, Destaque, Promoção */}
                      <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                        <div className="col-span-1 space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Ordem de Exibição</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={newProductDisplayOrder}
                            onChange={(e) => setNewProductDisplayOrder(e.target.value)}
                            className="w-full bg-white border border-neutral-250 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-neutral-800"
                          />
                        </div>

                        <div className="col-span-1 flex flex-col justify-end space-y-1.5 pb-0.5">
                          <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newProductIsAvailable}
                              onChange={(e) => setNewProductIsAvailable(e.target.checked)}
                              className="rounded text-red-650 focus:ring-red-500 w-4 h-4"
                            />
                            <span>Disponível (Ativo)</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newProductShowInMenu}
                              onChange={(e) => setNewProductShowInMenu(e.target.checked)}
                              className="rounded text-red-650 focus:ring-red-500 w-4 h-4"
                            />
                            <span className="flex items-center gap-1 text-emerald-700 font-extrabold">
                              <Eye className="w-3.5 h-3.5" /> Exibir aos Clientes
                            </span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newProductIsFeatured}
                              onChange={(e) => setNewProductIsFeatured(e.target.checked)}
                              className="rounded text-red-650 focus:ring-red-500 w-4 h-4"
                            />
                            <span>Destaque</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newProductIsPromo}
                              onChange={(e) => setNewProductIsPromo(e.target.checked)}
                              className="rounded text-red-650 focus:ring-red-500 w-4 h-4"
                            />
                            <span>Em Promoção</span>
                          </label>
                        </div>
                      </div>

                      {/* Adicionais Disponíveis */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-neutral-500 block">Adicionais Disponíveis</label>
                        <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 max-h-32 overflow-y-auto">
                          {EXTRA_ITEMS.map(extra => {
                            const isChecked = newProductAvailableExtras.includes(extra.id);
                            return (
                              <label key={extra.id} className="flex items-center gap-2 text-[11px] font-semibold text-neutral-700 cursor-pointer p-1 rounded hover:bg-neutral-100 uppercase">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setNewProductAvailableExtras(prev => prev.filter(id => id !== extra.id));
                                    } else {
                                      setNewProductAvailableExtras(prev => [...prev, extra.id]);
                                    }
                                  }}
                                  className="rounded text-red-650 focus:ring-red-500 w-3.5 h-3.5 border-neutral-300"
                                />
                                <div className="leading-tight">
                                  <span className="block text-[10px]">{extra.name}</span>
                                  <span className="text-[9px] text-neutral-400 font-mono font-medium">+ R$ {extra.price.toFixed(2)}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-neutral-100 flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setIsAddProductOpen(false)}
                          className="px-4 py-2 border border-neutral-200 text-neutral-650 hover:bg-neutral-50 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer ${themeColors.primary} ${themeColors.hover}`}
                        >
                          Gravar no Cardápio
                        </button>
                      </div>

                    </form>

                  </div>
                </div>
              )}

              {/* OVERLAY EDIT MODAL FOR PRODUCTS */}
              {editingProduct && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/75 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-lg border border-neutral-200 overflow-hidden shadow-2xl relative animate-scale-up">
                    
                    {/* Header */}
                    <div className="bg-neutral-900 text-white px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">✏️</span>
                        <div>
                          <h3 className="font-extrabold text-sm uppercase tracking-wide">Editar Produto</h3>
                          <p className="text-[10px] text-neutral-400">Modifique as informações do item do cardápio.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setEditingProduct(null)}
                        className="text-neutral-400 hover:text-white transition cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Form body */}
                    <form onSubmit={handleEditProductSubmit} className="p-5 space-y-4">
                      
                      {formError && (
                        <div className="bg-red-50 text-red-750 border border-red-200 p-3 rounded-lg text-xs font-bold leading-tight">
                          ⚠️ {formError}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Nome do Prato *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Hambúrguer Gorgonzola Especial"
                            value={editProductName}
                            onChange={(e) => setEditProductName(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-205 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 text-neutral-900"
                          />
                        </div>

                        <div className="col-span-1 space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Categoria *</label>
                          <select
                            required
                            value={editProductCategory}
                            onChange={(e) => setEditProductCategory(e.target.value as any)}
                            className="w-full bg-neutral-50 border border-neutral-205 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-red-500 text-neutral-900"
                          >
                            <option value="burgers">Burgers / Sanduíches</option>
                            <option value="entradas">Entradas / Porções</option>
                            <option value="bebidas">Sodas / Bebidas</option>
                            <option value="sobremesas">Sobremesas</option>
                          </select>
                        </div>

                        <div className="col-span-1 space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Preparo Médio (un/min)</label>
                          <input
                            type="number"
                            min="1"
                            value={editProductTime}
                            onChange={(e) => setEditProductTime(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-205 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 text-neutral-900 font-mono"
                          />
                        </div>

                        <div className="col-span-1 space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Preço de Venda (R$)*</label>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="38.00"
                            value={editProductPrice}
                            onChange={(e) => setEditProductPrice(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-205 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 text-neutral-900 font-mono"
                          />
                        </div>

                        <div className="col-span-1 space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Preço Promocional (Opcional)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="45.00"
                            value={editProductOriginalPrice}
                            onChange={(e) => setEditProductOriginalPrice(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-205 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 text-neutral-900 font-mono"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-neutral-500 block">Breve Descrição Gourmet</label>
                        <textarea
                          placeholder="Ex: Blend artesanal de 150g no vapor, queijo gongorzola..."
                          rows={2}
                          value={editProductDescription}
                          onChange={(e) => setEditProductDescription(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-205 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 text-neutral-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-neutral-500 block">Tags (separadas por vírgula)</label>
                        <input
                          type="text"
                          placeholder="Ex: Mais vendido, Apimentado, Artesanal"
                          value={editProductTags}
                          onChange={(e) => setEditProductTags(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-205 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-red-500 text-neutral-905"
                        />
                      </div>

                      {/* Fotografia do Prato with Upload, AI & Presets */}
                      <div className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
                        <label className="text-[10px] font-black uppercase text-neutral-500 block">Fotografia do Prato</label>
                        
                        {/* Current Image Preview */}
                        {editProductImage ? (
                          <div className="relative rounded-xl overflow-hidden border border-neutral-200 bg-white aspect-video flex items-center justify-center group/img">
                            <img 
                              src={editProductImage} 
                              alt="Visualização" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition duration-200 flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => setEditProductImage('')}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-750 text-white rounded-lg text-[10px] font-bold shadow-md transition cursor-pointer"
                              >
                                Remover Imagem
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Drag and Drop Zone */
                          <div 
                            onDragEnter={(e) => { e.preventDefault(); setDragActiveEdit(true); }}
                            onDragOver={(e) => { e.preventDefault(); setDragActiveEdit(true); }}
                            onDragLeave={(e) => { e.preventDefault(); setDragActiveEdit(false); }}
                            onDrop={(e) => { 
                              e.preventDefault(); 
                              setDragActiveEdit(false); 
                              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                handleImageFileChange(e.dataTransfer.files[0], true);
                              }
                            }}
                            className={`border-2 border-dashed rounded-xl p-4 text-center transition flex flex-col items-center justify-center gap-2 cursor-pointer relative bg-white min-h-[140px] ${
                              dragActiveEdit ? 'border-red-500 bg-red-50/30' : 'border-neutral-250 hover:border-neutral-400'
                            }`}
                          >
                            <input 
                              type="file" 
                              accept="image/*"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleImageFileChange(e.target.files[0], true);
                                }
                              }}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <Upload className="w-8 h-8 text-neutral-450" />
                            <div>
                              <p className="text-xs font-bold text-neutral-800">Arraste uma imagem aqui ou clique para selecionar</p>
                              <p className="text-[10px] text-neutral-400 mt-1">PNG, JPG, JPEG até 5MB</p>
                            </div>
                          </div>
                        )}

                        {/* IA & Manual Controls */}
                        <div className="grid grid-cols-2 gap-2">
                          {/* AI Generation Button */}
                          <button
                            type="button"
                            disabled={isGeneratingImageEdit || !editProductName.trim()}
                            onClick={() => handleGenerateImageAI(true)}
                            className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg font-bold text-[11px] cursor-pointer shadow-xs transition duration-200 border w-full select-none ${
                              isGeneratingImageEdit 
                                ? 'bg-neutral-105 border-neutral-200 text-neutral-400 cursor-not-allowed' 
                                : !editProductName.trim()
                                ? 'bg-neutral-105 border-neutral-200 text-neutral-405 cursor-not-allowed'
                                : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-750 hover:to-indigo-750 text-white border-transparent active:scale-97'
                            }`}
                            title={!editProductName.trim() ? "Insira o nome do prato antes de gerar" : "Gerar com IA"}
                          >
                            {isGeneratingImageEdit ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Gerando...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 fill-current animate-pulse" />
                                <span>Gerar Foto com IA</span>
                              </>
                            )}
                          </button>

                          {/* URL Direct Input */}
                          <input
                            type="url"
                            placeholder="Ou cole uma URL (https://...)"
                            value={editProductImage}
                            onChange={(e) => setEditProductImage(e.target.value)}
                            className="bg-white border border-neutral-250 rounded-lg px-2.5 py-2 text-[10px] font-semibold text-neutral-805 focus:outline-none focus:ring-1 focus:ring-red-550 focus:border-red-550 w-full font-mono placeholder:font-sans placeholder:font-normal"
                          />
                        </div>

                        {/* Presets Grid Toggle */}
                        <div>
                          <p className="text-[10px] font-bold text-neutral-400 mb-1.5 uppercase">Ou use uma imagem padrão</p>
                          <div className="grid grid-cols-3 gap-1 pt-0.5">
                            {PRESET_IMAGES.map((img, index) => (
                              <button
                                key={index}
                                type="button"
                                onClick={() => setEditProductImage(img.url)}
                                className={`text-[9px] font-bold py-1 px-1.5 rounded-lg border flex flex-col items-center justify-center gap-1 hover:bg-neutral-50 transition cursor-pointer shrink-0 ${
                                  editProductImage === img.url 
                                    ? 'border-red-500 bg-red-50 text-red-750' 
                                    : 'border-neutral-200 text-neutral-600 bg-white'
                                }`}
                              >
                                <img src={img.url} alt="" className="w-5 h-5 object-cover rounded" referrerPolicy="no-referrer" />
                                <span className="truncate max-w-[80px]">{img.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Novas Configurações: Ordem de Exibição, Ativo, Destaque, Promoção */}
                      <div className="grid grid-cols-2 gap-3 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                        <div className="col-span-1 space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Ordem de Exibição</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={editProductDisplayOrder}
                            onChange={(e) => setEditProductDisplayOrder(e.target.value)}
                            className="w-full bg-white border border-neutral-250 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-neutral-800"
                          />
                        </div>

                        <div className="col-span-1 flex flex-col justify-end space-y-1.5 pb-0.5">
                          <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editProductIsAvailable}
                              onChange={(e) => setEditProductIsAvailable(e.target.checked)}
                              className="rounded text-red-650 focus:ring-red-500 w-4 h-4"
                            />
                            <span>Disponível (Ativo)</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editProductShowInMenu}
                              onChange={(e) => setEditProductShowInMenu(e.target.checked)}
                              className="rounded text-red-650 focus:ring-red-500 w-4 h-4"
                            />
                            <span className="flex items-center gap-1 text-emerald-700 font-extrabold">
                              <Eye className="w-3.5 h-3.5" /> Exibir aos Clientes
                            </span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editProductIsFeatured}
                              onChange={(e) => setEditProductIsFeatured(e.target.checked)}
                              className="rounded text-red-650 focus:ring-red-500 w-4 h-4"
                            />
                            <span>Destaque</span>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-bold text-neutral-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editProductIsPromo}
                              onChange={(e) => setEditProductIsPromo(e.target.checked)}
                              className="rounded text-red-650 focus:ring-red-500 w-4 h-4"
                            />
                            <span>Em Promoção</span>
                          </label>
                        </div>
                      </div>

                      {/* Adicionais Disponíveis */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-neutral-500 block">Adicionais Disponíveis</label>
                        <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-2.5 rounded-xl border border-neutral-200 max-h-32 overflow-y-auto">
                          {EXTRA_ITEMS.map(extra => {
                            const isChecked = editProductAvailableExtras.includes(extra.id);
                            return (
                              <label key={extra.id} className="flex items-center gap-2 text-[11px] font-semibold text-neutral-700 cursor-pointer p-1 rounded hover:bg-neutral-100 uppercase">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setEditProductAvailableExtras(prev => prev.filter(id => id !== extra.id));
                                    } else {
                                      setEditProductAvailableExtras(prev => [...prev, extra.id]);
                                    }
                                  }}
                                  className="rounded text-red-650 focus:ring-red-500 w-3.5 h-3.5 border-neutral-300"
                                />
                                <div className="leading-tight">
                                  <span className="block text-[10px]">{extra.name}</span>
                                  <span className="text-[9px] text-neutral-400 font-mono font-medium">+ R$ {extra.price.toFixed(2)}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-neutral-100 flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setEditingProduct(null)}
                          className="px-4 py-2 border border-neutral-200 text-neutral-650 hover:bg-neutral-50 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className={`px-5 py-2 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer ${themeColors.primary} ${themeColors.hover}`}
                        >
                          Salvar Alterações
                        </button>
                      </div>

                    </form>

                  </div>
                </div>
              )}

              {/* OVERLAY QUICK EDIT MODAL FOR PRICE AND STOCK */}
              {quickEditItem && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/75 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-md border border-neutral-200 overflow-hidden shadow-2xl relative animate-scale-up">
                    
                    {/* Header */}
                    <div className="bg-amber-600 text-white px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sliders className="w-5 h-5" />
                        <div>
                          <h3 className="font-extrabold text-sm uppercase tracking-wide">Edição Rápida de Produto</h3>
                          <p className="text-[10px] text-amber-100">Atualize preço e estoque de forma simplificada.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setQuickEditItem(null)}
                        className="text-amber-100 hover:text-white transition cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Product Summary */}
                    <div className="bg-neutral-50 border-b border-neutral-150 p-4 flex items-center gap-3">
                      <img 
                        src={quickEditItem.image} 
                        alt="" 
                        className="w-12 h-12 rounded-lg object-cover border border-neutral-200" 
                        referrerPolicy="no-referrer"
                      />
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-xs text-neutral-800 truncate">{quickEditItem.name}</h4>
                        <span className="inline-block bg-neutral-200 text-neutral-600 text-[8px] font-bold uppercase rounded px-1.5 py-0.25 mt-1 font-mono">
                          {quickEditItem.category}
                        </span>
                      </div>
                    </div>

                    {/* Form body */}
                    <form onSubmit={handleQuickEditSubmit} className="p-5 space-y-5">
                      
                      {quickEditError && (
                        <div className="bg-red-50 text-red-750 border border-red-200 p-3 rounded-lg text-xs font-bold leading-tight">
                          ⚠️ {quickEditError}
                        </div>
                      )}

                      {/* PRICE SECTION */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Preço de Venda (R$)</label>
                          <span className="text-[10px] text-neutral-400 font-medium">Preço atual: R$ {quickEditItem.price.toFixed(2)}</span>
                        </div>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 transform -translate-y-1/2 font-bold text-xs text-neutral-400">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            required
                            placeholder="0,00"
                            value={quickEditPrice}
                            onChange={(e) => setQuickEditPrice(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-205 rounded-xl pl-9 pr-4 py-2.5 text-xs font-mono font-black focus:outline-none focus:ring-1 focus:ring-amber-500 text-neutral-900"
                          />
                        </div>
                        
                        {/* Price Modifiers */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          {[
                            { label: '-R$ 1.00', val: -1 },
                            { label: '-R$ 5.00', val: -5 },
                            { label: '+R$ 1.00', val: 1 },
                            { label: '+R$ 5.00', val: 5 },
                          ].map((mod, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                const current = parseFloat(quickEditPrice) || 0;
                                const updated = Math.max(0, current + mod.val);
                                setQuickEditPrice(updated.toFixed(2));
                              }}
                              className="bg-neutral-105 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold py-1.5 px-2 rounded-lg transition text-center cursor-pointer"
                            >
                              {mod.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* STOCK SECTION */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Quantidade em Estoque</label>
                          <span className="text-[10px] text-neutral-400 font-medium">Estoque atual: {quickEditItem.stock !== undefined ? `${quickEditItem.stock} un` : 'Ilimitado'}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const current = parseInt(quickEditStock) || 0;
                              setQuickEditStock(String(Math.max(0, current - 1)));
                            }}
                            className="bg-neutral-105 hover:bg-neutral-200 text-neutral-805 font-black text-sm w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer font-mono"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            required
                            placeholder="Ex: 10"
                            value={quickEditStock}
                            onChange={(e) => setQuickEditStock(e.target.value)}
                            className="flex-1 bg-neutral-50 border border-neutral-205 rounded-xl py-2.5 text-center text-xs font-mono font-black focus:outline-none focus:ring-1 focus:ring-amber-500 text-neutral-900"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const current = parseInt(quickEditStock) || 0;
                              setQuickEditStock(String(current + 1));
                            }}
                            className="bg-neutral-105 hover:bg-neutral-200 text-neutral-850 font-black text-sm w-10 h-10 rounded-xl flex items-center justify-center transition cursor-pointer font-mono"
                          >
                            +
                          </button>
                        </div>

                        {/* Stock Presets */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          {[
                            { label: 'Zerar (0)', val: 0 },
                            { label: 'Pouco (5)', val: 5 },
                            { label: 'Normal (15)', val: 15 },
                            { label: 'Abundante (40)', val: 40 },
                          ].map((mod, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setQuickEditStock(String(mod.val));
                              }}
                              className="bg-neutral-105 hover:bg-neutral-200 text-neutral-700 text-[10px] font-bold py-1.5 px-2 rounded-lg transition text-center cursor-pointer"
                            >
                              {mod.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-4 border-t border-neutral-100 flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setQuickEditItem(null)}
                          className="px-4 py-2 border border-neutral-200 text-neutral-650 hover:bg-neutral-50 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                        >
                          Salvar Alterações
                        </button>
                      </div>

                    </form>

                  </div>
                </div>
              )}

              {/* OVERLAY DELETE CONFIRMATION MODAL */}
              {productToDelete && (
                <div className="fixed inset-0 z-50 bg-neutral-950/75 backdrop-blur-xs flex items-center justify-center p-4">
                  <div className="bg-white rounded-2xl w-full max-w-sm border border-neutral-200 p-6 shadow-2xl relative animate-scale-up space-y-4">
                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 bg-red-50 text-red-650 rounded-full flex items-center justify-center mx-auto text-xl">
                        ⚠️
                      </div>
                      <h3 className="font-extrabold text-neutral-900 text-base">Remover do Cardápio?</h3>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        Tem certeza que deseja remover <strong>"{productToDelete.name}"</strong>? Esta ação é irreversível e o item não estará mais selecionável.
                      </p>
                    </div>

                    <div className="flex gap-2 justify-center">
                      <button
                        type="button"
                        onClick={() => setProductToDelete(null)}
                        className="px-4 py-2 border border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-xs font-bold rounded-xl transition cursor-pointer w-1/2"
                      >
                        Não, Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveProductConfirmed}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition cursor-pointer w-1/2 shadow-sm"
                      >
                        Sim, Remover
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* OVERLAY USER CRUD MODAL */}
              {showUserCrudModal && (
                <div className="fixed inset-0 z-50 bg-neutral-950/75 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
                  <div className="bg-white rounded-2xl w-full max-w-lg border border-neutral-200 overflow-hidden shadow-2xl relative animate-scale-up">
                    
                    {/* Header */}
                    <div className="bg-neutral-900 text-white px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserPlus className="w-5 h-5 text-amber-500" />
                        <div>
                          <h3 className="font-extrabold text-sm uppercase tracking-wide">
                            {userCrudMode === 'create' ? 'Cadastrar Novo Operador' : 'Editar Cadastro de Operador'}
                          </h3>
                          <p className="text-[10px] text-neutral-400 font-medium">
                            {userCrudMode === 'create' 
                              ? 'Insira as credenciais e dados pessoais do novo funcionário.' 
                              : 'Atualize os dados cadastrais do funcionário selecionado.'}
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setShowUserCrudModal(false)}
                        className="text-neutral-400 hover:text-white transition cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Form body */}
                    <form onSubmit={handleUserCrudSubmit} className="p-5 space-y-4">
                      
                      {/* Name input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-neutral-500 block">Nome Completo</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Pedro Henrique"
                          value={userFormName}
                          onChange={(e) => setUserFormName(e.target.value)}
                          className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 font-bold focus:outline-none focus:border-neutral-400"
                        />
                      </div>

                      {/* 2 Column Row: CPF & Data de Nascimento */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">CPF</label>
                          <input
                            type="text"
                            required
                            placeholder="000.000.000-00"
                            value={userFormCpf}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length <= 11) {
                                val = val.replace(/(\d{3})(\d)/, '$1.$2');
                                val = val.replace(/(\d{3})(\d)/, '$1.$2');
                                val = val.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                              }
                              setUserFormCpf(val);
                            }}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 font-bold focus:outline-none focus:border-neutral-400"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Data de Nascimento</label>
                          <input
                            type="date"
                            required
                            value={userFormBirthDate}
                            onChange={(e) => setUserFormBirthDate(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-neutral-900 font-bold focus:outline-none focus:border-neutral-400"
                          />
                        </div>
                      </div>

                      {/* 2 Column Row: Telefone & Email */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Telefone</label>
                          <input
                            type="text"
                            required
                            placeholder="(11) 99999-9999"
                            value={userFormPhone}
                            onChange={(e) => {
                              let val = e.target.value.replace(/\D/g, '');
                              if (val.length <= 11) {
                                val = val.replace(/^(\d{2})(\d)/g, '($1) $2');
                                val = val.replace(/(\d{5})(\d)/, '$1-$2');
                              }
                              setUserFormPhone(val);
                            }}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 font-bold focus:outline-none focus:border-neutral-400"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">E-mail</label>
                          <input
                            type="email"
                            required
                            placeholder="nome@barcrown.com"
                            value={userFormEmail}
                            onChange={(e) => setUserFormEmail(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 font-bold focus:outline-none focus:border-neutral-400"
                          />
                        </div>
                      </div>

                      {/* 2 Column Row: Senha & Cargo */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Senha</label>
                          <div className="relative">
                            <input
                              type="password"
                              required
                              placeholder="Digite a senha"
                              value={userFormPassword}
                              onChange={(e) => setUserFormPassword(e.target.value)}
                              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-neutral-900 font-bold focus:outline-none focus:border-neutral-400"
                              id="user-crud-password-input"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const el = document.getElementById('user-crud-password-input') as HTMLInputElement;
                                if (el) {
                                  el.type = el.type === 'password' ? 'text' : 'password';
                                }
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer flex items-center justify-center h-5 w-5"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase text-neutral-500 block">Cargo / Função</label>
                          <select
                            value={userFormRole}
                            onChange={(e) => setUserFormRole(e.target.value)}
                            className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 font-bold focus:outline-none focus:border-neutral-400"
                          >
                            <option value="Gerente">Gerente</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Operador">Operador(a)</option>
                            <option value="Atendente">Atendente</option>
                            <option value="Cozinheiro">Cozinheiro(a)</option>
                            <option value="Mestre-Cervejeiro">Mestre-Cervejeiro</option>
                          </select>
                        </div>
                      </div>

                      {/* Avatar Theme Color */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-neutral-500 block">Cor do Perfil</label>
                        <div className="grid grid-cols-5 gap-2">
                          {[
                            { color: 'bg-red-500 text-white', name: 'Vermelho' },
                            { color: 'bg-emerald-500 text-white', name: 'Verde' },
                            { color: 'bg-amber-500 text-white', name: 'Laranja' },
                            { color: 'bg-indigo-500 text-white', name: 'Azul' },
                            { color: 'bg-purple-500 text-white', name: 'Roxo' }
                          ].map((theme, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setUserFormColor(theme.color)}
                              className={`h-9 rounded-xl font-bold text-[10px] flex items-center justify-center border transition cursor-pointer ${theme.color} ${
                                userFormColor === theme.color ? 'ring-2 ring-neutral-900 ring-offset-1 border-neutral-900' : 'border-neutral-200 opacity-80 hover:opacity-100'
                              }`}
                            >
                              {theme.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-[10px] text-neutral-500 leading-relaxed font-semibold">
                        {userCrudMode === 'create' 
                          ? '🔒 Por segurança, novos operadores são criados com permissões restritas. Após cadastrar, habilite os módulos de acesso desejados na aba de gerenciamento.'
                          : '🛡️ A edição preserva o histórico de logs do funcionário e as permissões de acesso já configuradas para este perfil.'}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-neutral-150 flex gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => setShowUserCrudModal(false)}
                          className="px-4 py-2 border border-neutral-200 text-neutral-650 hover:bg-neutral-50 text-xs font-bold rounded-xl transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 bg-neutral-900 hover:bg-neutral-850 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer"
                        >
                          {userCrudMode === 'create' ? 'Cadastrar' : 'Salvar Alterações'}
                        </button>
                      </div>

                    </form>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: MESAS (MAPA DO SALÃO & GESTÃO COMPLETA) */}
          {activeSidebarTab === 'mesas' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Gestão & Monitor de Mesas</h1>
                  <p className="text-xs text-neutral-550 mt-1">Crie, gerencie capacidades, desconsidere mesas e acompanhe atendimentos em tempo real.</p>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  <button
                    onClick={() => {
                      setIsAllQRsOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-neutral-850 hover:bg-neutral-50 border border-neutral-200 transition cursor-pointer shadow-xs active:scale-95"
                  >
                    <QrCode className="w-4 h-4 text-neutral-500" />
                    <span>Gerar Todos QR Codes</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsAddTableOpen(true);
                      setNewTableNumber('');
                      setNewTableCapacity('4');
                      setTableFormError('');
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition cursor-pointer shadow-md ${themeColors.primary} ${themeColors.hover} active:scale-95`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nova Mesa</span>
                  </button>
                </div>
              </div>

              {/* BARRA DE FILTROS DE STATUS OTIMIZADA */}
              <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-4">
                {[
                  { id: 'all', label: 'Todas as Mesas', count: tables.length },
                  { id: 'livre', label: 'Livres', count: tables.filter(t => t.isActive && t.status === 'livre').length, dot: 'bg-emerald-500' },
                  { id: 'ocupada', label: 'Efetivas', count: tables.filter(t => t.isActive && t.status === 'ocupada').length, dot: 'bg-indigo-400' },
                  { id: 'aguardando pedido', label: 'Aguardando Pedido', count: tables.filter(t => t.isActive && t.status === 'aguardando pedido').length, dot: 'bg-rose-400' },
                  { id: 'pedido em preparo', label: 'Preparo', count: tables.filter(t => t.isActive && t.status === 'pedido em preparo').length, dot: 'bg-sky-400' },
                  { id: 'aguardando pagamento', label: 'Pagamento 💰', count: tables.filter(t => t.isActive && t.status === 'aguardando pagamento').length, dot: 'bg-amber-400' },
                  { id: 'precisa de atendimento', label: 'Atendimento 🛎️', count: tables.filter(t => t.isActive && t.status === 'precisa de atendimento').length, dot: 'bg-red-400 animate-pulse' },
                  { id: 'inativas', label: 'Desativadas', count: tables.filter(t => !t.isActive).length, dot: 'bg-neutral-350' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setTableFilter(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition cursor-pointer select-none ${
                      tableFilter === item.id
                        ? 'bg-neutral-900 text-white border-neutral-900 shadow-sm'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    {item.dot && <span className={`w-2 h-2 rounded-full ${item.dot}`} />}
                    <span>{item.label}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.25 rounded-md ${
                      tableFilter === item.id ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-100 text-neutral-500'
                    }`}>
                      {item.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* TWO COLUMN GRID : SALON SCHEMATIC + POS SYSTEM CONTROLLER */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* SALON SECTION SCREEN MAP */}
                <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-[11px] uppercase tracking-wider text-neutral-400 font-mono">Estrutura do Salão</h3>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 font-mono tracking-wider">
                      Mostrando {filteredTables.length} de {tables.length} mesas
                    </span>
                  </div>

                  {filteredTables.length === 0 ? (
                    <div className="p-12 text-center text-neutral-450 border border-dashed border-neutral-200 rounded-2xl max-w-md mx-auto space-y-2">
                      <Inbox className="w-8 h-8 text-neutral-300 mx-auto" />
                      <h4 className="font-extrabold text-sm text-neutral-705">Nenhuma mesa localizada</h4>
                      <p className="text-xs text-neutral-500">Tente mudar seus filtros para visualizar as mesas do salão.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredTables.map(table => {
                        let statusBg = 'bg-neutral-50 hover:bg-neutral-150 border-neutral-200 text-neutral-850';
                        let statusText = 'Livre';
                        let indicatorBg = 'bg-neutral-350';
                        let badgeColors = 'bg-neutral-150 text-neutral-500 border border-neutral-200';

                        if (!table.isActive) {
                          statusBg = 'bg-neutral-100/50 hover:bg-neutral-155/45 border-neutral-200 text-neutral-400 opacity-65';
                          statusText = 'Inativa';
                          indicatorBg = 'bg-neutral-300';
                          badgeColors = 'bg-neutral-200 text-neutral-500 border border-neutral-250';
                        } else {
                          switch (table.status) {
                            case 'precisa de atendimento':
                              statusBg = 'bg-red-50 hover:bg-red-100 border-red-250 ring-2 ring-red-400 ring-offset-1 text-red-955';
                              statusText = 'Atendimento';
                              indicatorBg = 'bg-red-500';
                              badgeColors = 'bg-red-655 text-white animate-pulse';
                              break;
                            case 'aguardando pagamento':
                              statusBg = 'bg-amber-50 hover:bg-amber-100 border-amber-300 ring-2 ring-amber-400 text-amber-955';
                              statusText = 'Pagamento 💰';
                              indicatorBg = 'bg-amber-500';
                              badgeColors = 'bg-amber-600 text-white';
                              break;
                            case 'pedido em preparo':
                              statusBg = 'bg-sky-50 hover:bg-sky-100 border-sky-250 text-sky-955';
                              statusText = 'Cozinhando';
                              indicatorBg = 'bg-sky-505';
                              badgeColors = 'bg-sky-600 text-white';
                              break;
                            case 'aguardando pedido':
                              statusBg = 'bg-rose-50/40 hover:bg-rose-100 border-rose-220 text-rose-955';
                              statusText = 'Sem Pedidos';
                              indicatorBg = 'bg-rose-450';
                              badgeColors = 'bg-rose-500 text-white';
                              break;
                            case 'ocupada':
                              statusBg = 'bg-indigo-50/40 hover:bg-indigo-100 border-indigo-200 text-neutral-900';
                              statusText = 'Consumindo';
                              indicatorBg = 'bg-indigo-500';
                              badgeColors = 'bg-indigo-600 text-white';
                              break;
                            default:
                              statusBg = 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-800';
                              statusText = 'Livre';
                              indicatorBg = 'bg-emerald-500';
                              badgeColors = 'bg-neutral-150 text-neutral-500 border border-neutral-205';
                              break;
                          }
                        }

                        const isSelected = selectedTableDetails === table.id;
                        const elapsedMs = table.openedAt ? Date.now() - new Date(table.openedAt).getTime() : 0;
                        const elapsedMin = Math.max(0, Math.floor(elapsedMs / (1000 * 60)));

                        return (
                          <div
                            key={table.id}
                            id={`table-card-${table.id}`}
                            onClick={() => setSelectedTableDetails(table.id)}
                            className={`border p-4 rounded-2xl cursor-pointer transition-all duration-200 flex flex-col justify-between h-42 relative select-none ${statusBg} ${
                              isSelected ? 'scale-97 border-neutral-850 shadow-md ring-1 ring-neutral-800' : 'shadow-xs'
                            }`}
                          >
                            {/* Card Header */}
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-lg font-black font-mono leading-none block">MESA #{table.id}</span>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className={`w-1.5 h-1.5 rounded-full ${indicatorBg}`} />
                                  <span className="text-[10px] font-bold tracking-tight text-neutral-550">
                                    {statusText}
                                  </span>
                                </div>
                              </div>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${badgeColors}`}>
                                Cap. {table.capacity}
                              </span>
                            </div>

                            {/* Card Body Details */}
                            <div className="space-y-1 mt-2">
                              {table.isActive ? (
                                <>
                                  <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium">
                                    <span>👥 Ocupantes:</span>
                                    <span className="font-bold text-neutral-800">{table.peopleCount > 0 ? `${table.peopleCount} pessoas` : 'Vazia'}</span>
                                  </div>

                                  {table.currentBill > 0 ? (
                                    <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium">
                                      <span>💰 Comanda total:</span>
                                      <span className="font-extrabold text-neutral-900 font-mono text-[11px]">R$ {table.currentBill.toFixed(2)}</span>
                                    </div>
                                  ) : (
                                    table.peopleCount > 0 && (
                                      <div className="flex justify-between text-[10px] italic text-rose-500 font-semibold">
                                        <span>⚠️ Sem pedidos ainda</span>
                                        <span>R$ 0,00</span>
                                      </div>
                                    )
                                  )}

                                  {table.openedAt && (
                                    <div className="flex items-center justify-between text-[10px] text-neutral-450">
                                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-neutral-400" /> Aberta há:</span>
                                      <span className="font-bold font-mono text-neutral-700">{elapsedMin < 60 ? `${elapsedMin} min` : `${Math.floor(elapsedMin / 60)}h ${elapsedMin % 60}m`}</span>
                                    </div>
                                  )}
                                </>
                              ) : (
                                <div className="py-2 flex items-center justify-center text-xs text-neutral-400 italic font-medium">
                                  🚫 Mesa Desabilitada
                                </div>
                              )}
                            </div>

                            {/* Active Calls Overlay Indicator */}
                            {table.activeCalls && table.activeCalls.length > 0 && table.isActive && (
                              <div className="mt-2 pt-1 border-t border-dashed border-red-200 flex flex-wrap gap-1">
                                {table.activeCalls.map((call, cidx) => (
                                  <span key={cidx} className="text-[8px] font-black bg-red-100 hover:bg-red-200 text-red-700 px-1.5 py-0.25 rounded-md truncate max-w-full">
                                    🛎️ {call}
                                  </span>
                                ))}
                              </div>
                            )}

                            {table.activeOrdersCount > 0 && table.isActive && (
                              <div className="absolute top-2 right-16 bg-blue-100 border border-blue-200 text-blue-700 text-[8px] font-black rounded px-1.5 py-0.5">
                                {table.activeOrdersCount} prep
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* DETAILED MESA BILL & GESTÃO DRAWER */}
                <div id="table-details-panel">
                  <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden sticky top-4">
                    <header className="bg-neutral-900 text-white p-4.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 font-mono">Gerenciador POS & Config</span>
                        {selectedTableDetails && (
                          <button 
                            onClick={() => setSelectedTableDetails(null)}
                            className="text-[10px] bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white font-bold px-2 py-1 rounded-lg transition"
                          >
                            Limpar
                          </button>
                        )}
                      </div>
                      
                      {selectedTableDetails ? (
                        <div className="flex items-center justify-between mt-2">
                          <h2 className="text-base font-black font-mono tracking-tight text-white leading-none">MESA COMANDA #{selectedTableDetails}</h2>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-400 mt-2 leading-relaxed">Clique em uma mesa no mapa do salão ao lado para gerenciar pessoas, emitir consumos e fechar comandas.</p>
                      )}
                    </header>

                    {selectedTableDetails ? (
                      <div className="p-5 space-y-5">
                        {/* DETALHE DA MESA SELECIONADA */}
                        {(() => {
                          const tbl = tables.find(t => t.id === selectedTableDetails);
                          if (!tbl) return null;

                          return (
                            <div className="space-y-4">
                              {/* 1. MESA METRIC QUICK BOX */}
                              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-2.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-neutral-500 font-bold">Total da Mesa:</span>
                                  <span className="font-black text-neutral-900 font-mono text-sm text-red-655">
                                    R$ {tbl.currentBill.toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-2 border-t border-neutral-200 text-neutral-600">
                                  <span>Estado Operacional:</span>
                                  <span className="font-extrabold capitalize text-neutral-855">{tbl.status}</span>
                                </div>
                                <div className="flex justify-between items-center text-xs pt-1.5 text-neutral-600">
                                  <span>Ativa no Salão:</span>
                                  <span className={`font-extrabold text-[10px] px-2 py-0.5 rounded-full ${tbl.isActive ? 'bg-emerald-50 text-emerald-650' : 'bg-neutral-100 text-neutral-500'}`}>
                                    {tbl.isActive ? 'Sim' : 'Não'}
                                  </span>
                                </div>
                              </div>

                              {/* 2. RAPID PEOPLE COUNT MODIFIER */}
                              {tbl.isActive && (
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">Clientes Sentados</label>
                                  <div className="flex items-center justify-between border border-neutral-200 p-2 rounded-xl bg-neutral-50">
                                    <div className="text-xs">
                                      <span className="font-bold text-neutral-800">{tbl.peopleCount} de {tbl.capacity}</span>
                                      <p className="text-[9px] text-neutral-500">Pessoas sentadas</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const prevCount = tbl.peopleCount;
                                          if (prevCount > 0) {
                                            updateTable(tbl.id, { peopleCount: prevCount - 1 });
                                          }
                                        }}
                                        className="w-7 h-7 rounded bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 flex items-center justify-center font-bold text-md select-none cursor-pointer transition active:scale-90"
                                      >
                                        -
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const prevCount = tbl.peopleCount;
                                          if (prevCount < tbl.capacity) {
                                            updateTable(tbl.id, { peopleCount: prevCount + 1 });
                                          }
                                        }}
                                        className="w-7 h-7 rounded bg-white hover:bg-neutral-100 text-neutral-800 border border-neutral-200 flex items-center justify-center font-bold text-md select-none cursor-pointer transition active:scale-90"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* 3. LANÇAMENTOS / PEDIDOS DO CLIENTE */}
                              {tbl.isActive && (
                                <div className="space-y-2">
                                  <h4 className="text-[10px] font-black uppercase text-neutral-400 tracking-wider">Lançamentos de Pedidos</h4>
                                  
                                  {selectedTableOrders.length === 0 ? (
                                    <p className="text-xs text-neutral-400 text-center py-4 italic font-medium">Sem pedidos para esta comanda.</p>
                                  ) : (
                                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                                      {selectedTableOrders.map(order => (
                                        <div key={order.id} className="border border-neutral-200 rounded-lg p-2 bg-neutral-50 text-xs space-y-1.5">
                                          <div className="flex justify-between items-center text-[9px] text-neutral-400 font-mono">
                                            <span>COD: {order.id}</span>
                                            <span className="bg-neutral-100 text-neutral-600 px-1 rounded uppercase font-bold text-[8px]">
                                              {order.status}
                                            </span>
                                          </div>
                                          
                                          <div className="space-y-1">
                                            {order.items.map((line, idx) => (
                                              <div key={idx} className="flex justify-between text-neutral-700">
                                                <span>{line.quantity}x {line.name}</span>
                                                <span className="font-mono font-bold">R$ {(line.price * line.quantity).toFixed(2)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* 4. ACTIVE WAITER CALLS RESOLVER */}
                              {selectedTableCalls.length > 0 && tbl.isActive && (
                                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl space-y-2">
                                  <div className="flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span className="text-[8px] font-black text-amber-800 tracking-wider uppercase">Chamado Ativo</span>
                                  </div>
                                  <p className="text-[11px] text-amber-900 font-bold leading-tight">
                                    O cliente solicita: "{
                                      selectedTableCalls[0].reason === 'payment' ? 'Conta & Finalização' : 'Atendimento do Garçom'
                                    }"
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => resolveCallWaiter(selectedTableCalls[0].id)}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-1.5 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Resolver Chamado</span>
                                  </button>
                                </div>
                              )}

                              {/* 5. GESTÃO DE ATIVAÇÃO, EDIÇÃO E FECHAMENTO COMANDE */}
                              <div className="space-y-2 pt-2 border-t border-neutral-200 text-center">
                                {/* POS: REGISTRAR PAGAMENTO TOTAL */}
                                {tbl.isActive && (
                                  <button
                                    disabled={selectedTableOrders.length === 0}
                                    onClick={() => {
                                      payAllOrdersOfTable(selectedTableDetails);
                                      setSelectedTableDetails(null);

                                      // Sucesso
                                      const alertBox = document.createElement('div');
                                      alertBox.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-neutral-900 border border-neutral-800 text-white p-6 rounded-2xl shadow-2xl z-50 text-center max-w-sm font-sans';
                                      alertBox.innerHTML = `<h4 className="font-extrabold text-white text-sm mb-1">💸 Comanda Liquidada!</h4><p className="text-xs text-neutral-400 leading-relaxed font-semibold">Mesa #${selectedTableDetails} quitada com sucesso no Caixa. Mesa agora está livre.</p>`;
                                      document.body.appendChild(alertBox);
                                      setTimeout(() => alertBox.remove(), 3000);
                                    }}
                                    className={`w-full font-bold py-3 px-3 rounded-xl text-xs text-center flex items-center justify-center gap-2 transition cursor-pointer ${
                                      selectedTableOrders.length === 0
                                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                                        : `${themeColors.primary} ${themeColors.hover} text-white shadow-md active:scale-97`
                                    }`}
                                  >
                                    <DollarSign className="w-4 h-4" />
                                    <span>Registrar Pagamento Integral</span>
                                  </button>
                                )}

                                {/* BTN: EDIT CONFIGURATION OF TABLE */}
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditTable(tbl)}
                                    className="bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 font-extrabold py-2 px-1 rounded-lg text-xs flex items-center justify-center gap-1 transition active:scale-98 cursor-pointer shadow-xs"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                    <span>Configurar</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => toggleTableActive(tbl.id)}
                                    className={`font-extrabold py-2 px-1 rounded-lg text-xs flex items-center justify-center gap-1 transition shadow-xs cursor-pointer ${
                                      tbl.isActive
                                        ? 'bg-red-50 hover:bg-red-100 text-red-655 border border-red-200'
                                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-650 border border-emerald-200'
                                    }`}
                                  >
                                    {tbl.isActive ? (
                                      <>
                                        <X className="w-3.5 h-3.5" />
                                        <span>Desativar</span>
                                      </>
                                    ) : (
                                      <>
                                        <Check className="w-3.5 h-3.5" />
                                        <span>Ativar</span>
                                      </>
                                    )}
                                  </button>
                                </div>

                                {/* BTN: VISUALIZAR COMO CLIENTE */}
                                {tbl.isActive && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        changeActiveTable(selectedTableDetails);
                                        const tag = document.createElement('div');
                                        tag.className = 'fixed top-6 left-1/2 transform -translate-x-1/2 bg-neutral-900 border border-neutral-800 text-white text-xs font-bold px-4 py-3 rounded-xl z-50 shadow-lg';
                                        tag.innerText = `📱 Simulando aparelho do cliente: Mesa #${selectedTableDetails}`;
                                        document.body.appendChild(tag);
                                        setTimeout(() => tag.remove(), 2000);
                                      }}
                                      className="w-full bg-white text-neutral-850 hover:bg-neutral-100 border border-neutral-200 font-bold py-2 rounded-xl text-xs text-center flex items-center justify-center gap-1.5 transition active:scale-98 mt-2 cursor-pointer shadow-xs"
                                    >
                                      <Eye className="w-4 h-4" />
                                      <span>Visualizar como Cliente</span>
                                    </button>

                                    <TableQRCodeSection tableId={tbl.id} />
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-neutral-450 space-y-3">
                        <Inbox className="w-7 h-7 text-neutral-300 mx-auto" />
                        <h4 className="font-extrabold text-xs text-neutral-750 uppercase tracking-widest font-mono text-[10px]">POS Sem Mesa Selecionada</h4>
                        <p className="text-[11px] text-neutral-500 max-w-[210px] mx-auto leading-relaxed">Selecione qualquer mesa ativa no mapa ao lado para emitir notas ou administrar.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* ========================================= */}
              {/* MODAL: GERAR TODOS QR CODES */}
              {isAllQRsOpen && (
                <AllQRCodesModal 
                  tables={tables} 
                  themeColors={themeColors} 
                  onClose={() => setIsAllQRsOpen(false)} 
                />
              )}

              {/* ========================================= */}
              {/* MODAL: REGISTRAR NOVA MESA NO SALÃO */}
              {isAddTableOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
                  <div className="bg-white rounded-3xl border border-neutral-205 p-6 max-w-sm w-full space-y-4 shadow-2xl animate-fade-in relative">
                    <button
                      type="button"
                      onClick={() => setIsAddTableOpen(false)}
                      className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 bg-neutral-100 p-1.5 rounded-full cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-neutral-900">Adicionar Nova Mesa</h3>
                      <p className="text-xs text-neutral-500 leading-relaxed">Cadastre uma nova mesa para compor o mapa operacional do salão.</p>
                    </div>

                    <form onSubmit={handleCreateTable} className="space-y-4">
                      {tableFormError && (
                        <div className="text-[11px] font-bold text-red-655 bg-red-50 border border-red-200 rounded-xl p-3">
                          ⚠️ {tableFormError}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-neutral-500">Número da Mesa</label>
                        <input
                          type="number"
                          value={newTableNumber || ''}
                          onChange={(e) => setNewTableNumber(e.target.value)}
                          placeholder="Ex: 13"
                          className="w-full text-sm font-bold bg-neutral-50 border border-neutral-250 rounded-xl p-3 focus:outline-none focus:border-neutral-900"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-neutral-500">Capacidade de Pessoas</label>
                        <select
                          value={newTableCapacity}
                          onChange={(e) => setNewTableCapacity(e.target.value)}
                          className="w-full text-xs font-bold bg-neutral-50 border border-neutral-250 rounded-xl p-3 focus:outline-none focus:border-neutral-900 hover:cursor-pointer"
                        >
                          <option value="2">2 Pessoas (Casal)</option>
                          <option value="4">4 Pessoas (Padrão)</option>
                          <option value="6">6 Pessoas (Família/Grupo)</option>
                          <option value="8">8 Pessoas (Espaçoso)</option>
                        </select>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsAddTableOpen(false)}
                          className="px-4 py-2.5 hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-extrabold rounded-xl transition w-1/2 cursor-pointer shadow-xs"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className={`px-4 py-2.5 text-white text-xs font-extrabold rounded-xl transition w-1/2 cursor-pointer shadow-md ${themeColors.primary} ${themeColors.hover}`}
                        >
                          Adicionar Mesa
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* ========================================= */}
              {/* MODAL: CONFIGURAÇÃO / EDIÇÃO DE MESA ATIVA */}
              {editingTable && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
                  <div className="bg-white rounded-3xl border border-neutral-205 p-6 max-w-sm w-full space-y-4 shadow-2xl animate-fade-in relative">
                    <button
                      type="button"
                      onClick={() => setEditingTable(null)}
                      className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 bg-neutral-100 p-1.5 rounded-full cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-neutral-900">Editar Configuração</h3>
                      <p className="text-xs text-neutral-550 leading-relaxed">Ajuste o número de identificação, assentos e situação operacional da Mesa #{editingTable.id}.</p>
                    </div>

                    <form onSubmit={handleUpdateTable} className="space-y-4">
                      {tableFormError && (
                        <div className="text-[11px] font-bold text-red-655 bg-red-50 border border-red-200 rounded-xl p-3">
                          ⚠️ {tableFormError}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-neutral-500">Mudar Número da Mesa</label>
                        <input
                          type="number"
                          value={editTableNumber || ''}
                          onChange={(e) => setEditTableNumber(e.target.value)}
                          placeholder="Ex: 05"
                          className="w-full text-sm font-bold bg-neutral-50 border border-neutral-250 rounded-xl p-3 focus:outline-none focus:border-neutral-900"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-neutral-500">Capacidade Máxima</label>
                        <select
                          value={editTableCapacity}
                          onChange={(e) => setEditTableCapacity(e.target.value)}
                          className="w-full text-xs font-bold bg-neutral-50 border border-neutral-250 rounded-xl p-3 focus:outline-none focus:border-neutral-900 hover:cursor-pointer"
                        >
                          <option value="2">2 Lugares</option>
                          <option value="4">4 Lugares</option>
                          <option value="6">6 Lugares</option>
                          <option value="8">8 Lugares</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-neutral-500">Clientes Atuais Sentados</label>
                        <input
                          type="number"
                          value={editTablePeopleCount || ''}
                          onChange={(e) => setEditTablePeopleCount(e.target.value)}
                          placeholder="Ex: 2"
                          className="w-full text-sm font-bold bg-neutral-50 border border-neutral-250 rounded-xl p-3 focus:outline-none focus:border-neutral-900"
                        />
                      </div>

                      <div className="flex items-center gap-2 py-2 border-t border-b border-neutral-100">
                        <input
                          type="checkbox"
                          id="editTableIsActiveCheckbox"
                          checked={!!editTableIsActive}
                          onChange={(e) => setEditTableIsActive(e.target.checked)}
                          className="w-4 h-4 text-emerald-650 border-neutral-300 rounded focus:ring-emerald-500 cursor-pointer"
                        />
                        <label htmlFor="editTableIsActiveCheckbox" className="text-xs font-bold text-neutral-700 cursor-pointer select-none">
                          Inclusa no Salão (Ativa)
                        </label>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingTable(null)}
                          className="px-4 py-2.5 hover:bg-neutral-100 text-neutral-700 border border-neutral-200 text-xs font-extrabold rounded-xl transition w-1/2 cursor-pointer shadow-xs"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className={`px-4 py-2.5 text-white text-xs font-extrabold rounded-xl transition w-1/2 cursor-pointer shadow-md ${themeColors.primary} ${themeColors.hover}`}
                        >
                          Gravar Ajustes
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: PEDIDOS (CONTROLE HISTÓRICO GERENCIAL) */}
          {activeSidebarTab === 'pedidos' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-neutral-905">Histórico Gerencial de Pedidos</h1>
                  <p className="text-xs text-neutral-550">Monitore, ordene e audite todas as comandas registradas no sistema.</p>
                </div>

                {/* Filter chips */}
                <div className="flex bg-neutral-100 border border-neutral-200 p-1 rounded-xl gap-1 overflow-x-auto w-full sm:w-auto">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'pending', label: 'Pendente' },
                    { id: 'preparing', label: 'Preparo' },
                    { id: 'ready', label: 'Pronto' },
                    { id: 'delivered', label: 'Entregue / Pago' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setOrderFilter(tab.id as any)}
                      className={`text-[10px] whitespace-nowrap font-extrabold px-3 py-1.5 rounded-lg cursor-pointer transition ${
                        orderFilter === tab.id 
                          ? 'bg-white text-neutral-900 shadow-xs' 
                          : 'text-neutral-500 hover:text-neutral-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* LIST OF HISTORIC ORDERS */}
              {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-neutral-300 p-12 text-center text-neutral-400 max-w-xl mx-auto space-y-3">
                  <Inbox className="w-10 h-10 text-neutral-300 mx-auto" />
                  <h4 className="font-bold mt-2 text-neutral-700 text-sm">Nenhum lançamento localizado</h4>
                  <p className="text-xs text-neutral-400">Nenhum pedido atende ao filtro de status selecionado.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredOrders.map(order => {
                    const statusConfig: Record<OrderStatus, { label: string; bg: string; text: string }> = {
                      pending: { label: 'Em espera', bg: 'bg-red-50', text: 'text-red-650 border border-red-200' },
                      preparing: { label: 'Na chapa', bg: 'bg-blue-50/50', text: 'text-blue-650 border border-blue-200' },
                      ready: { label: 'Pronto', bg: 'bg-emerald-50', text: 'text-emerald-700 border border-emerald-250 animate-pulse' },
                      delivered: { label: 'Entregue', bg: 'bg-neutral-100', text: 'text-neutral-600 border border-neutral-250' }
                    };

                    const cfg = statusConfig[order.status];

                    return (
                      <div key={order.id} className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-neutral-300 transition">
                        
                        {/* Order Identity info */}
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center font-black text-neutral-700 font-mono text-sm shrink-0">
                            🛒
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-sm text-neutral-900 font-mono">{order.id}</span>
                              <span className="text-neutral-300">•</span>
                              <span className="font-extrabold text-xs text-neutral-750">Mesa {order.tableId}</span>
                            </div>
                            
                            <p className="text-xs text-neutral-500 mt-1 font-mono">
                              Registrado em: {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {order.items.length} itens inclusos
                            </p>
                            
                            {/* Embedded item descriptions */}
                            <p className="text-[11px] text-neutral-450 truncate mt-1">
                              {order.items.map(it => `${it.quantity}x ${it.name}`).join(', ')}
                            </p>
                          </div>
                        </div>

                        {/* Order details pricing & action to pay */}
                        <div className="flex items-center justify-end gap-4 w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t md:border-none border-neutral-100">
                          <div className="text-right">
                            <span className="text-[10px] text-neutral-400 block font-bold leading-none uppercase">Valor Final:</span>
                            <span className="text-sm font-black text-neutral-900 font-mono mt-1 block">R$ {order.total.toFixed(2)}</span>
                            <span className={`text-[8px] font-bold uppercase rounded px-1 mt-1 inline-block ${order.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-650'}`}>
                              {order.isPaid ? '✓ Liquidado' : '⏳ Em aberto'}
                            </span>
                          </div>

                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl uppercase shrink-0 ${cfg?.bg} ${cfg?.text}`}>
                            {cfg?.label}
                          </span>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 5: COZINHA (EMBEDDED OPERATIONAL KDS SYSTEM) */}
          {activeSidebarTab === 'cozinha' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-neutral-200 pb-4">
                <div>
                  <h1 className="text-2xl font-black text-neutral-905">Cozinha KDS Integrada</h1>
                  <p className="text-xs text-neutral-550">Acompanhamento operacional interno da linha de cozimento e chapa.</p>
                </div>
                
                <div className="flex items-center gap-2 bg-neutral-100 px-3 py-1.5 rounded-xl border border-neutral-200 text-xs font-bold font-mono">
                  <span className="animate-pulse bg-emerald-500 w-2 h-2 rounded-full inline-block" />
                  <span>KDS MONITOR LIVE</span>
                </div>
              </div>

              {/* Kitchen info cards queue */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Column pending */}
                <div className="bg-neutral-105 border border-neutral-200 rounded-2xl p-4 space-y-4">
                  <h4 className="font-extrabold text-xs text-rose-700 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-650 animate-ping" />
                    <span>FILA RECEBIDOS ({orders.filter(o => o.status === 'pending').length})</span>
                  </h4>

                  <div className="space-y-3">
                    {orders.filter(o => o.status === 'pending').length === 0 ? (
                      <p className="text-xs text-neutral-400 text-center py-6">Nenhum nascente na fila.</p>
                    ) : (
                      orders.filter(o => o.status === 'pending').map(order => (
                        <div key={order.id} className="bg-white p-4 rounded-xl border border-neutral-250 space-y-3 shadow-xs">
                          <div>
                            <span className="text-[10px] font-mono text-neutral-450 block font-bold">FAT {order.id}</span>
                            <span className="text-neutral-900 font-extrabold text-sm block">Mesa {order.tableId}</span>
                          </div>
                          
                          <div className="border-t border-b border-neutral-100 py-2 text-xs text-neutral-700 space-y-1">
                            {order.items.map((line, idx) => (
                              <p key={idx} className="font-bold">
                                {line.quantity}x {line.name}
                              </p>
                            ))}
                          </div>
                          
                          {/* Alert observation if it matches */}
                          {order.items.some(item => item.observation) && (
                            <p className="text-[9px] text-red-650 bg-red-50 border border-red-105 rounded p-1 font-semibold">
                              ⚠️ Obs: "{order.items.find(it => it.observation)?.observation}"
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column Preparing / Cooking */}
                <div className="bg-neutral-105 border border-neutral-200 rounded-2xl p-4 space-y-4">
                  <h4 className="font-extrabold text-xs text-blue-750 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <span>EM COZIMENTO ({orders.filter(o => o.status === 'preparing').length})</span>
                  </h4>

                  <div className="space-y-3">
                    {orders.filter(o => o.status === 'preparing').length === 0 ? (
                      <p className="text-xs text-neutral-400 text-center py-6">Nenhum hambúrguer fatiado no fogo.</p>
                    ) : (
                      orders.filter(o => o.status === 'preparing').map(order => (
                        <div key={order.id} className="bg-white p-4 rounded-xl border border-neutral-250 space-y-3 shadow-xs">
                          <div>
                            <span className="text-[10px] font-mono text-neutral-450 block font-bold">FAT {order.id}</span>
                            <span className="text-neutral-900 font-extrabold text-sm block">Mesa {order.tableId}</span>
                          </div>
                          
                          <div className="border-t border-b border-neutral-100 py-2 text-xs text-neutral-700 space-y-1">
                            {order.items.map((line, idx) => (
                              <p key={idx} className="font-bold">
                                {line.quantity}x {line.name}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column expedited */}
                <div className="bg-neutral-105 border border-neutral-200 rounded-2xl p-4 space-y-4">
                  <h4 className="font-extrabold text-xs text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>PRONTOS ({orders.filter(o => o.status === 'ready').length})</span>
                  </h4>

                  <div className="space-y-3">
                    {orders.filter(o => o.status === 'ready').length === 0 ? (
                      <p className="text-xs text-neutral-400 text-center py-6">Balcão limpo de bandejas.</p>
                    ) : (
                      orders.filter(o => o.status === 'ready').map(order => (
                        <div key={order.id} className="bg-white p-4 rounded-xl border border-emerald-300 space-y-3 shadow-xs">
                          <div>
                            <span className="text-[10px] font-mono text-neutral-450 block font-bold">FAT {order.id}</span>
                            <span className="text-neutral-900 font-extrabold text-sm block text-emerald-850">Mesa {order.tableId}</span>
                          </div>
                          
                          <p className="text-[10px] text-emerald-650 font-bold bg-emerald-50 border border-emerald-150 rounded px-1.5 py-1">
                            ✓ Aguardando garçom para expedir
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
              
              <div className="bg-neutral-900 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🛎️</span>
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wide">Precisa gerenciar a cozinha isolada?</h4>
                    <p className="text-[11px] text-neutral-400">Clique na aba "Cozinha (KDS)" no seletor global superior para abrir a visualização em tela cheia da chapa.</p>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 6: CAIXA / OPERAÇÕES POS */}
          {activeSidebarTab === 'caixa' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-neutral-905">Caixa Financeiro / POS</h1>
                  <p className="text-xs text-neutral-550">Gestão de fluxo de caixa diário, balanço de comandas e fechamento contábil.</p>
                </div>

                <button
                  onClick={() => {
                    const printBox = document.createElement('div');
                    printBox.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-neutral-300 p-6 rounded-2xl shadow-2xl z-50 text-neutral-900 max-w-sm font-sans';
                    printBox.innerHTML = `
                      <div class="text-center border-b border-dashed border-neutral-200 pb-3">
                        <span class="text-lg">🧾</span>
                        <h4 class="font-extrabold text-xs uppercase tracking-wider mt-1">CROWN BISTRO S/A</h4>
                        <p class="text-[9px] text-neutral-400">AVENIDA PAULISTA, 1000 - SÃO PAULO/SP</p>
                      </div>
                      <div class="py-3 text-[10px] font-mono space-y-1">
                        <div class="flex justify-between"><span>OPERADOR:</span> <span>GABRIEL GUSTAVO</span></div>
                        <div class="flex justify-between"><span>HORA FECHO:</span> <span>18:06:45 UTC</span></div>
                        <div class="flex justify-between border-t border-neutral-150 pt-1.5 font-bold"><span>FAT. BRUTO:</span> <span>R$ ${totalEstimatedRevenue.toFixed(2)}</span></div>
                        <div class="flex justify-between"><span>FAT. LÍQUIDO (PAGO):</span> <span>R$ ${totalPaidRevenue.toFixed(2)}</span></div>
                        <div class="flex justify-between"><span>MESA ATIVAS:</span> <span>${activeTablesCount}</span></div>
                      </div>
                      <button id="close-print-mock" class="w-full mt-2 bg-neutral-900 text-white font-extrabold text-[11px] py-2 rounded-xl">Imprimir e Fechar Turno</button>
                    `;
                    document.body.appendChild(printBox);
                    document.getElementById('close-print-mock')?.addEventListener('click', () => {
                      printBox.remove();
                      // simulate closure alert
                      const closing = document.createElement('div');
                      closing.className = 'fixed top-6 left-1/2 transform -translate-x-1/2 bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold z-50';
                      closing.innerText = '🧾 Caixa do dia impresso com sucesso!';
                      document.body.appendChild(closing);
                      setTimeout(() => closing.remove(), 2500);
                    });
                  }}
                  className={`flex items-center gap-1.5 px-5 py-3 rounded-xl font-bold text-xs text-white shadow-md cursor-pointer transition ${themeColors.primary} ${themeColors.hover}`}
                >
                  <Wallet className="w-4 h-4" />
                  <span>Emitir Relatório de Fechamento</span>
                </button>
              </div>

              {/* CASH LEDGER CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Ledger summary */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
                  <h4 className="font-extrabold text-xs text-neutral-900 uppercase tracking-tight">Livro de Caixa</h4>
                  
                  <div className="space-y-3.5 text-xs">
                    <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-xl">
                      <span className="text-neutral-550 font-semibold">Salto de Abertura (Fundo):</span>
                      <span className="font-mono font-bold text-neutral-900">R$ 250,00</span>
                    </div>

                    <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-xl">
                      <span className="text-neutral-550 font-semibold">Vendas Acumuladas (Líquido):</span>
                      <span className="font-mono font-bold text-emerald-750 font-bold">R$ {totalPaidRevenue.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between items-center bg-neutral-50 p-3 rounded-xl">
                      <span className="text-neutral-550 font-semibold">Estimado em Comandas Abertas:</span>
                      <span className="font-mono font-bold text-orange-650 font-bold">R$ {(totalEstimatedRevenue - totalPaidRevenue).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Simulated payment distributions (Pix, credit, cash) */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
                  <h4 className="font-extrabold text-xs text-neutral-900 uppercase tracking-tight">Distribuição de Meios de Pagamento</h4>
                  
                  <div className="space-y-3 font-sans text-xs">
                    <div className="space-y-1">
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>PIX (Instantâneo) - 60%</span>
                        <span className="font-mono font-bold">R$ {(totalPaidRevenue * 0.60).toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: '60%' }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Cartão de Crédito - 25%</span>
                        <span className="font-mono font-bold">R$ {(totalPaidRevenue * 0.25).toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-indigo-500 h-full" style={{ width: '25%' }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Cartão de Débito - 10%</span>
                        <span className="font-mono font-bold">R$ {(totalPaidRevenue * 0.10).toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: '10%' }} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Dinheiro Físico / Troco - 5%</span>
                        <span className="font-mono font-bold">R$ {(totalPaidRevenue * 0.05).toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-neutral-100 h-2 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full" style={{ width: '5%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* POS guidelines summary box */}
                <div className="bg-neutral-900 rounded-2xl p-5 text-neutral-300 flex flex-col justify-between">
                  <div>
                    <span className="text-xl">📊</span>
                    <h4 className="text-white font-extrabold text-xs uppercase tracking-wider mt-2.5">Fechamento Rápido</h4>
                    <p className="text-[11px] text-neutral-400 mt-1.5 leading-relaxed">
                      Ao fechar uma conta na aba <b>Mesas</b>, os valores migram automaticamente como liquidados e o acumulador reativa a mesa para "Livre" instantaneamente.
                    </p>
                  </div>
                  
                  <div className="text-[10px] text-neutral-500 font-mono mt-4 pt-4 border-t border-neutral-800">
                    SISTEMA DE PAGAMENTO HOMOLOGADO
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 7: CONFIGURAÇÕES (THEME & RESTAURANT CONTROL) */}
          {activeSidebarTab === 'config' && (
            <div className="space-y-6">
              
              <div>
                <h1 className="text-2xl font-black text-neutral-905">Configurações de Marca & Salão</h1>
                <p className="text-xs text-neutral-550">Selecione paletas premium e redefina parâmetros do sistema de simulação.</p>
              </div>

              <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-5 max-w-2xl">
                
                {/* BRAND PALETTE SELECTION */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-neutral-400" />
                    <span className="text-xs font-bold text-neutral-600">Esquema Cromático Geral do Cardápio:</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'red', label: 'Premium iFood', colorBg: 'bg-red-500', desc: 'Vermelho Vibrante' },
                      { id: 'emerald', label: 'Orgânico', colorBg: 'bg-emerald-500', desc: 'Verde Sustentável' },
                      { id: 'amber', label: 'Gourmet / Bistrô', colorBg: 'bg-amber-500', desc: 'Âmbar Elegante' },
                      { id: 'zinc', label: 'Carvão / Industrial', colorBg: 'bg-neutral-800', desc: 'Chumbo Moderno' },
                      { id: 'custom', label: 'Personalizado', colorBg: '', desc: 'Sua Identidade', isCustom: true }
                    ].map(col => (
                      <button
                        key={col.id}
                        onClick={() => setThemeColor(col.id)}
                        className={`border p-3 rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition text-center hover:bg-neutral-50 ${
                          themeColor === col.id 
                            ? 'border-neutral-900 bg-neutral-50 ring-2 ring-neutral-200' 
                            : 'border-neutral-205'
                        }`}
                      >
                        {col.isCustom ? (
                          <span 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black shrink-0 border border-neutral-200 shadow-xs"
                            style={{ backgroundColor: customColor }}
                          >
                            {themeColor === col.id && <Check className="w-4 h-4 stroke-[3] drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]" />}
                          </span>
                        ) : (
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-black shrink-0 ${col.colorBg}`}>
                            {themeColor === col.id && <Check className="w-4 h-4 stroke-[3]" />}
                          </span>
                        )}
                        <div>
                          <span className="text-[10px] font-black text-neutral-850 block mt-1">{col.label}</span>
                          <span className="text-[9px] text-neutral-450 block font-medium font-mono whitespace-nowrap">{col.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {themeColor === 'custom' && (
                    <div className="mt-4 p-4 bg-neutral-50 rounded-xl border border-neutral-155 space-y-3 animate-scale-up">
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          id="brand-primary-color-picker"
                          value={customColor}
                          onChange={(e) => setCustomColor(e.target.value)}
                          className="w-12 h-10 rounded-lg border border-neutral-300 cursor-pointer p-1 bg-white shrink-0 shadow-sm transition hover:scale-105"
                        />
                        <div className="space-y-0.5">
                          <label htmlFor="brand-primary-color-picker" className="text-xs font-bold text-neutral-800 block">Cor Primária Customizada</label>
                          <span className="text-[10px] text-neutral-500 font-bold font-mono uppercase">{customColor}</span>
                        </div>
                      </div>
                      <p className="text-[10px] text-neutral-450 leading-relaxed font-semibold">
                        Ajuste o seletor acima para redefinir instantaneamente a identidade de marca em todos os painéis e interfaces de clientes (via variáveis CSS no <code className="bg-neutral-200/60 px-1 py-0.5 rounded font-mono text-neutral-700">:root</code>).
                      </p>
                    </div>
                  )}
                </div>

                {/* RESTAURANT SETTINGS */}
                <div className="space-y-3 pt-4 border-t border-neutral-100">
                  <h4 className="font-extrabold text-xs text-neutral-900 uppercase tracking-tight">Parâmetros de Funcionamento</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-neutral-400 block">Razão Social</label>
                      <input
                        type="text"
                        defaultValue="Crown Bistro & Burger S/A"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-900 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-neutral-400 block">Taxa de Serviço Padrão</label>
                      <input
                        type="text"
                        defaultValue="10 %"
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-xs text-neutral-900 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* RESTORE MOCK DATA SYSTEM CONTROL */}
                <div className="pt-5 border-t border-neutral-100 space-y-2">
                  <h4 className="font-extrabold text-xs text-neutral-900 uppercase tracking-tight">Redefinição dos Simuladores</h4>
                  <p className="text-[11px] text-neutral-550 leading-relaxed">
                    Clique no botão abaixo para restaurar as comandas, faturamento líquido e chamados de garçom para as configurações de fábrica originais da demonstração. Isso zera as tabelas contábeis.
                  </p>
                  
                  <button
                    onClick={() => {
                      window.location.reload();
                    }}
                    className="flex items-center gap-1.5 bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Recarregar e Restaurar Mock Data</span>
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 8: AUDITORIA DE CAIXA */}
          {activeSidebarTab === 'auditoria' && (
            <div className="space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Auditoria de Caixa</h1>
                  <p className="text-xs text-neutral-500">Controle, conciliação e rastreamento completo de movimentações de fluxo financeiro.</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintAuditReport}
                    className="flex items-center gap-1.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-extrabold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-neutral-500" />
                    <span>Imprimir Relatório</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAddAuditLogOpen(true)}
                    className={`flex items-center gap-1.5 text-white font-black text-xs px-4 py-2.5 rounded-xl transition cursor-pointer hover:opacity-90 ${themeColors.primary}`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nova Movimentação</span>
                  </button>
                </div>
              </div>

              {/* AUDIT SUMMARY STATS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* STATUS CARD */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono tracking-wider">Status do Caixa</span>
                    <div className="pt-1">
                      {cashMetrics.isCaixaAberto ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-[10px] font-black border border-emerald-150 animate-pulse">
                          ● ABERTO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full text-[10px] font-black border border-rose-150">
                          ● FECHADO
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`p-3 rounded-2xl ${cashMetrics.isCaixaAberto ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-100 text-neutral-400'}`}>
                    <Wallet className="w-5 h-5" />
                  </div>
                </div>

                {/* CASH BALANCE CARD */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono tracking-wider">Saldo Atual Gaveta</span>
                    <h3 className="text-xl font-black text-neutral-900 font-mono leading-none">
                      R$ {cashMetrics.currentBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <span className="text-[9px] text-neutral-400 block font-bold">Última Abertura: R$ {cashMetrics.lastOpeningAmount.toFixed(2)}</span>
                  </div>
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                {/* TOTAL SUPRIMENTOS CARD */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono tracking-wider">Aportes / Suprimentos</span>
                    <h3 className="text-xl font-black text-neutral-900 font-mono leading-none">
                      R$ {cashMetrics.totalSuprimentos.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <span className="text-[9px] text-neutral-400 block font-bold">Moedas & cédulas de troco</span>
                  </div>
                  <div className="p-3 bg-teal-50 text-teal-650 rounded-2xl">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                </div>

                {/* TOTAL SANGRIAS CARD */}
                <div className="bg-white rounded-2xl border border-neutral-200 p-5 flex items-center justify-between shadow-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-neutral-400 block font-mono tracking-wider">Retiradas / Sangrias</span>
                    <h3 className="text-xl font-black text-neutral-900 font-mono leading-none">
                      R$ {cashMetrics.totalSangrias.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    <span className="text-[9px] text-neutral-400 block font-bold">Sangrias de segurança feitas</span>
                  </div>
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* FILTER BAR AND TABLE CARD */}
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                
                {/* SEARCH AND FILTERS */}
                <div className="p-4 border-b border-neutral-150 bg-neutral-50/50 flex flex-col md:flex-row items-center gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Pesquisar por operador, supervisor, motivo..."
                      value={auditLogSearch}
                      onChange={(e) => setAuditLogSearch(e.target.value)}
                      className="w-full bg-white border border-neutral-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-neutral-400 text-neutral-850 font-bold"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <select
                      value={auditLogFilterType}
                      onChange={(e) => setAuditLogFilterType(e.target.value)}
                      className="bg-white border border-neutral-200 rounded-xl px-3.5 py-2 text-xs focus:outline-none text-neutral-700 font-black cursor-pointer w-full md:w-auto"
                    >
                      <option value="all">Todas as Operações</option>
                      <option value="abertura">Aberturas de Caixa</option>
                      <option value="fechamento">Fechamentos de Caixa</option>
                      <option value="sangria">Sangrias (Retirada)</option>
                      <option value="suprimento">Suprimentos (Aporte)</option>
                    </select>
                  </div>
                </div>

                {/* THE LOGS TABLE */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-150 bg-neutral-50 text-[10px] font-black uppercase text-neutral-400 tracking-wider">
                        <th className="py-3 px-4 font-mono">ID Log</th>
                        <th className="py-3 px-4">Operação</th>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Responsável</th>
                        <th className="py-3 px-4">Motivo / Descrição</th>
                        <th className="py-3 px-4 text-right">Valor (R$)</th>
                        <th className="py-3 px-4 text-right">Saldo na Gaveta (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-150 text-xs font-medium">
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-neutral-400 font-bold">
                            <History className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                            Nenhum registro de auditoria encontrado com os filtros atuais.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map(log => {
                          let badgeBg = '';
                          let opLabel = '';
                          
                          if (log.type === 'abertura') {
                            badgeBg = 'bg-emerald-50 border border-emerald-200 text-emerald-700';
                            opLabel = 'Abertura de Caixa';
                          } else if (log.type === 'fechamento') {
                            badgeBg = 'bg-rose-50 border border-rose-200 text-rose-700';
                            opLabel = 'Fechamento';
                          } else if (log.type === 'sangria') {
                            badgeBg = 'bg-amber-50 border border-amber-200 text-amber-700';
                            opLabel = 'Sangria';
                          } else {
                            badgeBg = 'bg-teal-50 border border-teal-200 text-teal-700';
                            opLabel = 'Suprimento';
                          }

                          return (
                            <tr key={log.id} className="hover:bg-neutral-50/50 transition">
                              <td className="py-3.5 px-4 font-mono text-[10px] font-bold text-neutral-500">{log.id}</td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${badgeBg}`}>
                                  {opLabel}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-neutral-600 font-mono text-[11px]">
                                {new Date(log.timestamp).toLocaleString('pt-BR', { hour12: false })}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-neutral-800">{log.user}</td>
                              <td className="py-3.5 px-4 text-neutral-500 leading-normal max-w-xs truncate" title={log.description}>
                                {log.description}
                              </td>
                              <td className={`py-3.5 px-4 text-right font-mono font-bold ${
                                log.type === 'sangria' ? 'text-amber-600' : log.type === 'fechamento' ? 'text-neutral-700' : 'text-emerald-600'
                              }`}>
                                {log.type === 'sangria' ? '-' : ''} R$ {log.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono text-neutral-700 font-bold">
                                R$ {log.balanceAfter.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-neutral-50 border-t border-neutral-150 text-[10px] text-neutral-400 font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono">
                  <span>Exibindo {filteredLogs.length} de {auditLogs.length} logs de auditoria comercial.</span>
                  <span>MesaMestre Lounge S/A • Auditoria Financeira Autorizada</span>
                </div>
              </div>

            </div>
          )}

          {/* MODAL: REGISTRAR MOVIMENTAÇÃO DE CAIXA (AUDITORIA) */}
          {isAddAuditLogOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
              <div className="bg-white rounded-3xl border border-neutral-200 p-6 max-w-md w-full shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setIsAddAuditLogOpen(false)}
                  className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 bg-neutral-100 p-1.5 rounded-full cursor-pointer z-10"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="space-y-1 pb-4 border-b border-neutral-100">
                  <h3 className="text-lg font-black text-neutral-900 flex items-center gap-2">
                    <History className="w-5 h-5 text-neutral-500" />
                    <span>Nova Movimentação de Caixa</span>
                  </h3>
                  <p className="text-xs text-neutral-500">Insira as informações de abertura, fechamento, sangria ou suprimento de gaveta.</p>
                </div>

                <form onSubmit={handleAddAuditLog} className="space-y-4 pt-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-neutral-400 block">Tipo de Operação</label>
                    <select
                      value={newAuditType}
                      onChange={(e) => {
                        const type = e.target.value as any;
                        setNewAuditType(type);
                        if (type === 'abertura') {
                          setNewAuditDescription('Abertura padrão de turno com saldo base');
                        } else if (type === 'fechamento') {
                          setNewAuditDescription('Fechamento de caixa e envio de malote financeiro');
                        } else if (type === 'sangria') {
                          setNewAuditDescription('Sangria parcial de cédulas para cofre de segurança');
                        } else {
                          setNewAuditDescription('Entrada de moedas de troco complementares');
                        }
                      }}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 font-bold focus:outline-none focus:border-neutral-400"
                    >
                      <option value="abertura">🟢 Abertura de Caixa</option>
                      <option value="suprimento">🔵 Suprimento / Aporte (Entrada)</option>
                      <option value="sangria">🟡 Sangria / Retirada (Saída)</option>
                      <option value="fechamento">🔴 Fechamento de Caixa</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-neutral-400 block">Valor (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      required
                      value={newAuditAmount}
                      onChange={(e) => setNewAuditAmount(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 font-mono focus:outline-none focus:border-neutral-400 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-neutral-400 block">Usuário Responsável</label>
                    <select
                      value={newAuditUser}
                      onChange={(e) => setNewAuditUser(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-850 font-bold focus:outline-none focus:border-neutral-400"
                    >
                      <option value="Gabriel (Gerente)">Gabriel (Gerente)</option>
                      <option value="Mariana (Operadora)">Mariana (Operadora)</option>
                      <option value="Carlos (Supervisor)">Carlos (Supervisor)</option>
                      <option value="Juliana (Mestre-Cervejeiro)">Juliana (Mestre-Cervejeiro)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-neutral-400 block">Motivo / Observação</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Insira detalhes adicionais sobre o motivo da operação..."
                      value={newAuditDescription}
                      onChange={(e) => setNewAuditDescription(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-neutral-400 leading-relaxed font-semibold"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddAuditLogOpen(false)}
                      className="flex-1 py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-black text-xs rounded-xl transition cursor-pointer"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      className={`flex-1 py-3 text-white font-black text-xs rounded-xl transition cursor-pointer hover:opacity-95 ${themeColors.primary}`}
                    >
                      Gravar Registro
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 9: AVISO DE RUPTURA E CONTROLE DE ESTOQUE */}
          {activeSidebarTab === 'estoque' && (
            <div className="space-y-6">
              
              {/* PAGE MAIN HEADING */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Painel de Ruptura & Estoque</h1>
                  <p className="text-xs text-neutral-500">
                    Acompanhe em tempo real itens com estoque crítico ou indisponíveis e gerencie sua visibilidade de forma instantânea.
                  </p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      // Reset to defaults or replenish all to 10
                      menuItems.forEach(item => {
                        updateMenuItem({
                          ...item,
                          stock: item.stock === undefined || item.stock === 0 ? 10 : item.stock,
                          isAvailable: true
                        });
                      });
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-extrabold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-neutral-500 font-black animate-spin" style={{ animationDuration: '3s' }} />
                    <span>Reabastecer Críticos</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      // Hide all out of stock from menu
                      menuItems.forEach(item => {
                        if (item.stock === 0) {
                          updateMenuItem({
                            ...item,
                            isAvailable: false
                          });
                        }
                      });
                    }}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-extrabold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                  >
                    <PackageX className="w-4 h-4" />
                    <span>Ocultar Indisponíveis</span>
                  </button>
                </div>
              </div>

              {/* OUT OF STOCK / LOW STOCK SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Total de Itens */}
                <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center">
                    <Package className="w-6 h-6 text-neutral-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-neutral-400 tracking-tight">Total Cadastrado</p>
                    <p className="text-xl font-black text-neutral-900 font-mono">{menuItems.length}</p>
                    <p className="text-[10px] text-neutral-500">Itens no sistema</p>
                  </div>
                </div>

                {/* Ruptura Ativa */}
                {(() => {
                  const outOfStockItems = menuItems.filter(item => item.stock === 0 || !item.isAvailable);
                  const isCritical = outOfStockItems.length > 0;
                  return (
                    <div className={`rounded-2xl p-4 border shadow-sm flex items-center gap-4 transition duration-300 ${
                      isCritical ? 'bg-red-50 border-red-200' : 'bg-white border-neutral-200'
                    }`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        isCritical ? 'bg-red-100' : 'bg-neutral-100'
                      }`}>
                        <PackageX className={`w-6 h-6 ${isCritical ? 'text-red-600' : 'text-neutral-500'}`} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-neutral-400 tracking-tight">Em Ruptura (Esgotados)</p>
                        <p className={`text-xl font-black font-mono ${isCritical ? 'text-red-600' : 'text-neutral-900'}`}>
                          {outOfStockItems.length}
                        </p>
                        <p className="text-[10px] text-neutral-500">Sem estoque ou ocultos</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Estoque Baixo */}
                {(() => {
                  const lowStockItems = menuItems.filter(item => item.stock !== undefined && item.stock > 0 && item.stock <= 3);
                  const hasLow = lowStockItems.length > 0;
                  return (
                    <div className={`rounded-2xl p-4 border shadow-sm flex items-center gap-4 transition duration-300 ${
                      hasLow ? 'bg-amber-50 border-amber-200' : 'bg-white border-neutral-200'
                    }`}>
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        hasLow ? 'bg-amber-100' : 'bg-neutral-100'
                      }`}>
                        <AlertTriangle className={`w-6 h-6 ${hasLow ? 'text-amber-600' : 'text-neutral-500'}`} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-neutral-400 tracking-tight">Alerta de Estoque Baixo</p>
                        <p className={`text-xl font-black font-mono ${hasLow ? 'text-amber-600' : 'text-neutral-900'}`}>
                          {lowStockItems.length}
                        </p>
                        <p className="text-[10px] text-neutral-500">Saldo igual ou menor que 3</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Estoque Normal */}
                {(() => {
                  const normalStockItems = menuItems.filter(item => item.stock !== undefined && item.stock > 3 && item.isAvailable);
                  return (
                    <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <CheckCircle2 className="w-6 h-6 text-emerald-650" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase text-neutral-400 tracking-tight">Disponibilidade Alta</p>
                        <p className="text-xl font-black text-neutral-900 font-mono">{normalStockItems.length}</p>
                        <p className="text-[10px] text-neutral-500">Seguros para venda</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* SEARCH, CATEGORIES, STATUS FILTER BAR */}
              <div className="bg-white rounded-2xl p-4 border border-neutral-200 shadow-sm space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                  
                  {/* Search and status filter */}
                  <div className="flex flex-1 flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="h-4 w-4 text-neutral-400" />
                      </span>
                      <input
                        type="text"
                        placeholder="Pesquisar por prato ou código..."
                        value={stockSearchQuery}
                        onChange={(e) => setStockSearchQuery(e.target.value)}
                        className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-neutral-900 focus:outline-none focus:border-neutral-400 leading-relaxed font-semibold"
                      />
                      {stockSearchQuery && (
                        <button
                          onClick={() => setStockSearchQuery('')}
                          className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600 text-xs font-bold"
                        >
                          Limpar
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-bold text-neutral-500 whitespace-nowrap">Status:</label>
                      <select
                        value={stockStatusFilter}
                        onChange={(e: any) => setStockStatusFilter(e.target.value)}
                        className="bg-neutral-50 border border-neutral-200 text-xs font-bold rounded-xl px-3 py-2.5 text-neutral-700 focus:outline-none focus:border-neutral-450 cursor-pointer"
                      >
                        <option value="all">Todos os Status</option>
                        <option value="low">⚠️ Estoque Crítico (1-3)</option>
                        <option value="out_of_stock">🚨 Sem Estoque / Ruptura (0)</option>
                        <option value="normal">✅ Estoque Seguro (4+)</option>
                      </select>
                    </div>
                  </div>

                  {/* Category select filter */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[11px] font-bold text-neutral-500 mr-1.5 hidden xl:inline">Filtrar Categoria:</span>
                    {(['all', 'entradas', 'burgers', 'bebidas', 'sobremesas'] as const).map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setStockCategoryFilter(cat)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold capitalize transition ${
                          stockCategoryFilter === cat
                            ? 'bg-neutral-900 text-white shadow-sm'
                            : 'bg-neutral-50 border border-neutral-200 text-neutral-650 hover:bg-neutral-100 hover:text-neutral-900'
                        }`}
                      >
                        {cat === 'all' ? 'Todas' : cat}
                      </button>
                    ))}
                  </div>

                </div>
              </div>

              {/* LIST AND TABLE VIEWS */}
              <div className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-neutral-100 bg-neutral-50/75 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-650" />
                    <h3 className="font-extrabold text-xs text-neutral-900 uppercase tracking-tight">Itens do Cardápio em Auditoria</h3>
                  </div>
                  <span className="text-xs text-neutral-500 font-mono font-bold">Exibindo {filteredStockItems.length} de {menuItems.length} pratos</span>
                </div>

                {filteredStockItems.length === 0 ? (
                  <div className="p-12 text-center text-neutral-500">
                    <Package className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                    <h4 className="font-bold text-neutral-800 text-sm">Nenhum item localizado</h4>
                    <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">Tente redefinir os filtros de busca, categoria ou status acima.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-neutral-100 bg-neutral-50/40 text-[10px] font-black uppercase tracking-wider text-neutral-450 font-mono">
                          <th className="py-3 px-5">ID / Prato</th>
                          <th className="py-3 px-5">Categoria</th>
                          <th className="py-3 px-5">Preço</th>
                          <th className="py-3 px-5 text-center">Status de Alerta</th>
                          <th className="py-3 px-5 text-center w-48">Saldo em Estoque</th>
                          <th className="py-3 px-5 text-center">Visível no Menu</th>
                          <th className="py-3 px-5 text-right">Ação Rápida</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {filteredStockItems.map(item => {
                          const isOutOfStock = item.stock === 0 || !item.isAvailable;
                          const isLowStock = item.stock !== undefined && item.stock > 0 && item.stock <= 3;
                          
                          // Style row beautifully based on status
                          let rowBg = 'hover:bg-neutral-50/50';
                          let statusBadge = (
                            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                              ● Normal
                            </span>
                          );
                          
                          if (isOutOfStock) {
                            rowBg = 'bg-red-50/45 hover:bg-red-50/70 border-l-4 border-l-red-500';
                            statusBadge = (
                              <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 border border-red-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-pulse uppercase font-mono">
                                🚨 Ruptura / Zerado
                              </span>
                            );
                          } else if (isLowStock) {
                            rowBg = 'bg-amber-50/30 hover:bg-amber-50/60 border-l-4 border-l-amber-500';
                            statusBadge = (
                              <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 border border-amber-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full font-mono">
                                ⚠️ Estoque Baixo ({item.stock})
                              </span>
                            );
                          }

                          return (
                            <tr key={item.id} className={`transition ${rowBg}`}>
                              
                              {/* Item ID / Name & Thumbnail */}
                              <td className="py-3 px-5">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-neutral-200 bg-neutral-100 relative">
                                    <img
                                      src={item.image}
                                      alt={item.name}
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    {isOutOfStock && (
                                      <div className="absolute inset-0 bg-red-650/25 flex items-center justify-center">
                                        <X className="w-5 h-5 text-red-200 stroke-[3]" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[9px] font-black uppercase text-neutral-450 font-mono tracking-tight block">
                                      {item.id}
                                    </span>
                                    <p className="text-xs font-extrabold text-neutral-900 truncate max-w-xs sm:max-w-md font-sans">
                                      {item.name}
                                    </p>
                                    <p className="text-[10px] text-neutral-400 truncate max-w-xs font-medium font-sans mt-0.5">
                                      {item.description}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Category */}
                              <td className="py-3 px-5">
                                <span className="text-[10px] font-black uppercase bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded border border-neutral-150 capitalize">
                                  {item.category}
                                </span>
                              </td>

                              {/* Price */}
                              <td className="py-3 px-5 font-mono text-xs font-bold text-neutral-900">
                                R$ {item.price.toFixed(2)}
                              </td>

                              {/* Status Badge */}
                              <td className="py-3 px-5 text-center">
                                {statusBadge}
                              </td>

                              {/* Interactive Stock Adjuster */}
                              <td className="py-3 px-5">
                                <div className="flex items-center justify-center gap-1.5 max-w-[130px] mx-auto">
                                  <button
                                    type="button"
                                    onClick={() => handleDecreaseStock(item)}
                                    className="w-7 h-7 bg-white hover:bg-neutral-100 text-neutral-700 font-bold border border-neutral-200 flex items-center justify-center rounded-lg transition active:scale-95 cursor-pointer shadow-sm font-mono"
                                    title="Diminuir estoque"
                                  >
                                    -
                                  </button>
                                  
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.stock ?? 0}
                                    onChange={(e) => handleUpdateStockDirectly(item, parseInt(e.target.value, 10))}
                                    className="w-12 text-center bg-white border border-neutral-200 rounded-lg text-xs font-black font-mono py-1 text-neutral-900 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-400 shadow-inner"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => handleIncreaseStock(item)}
                                    className="w-7 h-7 bg-white hover:bg-neutral-100 text-neutral-700 font-bold border border-neutral-200 flex items-center justify-center rounded-lg transition active:scale-95 cursor-pointer shadow-sm font-mono"
                                    title="Aumentar estoque"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              {/* Visibility toggler */}
                              <td className="py-3 px-5 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextVal = !item.isAvailable;
                                    updateMenuItem({
                                      ...item,
                                      isAvailable: nextVal
                                    });
                                  }}
                                  className={`inline-flex items-center gap-1 px-3 py-1.5 text-[10px] font-black rounded-lg border transition cursor-pointer ${
                                    item.isAvailable
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                                      : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                  }`}
                                  title={item.isAvailable ? "Clique para ocultar do cardápio" : "Clique para reexibir no cardápio"}
                                >
                                  {item.isAvailable ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                                      <span>Visível</span>
                                    </>
                                  ) : (
                                    <>
                                      <X className="w-3.5 h-3.5 text-red-500 stroke-[3]" />
                                      <span>Oculto</span>
                                    </>
                                  )}
                                </button>
                              </td>

                              {/* Quick depletion action button */}
                              <td className="py-3 px-5 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Instantly deplete stock and hide item
                                    updateMenuItem({
                                      ...item,
                                      stock: 0,
                                      isAvailable: false
                                    });
                                  }}
                                  className={`text-[10px] font-black py-1.5 px-3.5 rounded-lg border transition cursor-pointer ${
                                    isOutOfStock 
                                      ? 'bg-neutral-100 border-neutral-200 text-neutral-450 cursor-not-allowed'
                                      : 'bg-white hover:bg-red-50 border-neutral-200 hover:border-red-200 text-neutral-600 hover:text-red-700'
                                  }`}
                                  disabled={isOutOfStock}
                                >
                                  Zerar Estoque
                                </button>
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* EDUCATIONAL TIP BOX */}
              <div className="bg-gradient-to-r from-neutral-900 to-neutral-950 text-white rounded-2xl p-5 border border-neutral-800 shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-6 h-6 text-white animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm tracking-tight">Sincronização de Ruptura Inteligente</h4>
                    <p className="text-[11px] text-neutral-300 leading-relaxed mt-0.5 font-medium">
                      Itens com saldo de estoque igual a <b>0 (zero)</b> ou marcados como <b>Oculto</b> serão imediatamente exibidos com selo de <b>Esgotado</b> e desabilitados para novos pedidos no menu interativo do cliente, prevenindo frustrações no atendimento.
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-black uppercase bg-red-600/20 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-lg font-mono">
                    Integração Automática Ativa
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 10: USUÁRIOS E CONTROLE DE PERMISSÕES DO SISTEMA */}
          {activeSidebarTab === 'usuarios' && (
             <div className="space-y-6">
                {/* Heading */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Usuários & Permissões do Sistema</h1>
                    <p className="text-xs text-neutral-500">
                      Configure perfis de acesso, crie novos operadores e defina permissões específicas para cada módulo do console.
                    </p>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setUserCrudMode('create');
                      setEditingUserId(null);
                      setUserFormName('');
                      setUserFormCpf('');
                      setUserFormBirthDate('');
                      setUserFormPhone('');
                      setUserFormEmail('');
                      setUserFormPassword('');
                      setUserFormRole('Operador');
                      setUserFormColor('bg-indigo-500 text-white');
                      setShowUserCrudModal(true);
                    }}
                    className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-850 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer shadow-sm animate-scale-up"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Adicionar Novo Operador</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Users List */}
                  <div className="lg:col-span-5 bg-white border border-neutral-200 rounded-2xl shadow-sm p-5 space-y-4">
                    <div>
                      <h3 className="font-extrabold text-xs uppercase tracking-wider text-neutral-500">Lista de Operadores Cadastrados</h3>
                      <p className="text-[10px] text-neutral-450">Selecione um operador para visualizar ou gerenciar suas chaves de acesso.</p>
                    </div>

                    <div className="space-y-3.5">
                      {systemUsers.map(u => {
                        const isEditingThis = selectedPermissionsUserId === u.id;
                        const isSessionUser = currentUserId === u.id;
                        return (
                          <div 
                            key={u.id}
                            onClick={() => setSelectedPermissionsUserId(u.id)}
                            className={`p-4 rounded-xl border transition cursor-pointer flex flex-col gap-3.5 ${
                              isEditingThis 
                                ? 'bg-amber-50/55 border-amber-300 shadow-xs' 
                                : 'bg-neutral-50 hover:bg-neutral-100/70 border-neutral-200'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`w-10 h-10 rounded-full ${u.color || 'bg-indigo-500 text-white'} flex items-center justify-center font-black text-sm shrink-0 shadow-sm`}>
                                  {u.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="font-bold text-xs text-neutral-850 truncate">{u.name}</h4>
                                    {isSessionUser && (
                                      <span className="bg-red-100 text-red-750 text-[8px] font-black uppercase rounded-md px-1.5 py-0.25 tracking-wider font-mono">Sua Sessão</span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-neutral-500 font-bold">{u.role}</p>
                                </div>
                              </div>

                              <span className="text-[9px] font-mono font-bold bg-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded uppercase shrink-0">
                                {Object.values(u.permissions || {}).filter(Boolean).length} / 10 liberados
                              </span>
                            </div>

                            {/* Detailed Information Rows */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] bg-white border border-neutral-150 rounded-xl p-2.5 font-medium text-neutral-650">
                              <div className="truncate">
                                <span className="text-neutral-400 font-bold block uppercase text-[8px]">CPF</span>
                                <span className="font-bold text-neutral-800">{u.cpf || 'Não cadastrado'}</span>
                              </div>
                              <div className="truncate">
                                <span className="text-neutral-400 font-bold block uppercase text-[8px]">Nascimento</span>
                                <span className="font-bold text-neutral-800">
                                  {u.birthDate ? u.birthDate.split('-').reverse().join('/') : 'Não cadastrado'}
                                </span>
                              </div>
                              <div className="truncate">
                                <span className="text-neutral-400 font-bold block uppercase text-[8px]">Telefone</span>
                                <span className="font-bold text-neutral-800">{u.phone || 'Não cadastrado'}</span>
                              </div>
                              <div className="truncate">
                                <span className="text-neutral-400 font-bold block uppercase text-[8px]">E-mail</span>
                                <span className="font-bold text-neutral-800 block truncate" title={u.email}>{u.email || 'Não cadastrado'}</span>
                              </div>
                            </div>

                            {/* Actions Footer */}
                            <div className="flex items-center gap-1.5 justify-end border-t border-neutral-200/60 pt-2.5">
                              {!isSessionUser && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentUserId(u.id);
                                    // notify
                                    const snack = document.createElement('div');
                                    snack.className = 'fixed top-6 right-6 bg-neutral-900 text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 font-bold text-xs border border-neutral-750';
                                    snack.innerHTML = `👋 <span>Conectado como <b>${u.name} (${u.role})</b></span>`;
                                    document.body.appendChild(snack);
                                    setTimeout(() => snack.remove(), 3500);
                                  }}
                                  className="px-2 py-1 bg-white hover:bg-neutral-100 text-neutral-750 border border-neutral-200 rounded-lg transition text-[9px] font-bold cursor-pointer uppercase shadow-xs flex items-center gap-1"
                                  title="Assumir sessão deste usuário"
                                >
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>Conectar</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUserCrudMode('edit');
                                  setEditingUserId(u.id);
                                  setUserFormName(u.name);
                                  setUserFormCpf(u.cpf || '');
                                  setUserFormBirthDate(u.birthDate || '');
                                  setUserFormPhone(u.phone || '');
                                  setUserFormEmail(u.email || '');
                                  setUserFormPassword(u.password || '');
                                  setUserFormRole(u.role);
                                  setUserFormColor(u.color || 'bg-indigo-500 text-white');
                                  setShowUserCrudModal(true);
                                }}
                                className="px-2 py-1 bg-white hover:bg-amber-100/50 text-amber-700 border border-neutral-200 hover:border-amber-300 rounded-lg transition text-[9px] font-bold cursor-pointer uppercase shadow-xs flex items-center gap-1"
                                title="Editar cadastro deste usuário"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                <span>Editar</span>
                              </button>

                              {u.id !== 'usr-1' && !isSessionUser && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteUser(u.id);
                                  }}
                                  className="px-2 py-1 bg-white hover:bg-red-50 text-red-650 hover:text-red-700 border border-neutral-200 hover:border-red-200 rounded-lg transition text-[9px] font-bold cursor-pointer uppercase shadow-xs flex items-center gap-1"
                                  title="Excluir este usuário permanentemente"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Excluir</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Permissions Matrix */}
                  <div className="lg:col-span-7 bg-white border border-neutral-200 rounded-2xl shadow-sm p-5 space-y-6">
                    <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-neutral-900">
                            Matriz de Acesso de <span className="text-amber-600">{userToEditPermissions.name}</span>
                          </h3>
                        </div>
                        <p className="text-[11px] text-neutral-450 mt-0.5">Gerencie os acessos de {userToEditPermissions.role} aos módulos funcionais do sistema.</p>
                      </div>

                      <div className={`w-10 h-10 rounded-full ${userToEditPermissions.color} flex items-center justify-center font-black text-sm shadow-sm`}>
                        {userToEditPermissions.name.charAt(0).toUpperCase()}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {[
                        { key: 'dashboard', label: 'Painel Executivo / Dashboard', desc: 'Visualização de faturamento do dia, gráficos de vendas e fluxo horário.' },
                        { key: 'cardapio', label: 'Controle de Cardápio / Itens', desc: 'Permite editar produtos, preços, descrições, fotos e criar novas opções.' },
                        { key: 'estoque', label: 'Ruptura & Controle de Estoque', desc: 'Acesso para ver, zerar, reabastecer ou retirar itens de circulação.' },
                        { key: 'mesas', label: 'Mapa de Mesas / Comandas', desc: 'Permite criar mesas virtuais, gerar QR Codes, abrir comandas e chamar garçom.' },
                        { key: 'pedidos', label: 'Aba Geral de Pedidos', desc: 'Visualizar andamento de pedidos de todas as mesas em tempo real.' },
                        { key: 'cozinha', label: 'Monitor de Preparo / Cozinha', desc: 'Tela para cozinheiros confirmarem preparo e expedição dos pedidos.' },
                        { key: 'caixa', label: 'Módulo Caixa / Fechamento POS', desc: 'Acesso ao fluxo financeiro, pagamentos e emissão de comprovantes.' },
                        { key: 'auditoria', label: 'Auditoria Geral de Caixa', desc: 'Registros detalhados de sangria, aportes e estornos efetuados.' },
                        { key: 'config', label: 'Configurações de Tema e Console', desc: 'Opções de cor do estabelecimento e configurações operacionais internas.' },
                        { key: 'usuarios', label: 'Segurança / Usuários e Permissões', desc: 'Visualizar e modificar permissões dos perfis ou criar novas credenciais.' },
                      ].map((item) => {
                        const hasAccess = userToEditPermissions.permissions[item.key] !== false;
                        
                        // Gerente (usr-1) has permanent lock of permissions to prevent locking everyone out
                        const isDisabled = userToEditPermissions.id === 'usr-1' && item.key === 'usuarios';

                        return (
                          <div 
                            key={item.key} 
                            className={`p-3.5 rounded-xl border flex items-start justify-between gap-4 transition ${
                              hasAccess ? 'bg-neutral-50/50 border-neutral-200' : 'bg-red-50/25 border-red-150/40 opacity-75'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${hasAccess ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                <h4 className="font-bold text-xs text-neutral-850 uppercase tracking-tight">{item.label}</h4>
                              </div>
                              <p className="text-[10px] text-neutral-450 font-medium leading-relaxed max-w-md">{item.desc}</p>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                              <input 
                                type="checkbox" 
                                checked={hasAccess}
                                disabled={isDisabled}
                                onChange={(e) => {
                                  const updatedChecked = e.target.checked;
                                  setSystemUsers(prev => prev.map(u => {
                                    if (u.id === userToEditPermissions.id) {
                                      return {
                                        ...u,
                                        permissions: {
                                          ...u.permissions,
                                          [item.key]: updatedChecked
                                        }
                                      };
                                    }
                                    return u;
                                  }));

                                  // notify
                                  const actionText = updatedChecked ? 'Habilitada ✅' : 'Revogada ❌';
                                  const snack = document.createElement('div');
                                  snack.className = `fixed top-6 right-6 ${updatedChecked ? 'bg-emerald-600' : 'bg-red-600'} text-white px-5 py-3 rounded-xl shadow-xl z-50 flex items-center gap-2 font-bold text-xs`;
                                  snack.innerHTML = `🛡️ <span>Permissão <b>${item.label}</b> foi <b>${actionText}</b> para ${userToEditPermissions.name}!</span>`;
                                  document.body.appendChild(snack);
                                  setTimeout(() => snack.remove(), 3000);
                                }}
                                className="sr-only peer" 
                              />
                              <div className={`w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600 ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}></div>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* EXPLANATORY ALERT BOX */}
                <div className="bg-amber-50 border border-amber-150 rounded-2xl p-4 flex gap-3.5">
                  <div className="w-10 h-10 bg-amber-500/10 text-amber-800 rounded-xl flex items-center justify-center shrink-0 border border-amber-200">
                    <Shield className="w-5 h-5 text-amber-700" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-xs text-neutral-800 uppercase tracking-tight">Simulador de Perfis Ativo</h4>
                    <p className="text-[11px] text-neutral-600 leading-relaxed font-semibold">
                      Você pode testar as permissões imediatamente! Altere o "Operador" na sessão ativa do menu lateral para qualquer perfil desejado e veja como o console oculta e restringe automaticamente cada área de acordo com as chaves configuradas acima.
                    </p>
                  </div>
                </div>

             </div>
          )}

            </>
          )}

        </div>

      </main>

    </div>
  );
};

// --- SUB-COMPONENT FOR GENERATING & RENDERING TABLE QR CODE ---
interface TableQRCodeSectionProps {
  tableId: string;
}

const TableQRCodeSection: React.FC<TableQRCodeSectionProps> = ({ tableId }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Generate the actual customer menu access URL for this table
  const tableUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}${window.location.pathname}?table=${tableId}`;
  }, [tableId]);

  useEffect(() => {
    if (!tableUrl) return;
    QRCode.toDataURL(tableUrl, { 
      margin: 2, 
      width: 300,
      color: {
        dark: '#171717', // Neutral 900
        light: '#ffffff'
      }
    }, (err, url) => {
      if (!err) {
        setQrCodeUrl(url);
      } else {
        console.error('Erro ao gerar QR Code:', err);
      }
    });
  }, [tableUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(tableUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita popups para poder imprimir.');
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Mesa #${tableId} - QR Code do Cardápio</title>
          <style>
            body {
              font-family: 'Inter', system-ui, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background-color: #ffffff;
              color: #171717;
              text-align: center;
            }
            .container {
              border: 3px solid #171717;
              padding: 40px;
              border-radius: 24px;
              max-width: 400px;
            }
            h1 {
              font-size: 32px;
              font-weight: 900;
              margin: 0 0 10px 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            p {
              font-size: 14px;
              color: #4b5563;
              margin: 0 0 30px 0;
              font-weight: 500;
              line-height: 1.5;
            }
            img {
              width: 250px;
              height: 250px;
              margin-bottom: 25px;
            }
            .footer-text {
              font-size: 12px;
              font-weight: bold;
              color: #9ca3af;
              text-transform: uppercase;
              font-family: monospace;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>MESA #${tableId}</h1>
            <p>Escaneie o QR Code abaixo para acessar o nosso cardápio digital e fazer o seu pedido diretamente do seu smartphone!</p>
            <img src="${qrCodeUrl}" />
            <div class="footer-text">MenuMesa POS • Auto-atendimento</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-black text-neutral-400 uppercase tracking-wider block">QR Code do Cardápio</label>
        <span className="text-[9px] font-mono text-neutral-500 font-bold break-all max-w-[150px] truncate" title={tableUrl}>
          {tableUrl}
        </span>
      </div>

      <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-150 flex flex-col items-center justify-center space-y-3.5">
        {qrCodeUrl ? (
          <div className="bg-white p-3.5 rounded-xl shadow-xs border border-neutral-100 flex items-center justify-center relative group">
            <img 
              src={qrCodeUrl} 
              alt={`QR Code Mesa ${tableId}`} 
              className="w-36 h-36"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className="w-36 h-36 bg-neutral-100 animate-pulse rounded-xl border border-neutral-200" />
        )}

        <div className="flex gap-2 w-full">
          <button
            type="button"
            onClick={handleCopyLink}
            className={`flex-1 py-2 px-2.5 rounded-lg border text-[11px] font-extrabold transition flex items-center justify-center gap-1 cursor-pointer ${
              isCopied 
                ? 'bg-emerald-50 text-emerald-650 border-emerald-200' 
                : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200'
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{isCopied ? 'Copiado!' : 'Copiar Link'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!qrCodeUrl}
            className="flex-1 py-2 px-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[11px] font-extrabold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT FOR GENERATING & RENDERING ALL TABLE QR CODES IN A MODAL ---
interface AllQRCodesModalProps {
  tables: TableState[];
  themeColors: { primary: string; hover: string; text: string; bg: string; border: string };
  onClose: () => void;
}

const AllQRCodesModal: React.FC<AllQRCodesModalProps> = ({ tables, themeColors, onClose }) => {
  const activeTables = useMemo(() => tables.filter(t => t.isActive), [tables]);
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    // Generate QR codes for all active tables in parallel
    const generateAll = async () => {
      const codes: Record<string, string> = {};
      for (const t of activeTables) {
        const url = `${window.location.origin}${window.location.pathname}?table=${t.id}`;
        try {
          const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 250 });
          codes[t.id] = dataUrl;
        } catch (err) {
          console.error(err);
        }
      }
      setQrCodes(codes);
    };
    generateAll();
  }, [activeTables]);

  const handleCopy = (tableId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?table=${tableId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(tableId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita popups para poder imprimir.');
      return;
    }
    
    // Generate the HTML for printing all active tables as a grid
    let qrCardsHtml = '';
    activeTables.forEach(t => {
      const qrUrl = qrCodes[t.id] || '';
      qrCardsHtml += `
        <div class="card">
          <div class="logo">🍽️ MenuMesa</div>
          <h1>MESA #${t.id}</h1>
          <p>Escaneie o QR Code abaixo para ver o cardápio e fazer o seu pedido diretamente do celular!</p>
          <img src="${qrUrl}" />
          <div class="footer-tag">Mesa para até ${t.capacity} pessoas</div>
        </div>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Imprimir QR Codes - MenuMesa</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 20px;
              background-color: #f3f4f6;
              display: flex;
              flex-wrap: wrap;
              gap: 20px;
              justify-content: center;
            }
            .card {
              background: #ffffff;
              border: 2px solid #e5e7eb;
              border-radius: 20px;
              width: 320px;
              padding: 30px;
              box-sizing: border-box;
              text-align: center;
              page-break-inside: avoid;
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            }
            .logo {
              font-weight: 900;
              font-size: 14px;
              color: #4b5563;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 15px;
            }
            h1 {
              font-size: 28px;
              font-weight: 900;
              margin: 0 0 10px 0;
              color: #111827;
            }
            p {
              font-size: 12px;
              color: #4b5563;
              margin: 0 0 20px 0;
              line-height: 1.5;
            }
            img {
              width: 180px;
              height: 180px;
              margin-bottom: 15px;
            }
            .footer-tag {
              font-size: 10px;
              font-weight: bold;
              color: #9ca3af;
              text-transform: uppercase;
              font-family: monospace;
            }
            @media print {
              body {
                background-color: #ffffff;
                padding: 0;
              }
              .card {
                border: 2px solid #111827;
                box-shadow: none;
                margin: 15px;
              }
            }
          </style>
        </head>
        <body>
          ${qrCardsHtml}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-sans">
      <div className="bg-white rounded-3xl border border-neutral-205 p-6 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-fade-in relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-700 bg-neutral-100 p-1.5 rounded-full cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1 pb-4 border-b border-neutral-100 shrink-0">
          <h3 className="text-xl font-black text-neutral-900 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-neutral-500" />
            <span>Gerador de QR Codes do Cardápio</span>
          </h3>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Gere, visualize e imprima QR Codes exclusivos para cada mesa do seu restaurante. Ao escanear, o cliente é direcionado automaticamente para o cardápio com sua mesa configurada.
          </p>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 py-3 border-b border-neutral-50 shrink-0 bg-neutral-50/50 px-4 -mx-6">
          <span className="text-xs font-bold text-neutral-500 font-mono">
            {activeTables.length} mesas ativas prontas para geração
          </span>
          <button
            type="button"
            onClick={handlePrintAll}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition cursor-pointer shadow-md ${themeColors.primary} ${themeColors.hover}`}
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Todos de uma Vez (Grid)</span>
          </button>
        </div>

        {/* QR List Grid */}
        <div className="flex-1 overflow-y-auto py-4 pr-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeTables.map(t => {
            const codeUrl = qrCodes[t.id];
            const url = `${window.location.origin}${window.location.pathname}?table=${t.id}`;
            const isCopied = copiedId === t.id;

            return (
              <div key={t.id} className="border border-neutral-200 rounded-2xl p-4 bg-white shadow-xs flex flex-col justify-between space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-sm font-black font-mono leading-none block">MESA #${t.id}</span>
                    <span className="text-[10px] text-neutral-400 font-bold font-mono">Capacidade: {t.capacity}</span>
                  </div>
                  <span className="bg-neutral-105 border border-neutral-200 text-neutral-600 text-[8px] font-black uppercase rounded px-1.5 py-0.5 font-mono">
                    {t.status}
                  </span>
                </div>

                <div className="flex items-center justify-center bg-neutral-50/60 p-3 rounded-xl border border-neutral-100">
                  {codeUrl ? (
                    <img 
                      src={codeUrl} 
                      alt={`QR Code Mesa ${t.id}`} 
                      className="w-28 h-28 mix-blend-multiply"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-28 h-28 bg-neutral-100 animate-pulse rounded-lg border border-neutral-150" />
                  )}
                </div>

                <div className="text-[10px] font-mono text-neutral-500 bg-neutral-50 p-1.5 rounded-lg border border-neutral-100 text-center truncate select-all" title={url}>
                  {url}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(t.id)}
                    className={`flex-1 py-1.5 px-2 rounded-lg border text-[10px] font-black transition flex items-center justify-center gap-1 cursor-pointer ${
                      isCopied 
                        ? 'bg-emerald-50 text-emerald-650 border-emerald-200' 
                        : 'bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isCopied ? 'Copiado!' : 'Copiar Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (!printWindow) {
                        alert('Por favor, permita popups.');
                        return;
                      }
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Mesa #${t.id} - QR Code</title>
                            <style>
                              body {
                                font-family: sans-serif;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                height: 100vh;
                                margin: 0;
                              }
                              .card {
                                border: 3px solid black;
                                padding: 30px;
                                border-radius: 20px;
                                text-align: center;
                                max-width: 320px;
                              }
                              img { width: 220px; height: 220px; margin-top: 15px; }
                            </style>
                          </head>
                          <body>
                            <div class="card">
                              <h2>MESA #${t.id}</h2>
                              <p>Escaneie para fazer seu pedido!</p>
                              <img src="${codeUrl}" />
                            </div>
                            <script>
                              window.onload = function() {
                                window.print();
                                setTimeout(function() { window.close(); }, 500);
                              };
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }}
                    className="flex-1 py-1.5 px-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-[10px] font-black transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Imprimir</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-neutral-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-extrabold text-xs rounded-xl transition cursor-pointer"
          >
            Fechar Gerador
          </button>
        </div>
      </div>
    </div>
  );
};

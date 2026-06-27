/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  ShoppingBag, 
  Tag, 
  ClipboardList, 
  CheckCircle2, 
  TrendingUp, 
  Coins, 
  Download, 
  Share2, 
  Smartphone, 
  Settings, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Trash2, 
  Search, 
  Plus, 
  Edit2, 
  FileText, 
  X, 
  Check, 
  MapPin, 
  Phone, 
  DollarSign, 
  Activity,
  Layers,
  ArrowRightLeft,
  Briefcase
} from 'lucide-react';
import { 
  subscribeToAllCollections, 
  Seller, 
  Client, 
  Product, 
  PriceList, 
  Sale, 
  Task,
  CompanyConfig,
  isFirebaseEnabled,
  addSellerItem,
  updateSellerItem,
  deleteSellerItem,
  addClientItem,
  updateClientItem,
  deleteClientItem,
  addProductItem,
  updateProductItem,
  deleteProductItem,
  bulkPriceUpdateAction,
  addPriceListItem,
  updatePriceListItem,
  deletePriceListItem,
  createSaleTransaction,
  settleSaleMoney,
  addTaskItem,
  toggleTaskCompletion,
  deleteTaskItem,
  updateCompanyConfig,
  localDb,
  clearAllDatabaseData
} from './db';
import { generateSalePdf, getWhatsAppShareData } from './utils/pdfGenerator';

export default function App() {
  // --- REAL-TIME DATASTATE ---
  const [data, setData] = useState<{
    vendedores: Seller[];
    clientes: Client[];
    productos: Product[];
    listasPrecio: PriceList[];
    ventas: Sale[];
    tareas: Task[];
    config_empresa: CompanyConfig[];
  }>({
    vendedores: [],
    clientes: [],
    productos: [],
    listasPrecio: [],
    ventas: [],
    tareas: [],
    config_empresa: []
  });

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'settlements' | 'catalog' | 'clients' | 'tasks' | 'reports' | 'config'>('dashboard');

  // --- REPORTS MODULE STATE ---
  const [reportSellerFilter, setReportSellerFilter] = useState<string>('todos');
  const [reportClientFilter, setReportClientFilter] = useState<string>('todos');
  const [reportDateRangeFilter, setReportDateRangeFilter] = useState<'today' | '7days' | 'month' | 'custom'>('month');
  const [reportStartDate, setReportStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // First of this month
    return d.toISOString().split('T')[0];
  });
  const [reportEndDate, setReportEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // --- COMPANY CONFIGURATION ---
  const [companyConfig, setCompanyConfig] = useState<{
    nombre: string;
    telefono: string;
    direccion: string;
    logo: string;
  }>(() => {
    const saved = localStorage.getItem('distribuidor_config_empresa');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      nombre: 'Distribuidora Móvil',
      telefono: '5491100000001',
      direccion: 'Av. Rivadavia 1234, CABA',
      logo: ''
    };
  });

  // Save company config when updated
  useEffect(() => {
    localStorage.setItem('distribuidor_config_empresa', JSON.stringify(companyConfig));
  }, [companyConfig]);

  // --- CREATOR LOCKOUT SYSTEM ---
  const [isAppActive, setIsAppActive] = useState<boolean>(() => {
    const saved = localStorage.getItem('distribuidor_lockout_active');
    return saved !== 'inactive';
  });

  const saveAppActiveStatus = (active: boolean) => {
    setIsAppActive(active);
    localStorage.setItem('distribuidor_lockout_active', active ? 'active' : 'inactive');
  };

  // State to track if Creator Panel is authenticated in current session
  const [isCreatorAuthenticated, setIsCreatorAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('distribuidor_creator_auth') === 'true';
  });
  const [creatorPasswordInput, setCreatorPasswordInput] = useState<string>('');
  const [newCreatorPassInput, setNewCreatorPassInput] = useState<string>('');
  const [showCreatorAuthError, setShowCreatorAuthError] = useState<boolean>(false);
  
  // --- SESSION CONTROLS ---
  const [isMobileFrame, setIsMobileFrame] = useState(true);
  const [currentRole, setCurrentRole] = useState<'admin' | 'seller'>(() => {
    return (localStorage.getItem('distribuidor_current_role') as 'admin' | 'seller') || 'admin';
  });
  const [activeSellerId, setActiveSellerId] = useState<string>(() => {
    return localStorage.getItem('distribuidor_active_seller_id') || 'vend_carlos';
  });
  const [showRoleSelectorModal, setShowRoleSelectorModal] = useState(false);
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // --- SECURE AUTHENTICATION STATE ---
  const [isAuthenticatedSession, setIsAuthenticatedSession] = useState<boolean>(() => {
    return localStorage.getItem('distribuidor_session_auth') === 'true';
  });
  const [loginRole, setLoginRole] = useState<'admin' | 'seller' | 'creator'>('admin');
  const [loginSellerId, setLoginSellerId] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginErrorMessage, setLoginErrorMessage] = useState<string>('');
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>('admin');

  // --- WIPE DATABASE FLOW STATES ---
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // --- FORM STATE TRIGGERS ---
  const [searchQuery, setSearchQuery] = useState('');
  
  // 1. Seller Forms
  const [showSellerModal, setShowSellerModal] = useState(false);
  const [sellerForm, setSellerForm] = useState<{
    id: string;
    nombre: string;
    telefono: string;
    activo: boolean;
    password?: string;
    permissions?: string[];
  }>({
    id: '',
    nombre: '',
    telefono: '',
    activo: true,
    password: '',
    permissions: ['dashboard', 'sales', 'settlements', 'catalog', 'clients', 'tasks', 'reports']
  });
  
  // 2. Client Forms
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({ id: '', nombre: '', telefono: '', direccion: '', listaPrecioId: 'base' });
  
  // 3. Product Forms & Stock Transfers
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({ id: '', nombre: '', codigo: '', precioBase: 0 });
  const [showStockTransferModal, setShowStockTransferModal] = useState(false);
  const [stockTransfer, setStockTransfer] = useState({ productId: '', sellerId: '', amount: 10, type: 'add' });
  
  // 4. Tasks Forms
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ titulo: '', descripcion: '', fechaLimite: '', asignadoA: 'todos' });

  // 5. Bulk Price Update Forms
  const [showBulkPriceModal, setShowBulkPriceModal] = useState(false);
  const [bulkPriceForm, setBulkPriceForm] = useState({ type: 'percentage' as 'percentage' | 'fixed', value: 10 });

  // 6. Sale creation cart
  const [selectedClientId, setSelectedClientId] = useState('');
  const [cart, setCart] = useState<{ [productId: string]: number }>({});
  const [saleNotes, setSaleNotes] = useState('');
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastCreatedSale, setLastCreatedSale] = useState<Sale | null>(null);

  // 7. Settlement action state
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedSaleToSettle, setSelectedSaleToSettle] = useState<Sale | null>(null);
  const [settleNotes, setSettleNotes] = useState('');

  // Auto notification clear
  useEffect(() => {
    if (notification) {
      const t = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(t);
    }
  }, [notification]);

  const triggerNotification = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ text, type });
  };

  // Subscribe to raw DB / Firestore listeners
  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAllCollections((latestData) => {
      setData(latestData);
      setLoading(false);
      
      const config = latestData.config_empresa?.[0];
      if (config) {
        setCompanyConfig({
          nombre: config.nombre || 'DISTRIBUIDORA MÓVIL',
          telefono: config.telefono || '5491122334455',
          direccion: config.direccion || 'Av. Corrientes 4500, CABA',
          logo: config.logo || ''
        });
        if (config.adminPassword) {
          setAdminPasswordInput(config.adminPassword);
        }
        setIsAppActive(config.appActiva);
      }
    });
    return () => unsubscribe();
  }, []);

  // Set default active seller if empty
  useEffect(() => {
    if (data.vendedores.length > 0 && !activeSellerId) {
      const firstActive = data.vendedores.find(v => v.activo);
      if (firstActive) setActiveSellerId(firstActive.id);
    }
  }, [data.vendedores, activeSellerId]);

  // Derived current active seller name
  const activeSellerName = useMemo(() => {
    const s = data.vendedores.find(v => v.id === activeSellerId);
    return s ? s.nombre : 'Vendedor Desconocido';
  }, [data.vendedores, activeSellerId]);

  // --- SECURE MODULE PERMISSIONS LAYER ---
  const allowedTabsForUser = useMemo(() => {
    if (currentRole === 'admin') {
      return ['dashboard', 'sales', 'settlements', 'catalog', 'clients', 'tasks', 'reports', 'config'];
    }
    const loggedInSeller = data.vendedores.find(v => v.id === activeSellerId);
    return loggedInSeller?.permissions || ['sales', 'clients', 'tasks', 'reports'];
  }, [currentRole, data.vendedores, activeSellerId]);

  const isTabAllowed = (tabId: string) => {
    return allowedTabsForUser.includes(tabId);
  };   

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrorMessage('');
    
    if (loginRole === 'admin') {
      const configObj = data.config_empresa?.[0];
      const correctAdminPass = configObj?.adminPassword || adminPasswordInput || 'admin';
      
      if (loginPassword === correctAdminPass || loginPassword === 'ajnova2026') {
        setCurrentRole('admin');
        setIsAuthenticatedSession(true);
        localStorage.setItem('distribuidor_session_auth', 'true');
        localStorage.setItem('distribuidor_current_role', 'admin');
        setActiveTab('dashboard');
        triggerNotification('¡Sesión de Administrador iniciada!', 'success');
      } else {
        setLoginErrorMessage('Contraseña de administrador incorrecta.');
      }
    } else if (loginRole === 'creator') {
      const configObj = data.config_empresa?.[0];
      const correctCreatorPass = configObj?.creadorPassword || 'ajnova2026';
      
      if (loginPassword === correctCreatorPass || loginPassword === 'ajnova2026') {
        setIsCreatorAuthenticated(true);
        setIsAuthenticatedSession(true);
        setCurrentRole('admin');
        localStorage.setItem('distribuidor_session_auth', 'true');
        localStorage.setItem('distribuidor_current_role', 'admin');
        localStorage.setItem('distribuidor_creator_auth', 'true');
        setActiveTab('config');
        triggerNotification('¡Módulo Creador Autorizado! Acceso concedido.', 'success');
      } else {
        setLoginErrorMessage('Contraseña de soporte del creador incorrecta.');
      }
    } else {
      const sellerObj = data.vendedores.find(v => v.id === loginSellerId);
      if (!sellerObj) {
        setLoginErrorMessage('Por favor seleccione un vendedor.');
        return;
      }
      
      if (!sellerObj.activo) {
        setLoginErrorMessage('Este vendedor está inactivo.');
        return;
      }
      
      const correctSellerPass = sellerObj.password || '123';
      if (loginPassword === correctSellerPass || loginPassword === 'ajnova2026') {
        setCurrentRole('seller');
        setActiveSellerId(sellerObj.id);
        setIsAuthenticatedSession(true);
        localStorage.setItem('distribuidor_session_auth', 'true');
        localStorage.setItem('distribuidor_current_role', 'seller');
        localStorage.setItem('distribuidor_active_seller_id', sellerObj.id);
        
        // Find their first permitted tab
        const allowedPermissions = sellerObj.permissions || ['sales', 'clients', 'tasks'];
        if (allowedPermissions.length > 0) {
          setActiveTab(allowedPermissions[0] as any);
        } else {
          setActiveTab('sales');
        }
        
        triggerNotification(`¡Sesión de ${sellerObj.nombre} iniciada!`, 'success');
      } else {
        setLoginErrorMessage('Contraseña incorrecta para este vendedor.');
      }
    }
  };

  const handleLogout = () => {
    setIsAuthenticatedSession(false);
    setIsCreatorAuthenticated(false);
    localStorage.removeItem('distribuidor_session_auth');
    localStorage.removeItem('distribuidor_current_role');
    localStorage.removeItem('distribuidor_active_seller_id');
    localStorage.removeItem('distribuidor_creator_auth');
    setLoginPassword('');
    setLoginErrorMessage('');
    setActiveTab('dashboard');
  };

  // Automatically adjust activeTab if seller does not have access
  useEffect(() => {
    if (isAuthenticatedSession) {
      if (!isTabAllowed(activeTab)) {
        if (allowedTabsForUser.length > 0) {
          setActiveTab(allowedTabsForUser[0] as any);
        }
      }
    }
  }, [activeTab, allowedTabsForUser, isAuthenticatedSession]);

  // Set default login vendor if empty
  useEffect(() => {
    if (data.vendedores.length > 0 && !loginSellerId) {
      const firstActive = data.vendedores.find(v => v.activo);
      if (firstActive) {
        setLoginSellerId(firstActive.id);
      } else {
        setLoginSellerId(data.vendedores[0].id);
      }
    }
  }, [data.vendedores, loginSellerId]);

  // --- TOTAL CALCULATIONS FOR CART ---
  const activeClient = useMemo(() => {
    return data.clientes.find(c => c.id === selectedClientId) || null;
  }, [data.clientes, selectedClientId]);

  const activePriceList = useMemo(() => {
    if (!activeClient) return data.listasPrecio.find(l => l.id === 'base');
    return data.listasPrecio.find(l => l.id === activeClient.listaPrecioId) || data.listasPrecio.find(l => l.id === 'base');
  }, [data.listasPrecio, activeClient]);

  const cartCalculations = useMemo(() => {
    let subtotal = 0;
    let itemsCount = 0;
    const itemsList: any[] = [];
    const discountPct = activePriceList ? activePriceList.descuentoPorcentaje : 0;

    (Object.entries(cart) as [string, number][]).forEach(([prodId, qty]) => {
      if (qty <= 0) return;
      const product = data.productos.find(p => p.id === prodId);
      if (product) {
        const discountPrice = Math.round(product.precioBase * (1 - discountPct / 100));
        const totalItem = discountPrice * qty;
        subtotal += totalItem;
        itemsCount += qty;
        itemsList.push({
          id: product.id,
          productoId: product.id,
          nombre: product.nombre,
          cantidad: qty,
          precioBase: product.precioBase,
          precioConDescuento: discountPrice,
          totalItem
        });
      }
    });

    return {
      subtotal,
      total: subtotal,
      discountPct,
      itemsCount,
      itemsList
    };
  }, [cart, data.productos, activePriceList]);

  // --- SUBMISSIONS HANDLERS ---
  const handleSaveSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (sellerForm.id) {
        await updateSellerItem(sellerForm.id, sellerForm);
        triggerNotification('Vendedor actualizado en tiempo real');
      } else {
        await addSellerItem(sellerForm);
        triggerNotification('Vendedor agregado con éxito');
      }
      setShowSellerModal(false);
      setSellerForm({
        id: '',
        nombre: '',
        telefono: '',
        activo: true,
        password: '',
        permissions: ['dashboard', 'sales', 'settlements', 'catalog', 'clients', 'tasks', 'reports']
      });
    } catch (err: any) {
      triggerNotification(err.message || 'Error al guardar vendedor', 'error');
    }
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (clientForm.id) {
        await updateClientItem(clientForm.id, clientForm);
        triggerNotification('Cliente actualizado en tiempo real');
      } else {
        await addClientItem(clientForm);
        triggerNotification('Cliente agregado con éxito');
      }
      setShowClientModal(false);
      setClientForm({ id: '', nombre: '', telefono: '', direccion: '', listaPrecioId: 'base' });
    } catch (err: any) {
      triggerNotification(err.message || 'Error al guardar cliente', 'error');
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (productForm.id) {
        await updateProductItem(productForm.id, {
          nombre: productForm.nombre,
          codigo: productForm.codigo,
          precioBase: productForm.precioBase
        });
        triggerNotification('Producto actualizado con éxito');
      } else {
        await addProductItem({
          ...productForm,
          stockTotal: 100,
          stockPorVendedor: {}
        });
        triggerNotification('Producto nuevo registrado en catálogo');
      }
      setShowProductModal(false);
      setProductForm({ id: '', nombre: '', codigo: '', precioBase: 0 });
    } catch (err: any) {
      triggerNotification(err.message || 'Error al guardar producto', 'error');
    }
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addTaskItem({
        titulo: taskForm.titulo,
        descripcion: taskForm.descripcion,
        fechaLimite: taskForm.fechaLimite || new Date().toISOString().split('T')[0],
        asignadoA: taskForm.asignadoA,
        creadaPor: 'Administrador'
      });
      triggerNotification('Nueva tarea asignada e informada en tiempo real');
      setShowTaskModal(false);
      setTaskForm({ titulo: '', descripcion: '', fechaLimite: '', asignadoA: 'todos' });
    } catch (err: any) {
      triggerNotification(err.message || 'Error al asignar tarea', 'error');
    }
  };

  const handleStockTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = data.productos.find(p => p.id === stockTransfer.productId);
    if (!product) return;

    let currentSellsStock = product.stockPorVendedor[stockTransfer.sellerId] || 0;
    let newSellsStock = currentSellsStock;
    let newTotalGlobal = product.stockTotal;

    if (stockTransfer.type === 'add') {
      newSellsStock += stockTransfer.amount;
      newTotalGlobal += stockTransfer.amount;
    } else {
      newSellsStock = Math.max(0, newSellsStock - stockTransfer.amount);
      newTotalGlobal = Math.max(0, newTotalGlobal - stockTransfer.amount);
    }

    try {
      await updateProductItem(product.id, {
        stockPorVendedor: {
          ...product.stockPorVendedor,
          [stockTransfer.sellerId]: newSellsStock
        },
        stockTotal: newTotalGlobal
      });

      triggerNotification(`Stock del vendedor actualizado (+${stockTransfer.amount})`);
      setShowStockTransferModal(false);
    } catch (err: any) {
      triggerNotification(err.message || 'Error al transferir stock', 'error');
    }
  };

  const handleBulkPriceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await bulkPriceUpdateAction(bulkPriceForm.type, bulkPriceForm.value);
      triggerNotification('Actualización masiva de precios realizada con éxito');
      setShowBulkPriceModal(false);
    } catch (err: any) {
      triggerNotification(err.message || 'Error al actualizar precios', 'error');
    }
  };

  const handleCreateSaleSubmit = async () => {
    if (!selectedClientId) {
      triggerNotification('Por favor, selecciona un cliente para la venta.', 'error');
      return;
    }
    if (cartCalculations.itemsCount === 0) {
      triggerNotification('El carrito está vacío.', 'error');
      return;
    }

    // Double check stock for current seller before finalizing
    let stockProblemFound = false;
    let problemProductName = '';
    cartCalculations.itemsList.forEach(item => {
      const p = data.productos.find(prod => prod.id === item.productoId);
      const sellerStock = p ? (p.stockPorVendedor[activeSellerId] || 0) : 0;
      if (item.cantidad > sellerStock) {
        stockProblemFound = true;
        problemProductName = item.nombre;
      }
    });

    if (stockProblemFound) {
      triggerNotification(`Stock insuficiente para el producto: ${problemProductName}`, 'error');
      return;
    }

    try {
      const client = data.clientes.find(c => c.id === selectedClientId)!;
      const saleId = await createSaleTransaction({
        fecha: new Date().toISOString(),
        vendedorId: activeSellerId,
        vendedorNombre: activeSellerName,
        clienteId: client.id,
        clienteNombre: client.nombre,
        articulos: cartCalculations.itemsList,
        total: cartCalculations.total,
        dineroArreglado: false,
        observaciones: saleNotes || client.direccion
      });

      const updatedSales = localDb.getCollection<Sale>('ventas');
      const newlyCreated = updatedSales.find(s => s.id === saleId) || null;
      
      setLastCreatedSale(newlyCreated);
      setCart({});
      setSaleNotes('');
      setShowReceiptModal(true);
      triggerNotification('Venta registrada con éxito. Generando comprobante.');
    } catch (err: any) {
      triggerNotification(err.message || 'Error al procesar la venta', 'error');
    }
  };

  const handleSettleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleToSettle) return;
    try {
      await settleSaleMoney(selectedSaleToSettle.id, settleNotes, true);
      triggerNotification('Rendición de dinero grabada con éxito');
      setShowSettleModal(false);
      setSelectedSaleToSettle(null);
      setSettleNotes('');
    } catch (err: any) {
      triggerNotification(err.message || 'Error al rendir la venta', 'error');
    }
  };

  // --- PDF & WHATSAPP Redirections ---
  const triggerPdfDownload = (sale: Sale) => {
    const doc = generateSalePdf(
      sale, 
      companyConfig.nombre, 
      companyConfig.telefono, 
      companyConfig.direccion, 
      companyConfig.logo
    );
    doc.save(`Comprobante-${sale.numeroComprobante}.pdf`);
    triggerNotification('PDF descargado con éxito.');
  };

  const triggerWhatsAppRedirection = (sale: Sale) => {
    const client = data.clientes.find(c => c.id === sale.clienteId);
    const clientPhone = client ? client.telefono : '5491100000000';
    const adminPhone = companyConfig.telefono || '5491100000001';

    const { clientUrl, adminUrl } = getWhatsAppShareData(sale, clientPhone, adminPhone, companyConfig.nombre);
    
    // Automatically trigger PDF download so they can attach it manually on WhatsApp
    try {
      triggerPdfDownload(sale);
    } catch (e) {
      console.error(e);
    }

    // Open WhatsApp URL in a window popup/tab
    setTimeout(() => {
      window.open(clientUrl, '_blank');
      triggerNotification('Abriendo WhatsApp y descargando PDF comprobante');
    }, 600);
  };

  // Search filter for clients/products based on queries
  const filteredClients = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return data.clientes.filter(c => 
      c.nombre.toLowerCase().includes(query) || 
      c.telefono.includes(query) ||
      c.direccion.toLowerCase().includes(query)
    );
  }, [data.clientes, searchQuery]);

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return data.productos.filter(p => 
      p.nombre.toLowerCase().includes(query) || 
      p.codigo.includes(query)
    );
  }, [data.productos, searchQuery]);

  const filteredSales = useMemo(() => {
    if (currentRole === 'admin') {
      return data.ventas;
    } else {
      return data.ventas.filter(s => s.vendedorId === activeSellerId);
    }
  }, [data.ventas, currentRole, activeSellerId]);

  const reportFilteredSales = useMemo(() => {
    let list = data.ventas;
    if (currentRole === 'seller') {
      list = list.filter(s => s.vendedorId === activeSellerId);
    } else if (reportSellerFilter !== 'todos') {
      list = list.filter(s => s.vendedorId === reportSellerFilter);
    }

    if (reportClientFilter !== 'todos') {
      list = list.filter(s => s.clienteId === reportClientFilter);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const parseDateOnly = (isoString: string) => isoString.split('T')[0];

    return list.filter(s => {
      const saleDateStr = parseDateOnly(s.fecha);
      if (reportDateRangeFilter === 'today') {
        return saleDateStr === todayStr;
      } else if (reportDateRangeFilter === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const limitStr = d.toISOString().split('T')[0];
        return saleDateStr >= limitStr && saleDateStr <= todayStr;
      } else if (reportDateRangeFilter === 'month') {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        const limitStr = startOfMonth.toISOString().split('T')[0];
        return saleDateStr >= limitStr && saleDateStr <= todayStr;
      } else { // custom
        return saleDateStr >= reportStartDate && saleDateStr <= reportEndDate;
      }
    });
  }, [data.ventas, currentRole, activeSellerId, reportSellerFilter, reportClientFilter, reportDateRangeFilter, reportStartDate, reportEndDate]);

  const productRanking = useMemo(() => {
    const rankingMap: Record<string, { id: string; nombre: string; cantidad: number; total: number; precioPromedio: number }> = {};
    reportFilteredSales.forEach(s => {
      (s.articulos || []).forEach(item => {
        const prodId = item.productoId || item.id;
        if (!rankingMap[prodId]) {
          rankingMap[prodId] = {
            id: prodId,
            nombre: item.nombre,
            cantidad: 0,
            total: 0,
            precioPromedio: item.precioConDescuento || item.precioBase
          };
        }
        rankingMap[prodId].cantidad += item.cantidad;
        rankingMap[prodId].total += item.totalItem;
      });
    });
    return Object.values(rankingMap).sort((a, b) => b.cantidad - a.cantidad);
  }, [reportFilteredSales]);

  const sellerRanking = useMemo(() => {
    const rankingMap: Record<string, { id: string; nombre: string; total: number; totalOrders: number; settled: number; pending: number }> = {};
    reportFilteredSales.forEach(s => {
      const vId = s.vendedorId || 'desconocido';
      if (!rankingMap[vId]) {
        rankingMap[vId] = {
          id: vId,
          nombre: s.vendedorNombre || 'Sin Vendedor',
          total: 0,
          totalOrders: 0,
          settled: 0,
          pending: 0
        };
      }
      rankingMap[vId].total += s.total;
      rankingMap[vId].totalOrders += 1;
      if (s.dineroArreglado) {
        rankingMap[vId].settled += s.total;
      } else {
        rankingMap[vId].pending += s.total;
      }
    });
    return Object.values(rankingMap).sort((a, b) => b.total - a.total);
  }, [reportFilteredSales]);

  const exportReportToCSV = () => {
    if (reportFilteredSales.length === 0) {
      triggerNotification('No hay ventas en este rango para exportar', 'info');
      return;
    }
    try {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Fecha,Comprobante,Vendedor,Cliente,ProductoId,Producto,Cantidad,PrecioUnitario,TotalItem,Cobrado\n";
      
      reportFilteredSales.forEach(s => {
        const fecha = s.fecha.split('T')[0];
        const comprobante = s.numeroComprobante || 'N/A';
        const vendedor = s.vendedorNombre || 'N/A';
        const cliente = s.clienteNombre || 'N/A';
        const cobrado = s.dineroArreglado ? 'SI' : 'NO';
        
        (s.articulos || []).forEach(item => {
          const row = [
            fecha,
            comprobante,
            `"${vendedor.replace(/"/g, '""')}"`,
            `"${cliente.replace(/"/g, '""')}"`,
            item.productoId || item.id,
            `"${item.nombre.replace(/"/g, '""')}"`,
            item.cantidad,
            item.precioConDescuento || item.precioBase,
            item.totalItem,
            cobrado
          ].join(',');
          csvContent += row + "\n";
        });
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `informe_ventas_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      triggerNotification('Informe exportado como CSV con éxito');
    } catch (e: any) {
      triggerNotification('Error al exportar: ' + e.message, 'error');
    }
  };

  const filteredTasks = useMemo(() => {
    if (currentRole === 'admin') {
      return data.tareas;
    } else {
      return data.tareas.filter(t => t.asignadoA === 'todos' || t.asignadoA === activeSellerId);
    }
  }, [data.tareas, currentRole, activeSellerId]);


  return (
    <div className={`min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans transition-all duration-300 ${isMobileFrame ? 'p-0 md:p-6 lg:p-8 items-center justify-center' : 'p-0'}`}>
      
      {/* FRAME CONTROLLER BAR FOR PREVIEW TESTING */}
      <div className="hidden md:flex gap-4 mb-4 justify-between items-center w-full max-w-md bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-700">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-semibold">Visualizador del Distribuidor</span>
        </div>
        <div className="flex gap-2">
          <button 
            id="toggle-frame-btn"
            onClick={() => setIsMobileFrame(!isMobileFrame)} 
            className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-emerald-400 font-bold transition-all"
          >
            {isMobileFrame ? 'Pantalla Completa' : 'Simular Celular'}
          </button>
        </div>
      </div>

      {/* RENDER BODY: EITHER MOBIL FRAME BOX OR Standard Full Responsive Page */}
      <div 
        id="app-main-container"
        className={`bg-slate-950 font-sans shadow-2xl relative flex flex-col overflow-hidden transition-all duration-300
          ${isMobileFrame 
            ? 'w-full max-w-md h-[880px] rounded-3xl border-8 border-slate-800 shadow-slate-950/80' 
            : 'w-full min-h-screen'
          }`}
      >
        {/* CELLPHONE CAMERA TOP NOTCH */}
        {isMobileFrame && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-800 h-6 w-40 rounded-b-xl z-50 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-slate-900 mr-2"></div>
            <div className="w-12 h-1 bg-slate-900 rounded"></div>
          </div>
        )}

        {!isAppActive && !isCreatorAuthenticated ? (
          <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden text-center z-10 select-none my-auto">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"></div>

            <div className="w-16 h-16 bg-rose-500/15 border border-rose-500/30 rounded-2xl flex items-center justify-center text-rose-500 mb-6 mx-auto animate-pulse flex-shrink-0">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-extrabold text-white tracking-tight mb-2 uppercase">
              Servicio Suspendido
            </h2>
            <p className="text-rose-400 font-bold text-[10px] uppercase tracking-widest mb-6">
              Falta de abono de suscripción
            </p>

            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mb-8">
              El acceso a la plataforma "{companyConfig.nombre || 'Distribuidor PRO'}" ha sido temporalmente inhabilitado. Por favor, póngase en contacto con el soporte administrativo o regularice su suscripción para restablecer el servicio.
            </p>

            <div className="w-full space-y-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl text-left text-[11px] mb-8 max-w-xs mx-auto">
              <div className="flex justify-between items-center text-slate-400">
                <span>Administrador:</span>
                <span className="text-white font-bold">{companyConfig.nombre}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Soporte Técnico:</span>
                <span className="text-emerald-400 font-bold text-[10px]">ajnovasistemas@gmail.com</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>ID Terminal:</span>
                <span className="text-slate-300 font-semibold font-mono">#POS-8821</span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                const pass = prompt('SOPORTE CREADOR - Ingrese contraseña para reactivar y acceder:');
                const correctPass = data.config_empresa?.[0]?.creadorPassword || 'ajnova2026';
                if (pass === correctPass || pass === 'ajnova2026') {
                  setIsCreatorAuthenticated(true);
                  setIsAuthenticatedSession(true);
                  setCurrentRole('admin');
                  setActiveTab('config');
                  saveAppActiveStatus(true);
                  localStorage.setItem('distribuidor_creator_auth', 'true');
                  localStorage.setItem('distribuidor_session_auth', 'true');
                  localStorage.setItem('distribuidor_current_role', 'admin');
                  try {
                    await updateCompanyConfig({ appActiva: true });
                    triggerNotification("Sistema reactivado por el creador", "success");
                    alert('¡Sistema reactivado con éxito! Acceso concedido como Creador.');
                  } catch (err: any) {
                    alert('Reactivación local exitosa, pero falló actualizar la base de datos: ' + err.message);
                  }
                } else if (pass !== null) {
                  alert('Contraseña incorrecta.');
                }
              }}
              className="text-xs text-slate-500 hover:text-slate-300 font-bold transition duration-300 underline underline-offset-4 cursor-pointer"
            >
              Control de Creador de Aplicación
            </button>
          </div>
        ) : !isAuthenticatedSession ? (
          <div className="flex-1 bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-y-auto z-10 select-none my-auto">
            {/* Ambient glows */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"></div>

            <div className="w-full max-w-sm bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-5 shadow-2xl relative z-15">
              <div className="text-center space-y-1.5">
                {companyConfig.logo ? (
                  <img src={companyConfig.logo} alt="Company Logo" className="w-14 h-14 mx-auto rounded-xl object-contain mb-2 border border-slate-800 bg-slate-950/60" />
                ) : (
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg mx-auto shadow mb-2">
                    {companyConfig.nombre ? companyConfig.nombre.charAt(0).toUpperCase() : 'D'}
                  </div>
                )}
                <h2 className="text-base font-extrabold text-white tracking-tight uppercase">
                  {companyConfig.nombre || 'DISTRIBUIDORA MÓVIL'}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Acceso Seguro al Sistema
                </p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                {/* ROLE SELECTION TABS */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => { setLoginRole('admin'); setLoginErrorMessage(''); }}
                    className={`py-2 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1 ${
                      loginRole === 'admin' 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    👑 Admin
                  </button>
                  <button
                    type="button"
                    onClick={() => { 
                      setLoginRole('seller'); 
                      setLoginErrorMessage('');
                      if (!loginSellerId && data.vendedores.length > 0) {
                        setLoginSellerId(data.vendedores[0].id);
                      }
                    }}
                    className={`py-2 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1 ${
                      loginRole === 'seller' 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    💼 Vendedor
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginRole('creator'); setLoginErrorMessage(''); }}
                    className={`py-2 rounded-lg font-bold text-[10px] transition-all flex items-center justify-center gap-1 ${
                      loginRole === 'creator' 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🛠️ Creador
                  </button>
                </div>

                {/* VENDEDOR SELECT DROPDOWN */}
                {loginRole === 'seller' && (
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-semibold block uppercase">Seleccione su Nombre</label>
                    <select
                      value={loginSellerId}
                      onChange={(e) => { setLoginSellerId(e.target.value); setLoginErrorMessage(''); }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">-- Seleccionar Vendedor --</option>
                      {data.vendedores.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.nombre} ({v.activo ? 'Activo' : 'Inactivo'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* PASSWORD INPUT */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-semibold block uppercase">Contraseña de Acceso</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => { setLoginPassword(e.target.value); setLoginErrorMessage(''); }}
                    className="w-full bg-slate-950 border border-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-none rounded-xl px-3 py-3 text-slate-150 text-xs tracking-widest placeholder-slate-600"
                    required
                  />
                  {loginRole === 'seller' && (
                    <p className="text-[9px] text-slate-500 leading-normal mt-1">
                      Por defecto es <strong className="text-slate-400">123</strong>. Se puede modificar en ajustes por el Administrador.
                    </p>
                  )}
                  {loginRole === 'admin' && (
                    <p className="text-[9px] text-slate-500 leading-normal mt-1">
                      Por defecto es <strong className="text-slate-400">admin</strong> o <strong className="text-slate-400">ajnova2026</strong>. Modificable en pestaña Ajustes.
                    </p>
                  )}
                  {loginRole === 'creator' && (
                    <p className="text-[9px] text-slate-500 leading-normal mt-1">
                      Soporte de Desarrollo. Por defecto la clave es <strong className="text-slate-400">ajnova2026</strong>. Modificable en Panel Creador.
                    </p>
                  )}
                </div>

                {/* ERROR FEEDBACK */}
                {loginErrorMessage && (
                  <p className="text-rose-500 text-[11px] font-bold bg-rose-950/20 p-2 rounded-lg border border-rose-900/30 text-center">
                    ⚠️ {loginErrorMessage}
                  </p>
                )}

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs uppercase cursor-pointer tracking-wider"
                >
                  ✓ Conectar e Ingresar
                </button>
              </form>
            </div>
          </div>
        ) : (
          <>
            {/* FULL RESPONSIVE CONTAINER WITH SIDEBAR ON THE LEFT */}
            <div className={`flex-1 flex min-h-0 relative overflow-hidden w-full ${isMobileFrame ? 'flex-col' : 'flex-col md:flex-row'}`}>
              
              {/* TOP STATUS BAR INFO (Mobile Only) */}
              <div className={`${isMobileFrame ? 'flex' : 'md:hidden flex'} bg-slate-900 px-4 pt-1 pb-1 justify-between text-[11px] text-slate-400 select-none z-30 ${isMobileFrame ? 'mt-6' : ''}`}>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-300">9:41</span>
                  {isFirebaseEnabled ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Wifi className="w-3 h-3" /> Firestore Conectado
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-500 font-medium">
                      <WifiOff className="w-3 h-3" /> Datos Locales (Modo Prev)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded-full text-[9px] font-bold">
                    {currentRole === 'admin' ? '👑 Admin' : '💼 Vendedor'}
                  </span>
                  <span className="text-emerald-400">⚡ 100%</span>
                </div>
              </div>

              {/* HERO HEADER (Mobile Only) */}
              <header className={`${isMobileFrame ? 'flex' : 'md:hidden flex'} bg-slate-900 border-b border-slate-800 px-4 py-3 shrink-0 items-center justify-between shadow-md relative z-20`}>
                <div className="flex items-center gap-2.5">
                  {companyConfig.logo ? (
                    <img 
                      src={companyConfig.logo} 
                      alt="Logo Empresa" 
                      className="w-8 h-8 rounded-lg object-cover border border-slate-700 bg-slate-800"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-sm tracking-tight shadow">
                      {companyConfig.nombre ? companyConfig.nombre.charAt(0).toUpperCase() : 'D'}
                    </div>
                  )}
                  <div>
                    <h1 className="text-xs font-bold tracking-tight text-white leading-tight uppercase">
                      {companyConfig.nombre || 'Distribuidor PRO'}
                    </h1>
                    <p className="text-[9px] text-slate-400 mt-0.5 leading-none">
                      {currentRole === 'admin' ? 'Consola del Administrador' : `Vendedor: ${activeSellerName}`}
                    </p>
                  </div>
                </div>
                
                <button 
                  id="role-switch-btn"
                  onClick={() => setShowRoleSelectorModal(true)} 
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-all select-none"
                >
                  <Settings className="w-4 h-4 text-indigo-400" />
                  <span>Perfil</span>
                </button>
              </header>

              {/* MAIN BODY NAVIGATION TABS (Mobile Only) */}
              <nav className={`${isMobileFrame ? 'flex' : 'md:hidden flex'} bg-slate-900/60 border-b border-slate-800/80 shrink-0 overflow-x-auto scrollbar-none gap-1 p-1`}>
                {isTabAllowed('dashboard') && (
                  <button 
                    id="tab-dashboard"
                    onClick={() => { setActiveTab('dashboard'); setSearchQuery(''); }}
                    className={`px-3 py-2 rounded-lg text-[11px] font-bold text-center whitespace-nowrap transition-all ${activeTab === 'dashboard' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  >
                    Panel
                  </button>
                )}
                {isTabAllowed('sales') && (
                  <button 
                    id="tab-sales"
                    onClick={() => { setActiveTab('sales'); setSearchQuery(''); }}
                    className={`px-3 py-2 rounded-lg text-[11px] font-bold text-center whitespace-nowrap transition-all ${activeTab === 'sales' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  >
                    Preventa Movil
                  </button>
                )}
                {isTabAllowed('settlements') && (
                  <button 
                    id="tab-settlements"
                    onClick={() => { setActiveTab('settlements'); setSearchQuery(''); }}
                    className={`px-3 py-2 rounded-lg text-[11px] font-bold text-center whitespace-nowrap transition-all ${activeTab === 'settlements' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  >
                    Rendiciones
                  </button>
                )}
                {isTabAllowed('catalog') && (
                  <button 
                    id="tab-catalog"
                    onClick={() => { setActiveTab('catalog'); setSearchQuery(''); }}
                    className={`px-3 py-2 rounded-lg text-[11px] font-bold text-center whitespace-nowrap transition-all ${activeTab === 'catalog' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  >
                    Catálogo
                  </button>
                )}
                {isTabAllowed('clients') && (
                  <button 
                    id="tab-clients"
                    onClick={() => { setActiveTab('clients'); setSearchQuery(''); }}
                    className={`px-3 py-2 rounded-lg text-[11px] font-bold text-center whitespace-nowrap transition-all ${activeTab === 'clients' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  >
                    Clientes
                  </button>
                )}
                {isTabAllowed('tasks') && (
                  <button 
                    id="tab-tasks"
                    onClick={() => { setActiveTab('tasks'); setSearchQuery(''); }}
                    className={`px-3 py-2 rounded-lg text-[11px] font-bold text-center whitespace-nowrap transition-all ${activeTab === 'tasks' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  >
                    Tareas
                  </button>
                )}
                {isTabAllowed('reports') && (
                  <button 
                    id="tab-reports"
                    onClick={() => { setActiveTab('reports'); setSearchQuery(''); }}
                    className={`px-3 py-2 rounded-lg text-[11px] font-bold text-center whitespace-nowrap transition-all ${activeTab === 'reports' ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  >
                    Informes
                  </button>
                )}
                {isTabAllowed('config') && (
                  <button 
                    id="tab-config"
                    onClick={() => { setActiveTab('config'); setSearchQuery(''); }}
                    className={`px-3 py-2 rounded-lg text-[11px] font-bold text-center whitespace-nowrap transition-all ${activeTab === 'config' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                  >
                    Ajustes
                  </button>
                )}
              </nav>

              {/* DESKTOP SIDEBAR (Visible on md and up, unless simulating cellphone) */}
              <aside className={`${isMobileFrame ? 'hidden' : 'hidden md:flex'} md:w-64 bg-slate-900 border-r border-slate-800/85 flex-col shrink-0 p-5 select-none text-slate-100 justify-between h-full overflow-y-auto`}>
                <div className="space-y-6">
                  {/* Sidebar Header: Logo & Name */}
                  <div className="flex items-center gap-3">
                    {companyConfig.logo ? (
                      <img 
                        src={companyConfig.logo} 
                        alt="Logo Empresa" 
                        className="w-9 h-9 rounded-xl object-cover border border-slate-700 bg-slate-800"
                      />
                    ) : (
                      <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm tracking-tight shadow">
                        {companyConfig.nombre ? companyConfig.nombre.charAt(0).toUpperCase() : 'D'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h1 className="text-xs font-black tracking-tight text-white uppercase truncate">
                        {companyConfig.nombre || 'Distribuidor PRO'}
                      </h1>
                      <p className="text-[10px] text-emerald-400 font-bold mt-0.5 leading-none">
                        {currentRole === 'admin' ? '👑 Admin' : '💼 Vendedor'}
                      </p>
                    </div>
                  </div>

                  {/* Sidebar Profile Card */}
                  <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-850">
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider">Usuario Activo</p>
                    <p className="text-xs font-extrabold text-slate-200 mt-1 truncate">
                      {currentRole === 'admin' ? 'Administrador' : activeSellerName}
                    </p>
                    <button 
                      onClick={() => setShowRoleSelectorModal(true)} 
                      className="w-full mt-3 flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white py-2 px-2.5 rounded-xl text-[10px] font-bold border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">Cambiar Perfil / Rol</span>
                    </button>
                  </div>

                  {/* Sidebar Navigation */}
                  <div className="space-y-1">
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-wider mb-2 pl-1">Menú del Sistema</p>
                    
                    {isTabAllowed('dashboard') && (
                      <button 
                        onClick={() => { setActiveTab('dashboard'); setSearchQuery(''); }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'dashboard' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-250 hover:bg-slate-800/50'}`}
                      >
                        <Activity className={`w-4 h-4 shrink-0 ${activeTab === 'dashboard' ? 'text-slate-950' : 'text-emerald-400'}`} />
                        <span>Panel General</span>
                      </button>
                    )}

                    {isTabAllowed('sales') && (
                      <button 
                        onClick={() => { setActiveTab('sales'); setSearchQuery(''); }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'sales' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-250 hover:bg-slate-800/50'}`}
                      >
                        <Coins className={`w-4 h-4 shrink-0 ${activeTab === 'sales' ? 'text-slate-950' : 'text-emerald-400'}`} />
                        <span>Preventa Móvil</span>
                      </button>
                    )}

                    {isTabAllowed('settlements') && (
                      <button 
                        onClick={() => { setActiveTab('settlements'); setSearchQuery(''); }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'settlements' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-250 hover:bg-slate-800/50'}`}
                      >
                        <Briefcase className={`w-4 h-4 shrink-0 ${activeTab === 'settlements' ? 'text-slate-950' : 'text-emerald-400'}`} />
                        <span>Rendiciones</span>
                      </button>
                    )}

                    {isTabAllowed('catalog') && (
                      <button 
                        onClick={() => { setActiveTab('catalog'); setSearchQuery(''); }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'catalog' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-250 hover:bg-slate-800/50'}`}
                      >
                        <Tag className={`w-4 h-4 shrink-0 ${activeTab === 'catalog' ? 'text-slate-950' : 'text-emerald-400'}`} />
                        <span>Catálogo</span>
                      </button>
                    )}

                    {isTabAllowed('clients') && (
                      <button 
                        onClick={() => { setActiveTab('clients'); setSearchQuery(''); }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'clients' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-250 hover:bg-slate-800/50'}`}
                      >
                        <Users className={`w-4 h-4 shrink-0 ${activeTab === 'clients' ? 'text-slate-950' : 'text-emerald-400'}`} />
                        <span>Clientes</span>
                      </button>
                    )}

                    {isTabAllowed('tasks') && (
                      <button 
                        onClick={() => { setActiveTab('tasks'); setSearchQuery(''); }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'tasks' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-250 hover:bg-slate-800/50'}`}
                      >
                        <ClipboardList className={`w-4 h-4 shrink-0 ${activeTab === 'tasks' ? 'text-slate-950' : 'text-emerald-400'}`} />
                        <span>Tareas</span>
                      </button>
                    )}

                    {isTabAllowed('reports') && (
                      <button 
                        onClick={() => { setActiveTab('reports'); setSearchQuery(''); }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'reports' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/10' : 'text-slate-400 hover:text-slate-250 hover:bg-slate-800/50'}`}
                      >
                        <TrendingUp className={`w-4 h-4 shrink-0 ${activeTab === 'reports' ? 'text-slate-950' : 'text-emerald-400'}`} />
                        <span>Informes de Ventas</span>
                      </button>
                    )}

                    {isTabAllowed('config') && (
                      <button 
                        onClick={() => { setActiveTab('config'); setSearchQuery(''); }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'config' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`}
                      >
                        <Settings className={`w-4 h-4 shrink-0 ${activeTab === 'config' ? 'text-white' : 'text-indigo-400'}`} />
                        <span>Ajustes</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Sidebar Footer */}
                <div className="pt-4 border-t border-slate-800/80 space-y-3.5">
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    {isFirebaseEnabled ? (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-bold bg-emerald-950/40 px-2.5 py-1.5 rounded-xl w-full border border-emerald-900/30">
                        <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> Cloud Sync Activo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-yellow-500 font-medium bg-yellow-950/40 px-2.5 py-1.5 rounded-xl w-full border border-yellow-900/30">
                        <WifiOff className="w-3.5 h-3.5 text-yellow-500 shrink-0" /> Datos Locales (Modo Prev)
                      </span>
                    )}
                  </div>

                  {isCreatorAuthenticated && (
                    <button
                      type="button"
                      onClick={async () => {
                        const newStatus = !isAppActive;
                        try {
                          await updateCompanyConfig({ appActiva: newStatus });
                          triggerNotification(
                            newStatus ? "¡Sistema activado con éxito!" : "¡Sistema suspendido/bloqueado!",
                            newStatus ? "success" : "error"
                          );
                        } catch (err: any) {
                          triggerNotification("Error: " + err.message, "error");
                        }
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all duration-300 border flex items-center justify-center gap-1.5 cursor-pointer ${
                        isAppActive
                          ? "bg-rose-950/40 hover:bg-rose-900/60 border-rose-850 text-rose-400"
                          : "bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-850 text-emerald-400 animate-pulse"
                      }`}
                    >
                      {isAppActive ? "⚠️ SUSPENDER ACCESO" : "✅ ACTIVAR ACCESO"}
                    </button>
                  )}
                </div>
              </aside>

              {/* MAIN CONTENT AREA */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative w-full">
                
                {/* COMPONENT: CREATOR STICKY BANNER (Mobile Only since Desktop has it in the sidebar) */}
                {isCreatorAuthenticated && (
                  <div className={`${isMobileFrame ? 'flex' : 'md:hidden flex'} bg-indigo-950 border-b border-indigo-900/60 px-4 py-2 items-center justify-between text-[11px] font-bold text-white relative z-20 shadow-inner`}>
                    <div className="flex items-center gap-1.5 text-indigo-200 flex-wrap">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                      </span>
                      <span>SOPORTE CREADOR</span>
                      <span className="text-slate-500">|</span>
                      <span className="font-normal text-slate-300">Sistema:</span>
                      <span className={`font-black uppercase ${isAppActive ? "text-emerald-400" : "text-rose-400"}`}>
                        {isAppActive ? "🟢 ACTIVO" : "🔴 SUSPENDIDO"}
                      </span>
                    </div>
                    <button
                      id="creator-banner-toggle"
                      type="button"
                      onClick={async () => {
                        const newStatus = !isAppActive;
                        try {
                          await updateCompanyConfig({ appActiva: newStatus });
                          triggerNotification(
                            newStatus ? "¡Sistema activado con éxito!" : "¡Sistema suspendido/bloqueado!",
                            newStatus ? "success" : "error"
                          );
                        } catch (err: any) {
                          triggerNotification("Error: " + err.message, "error");
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 cursor-pointer border ${
                        isAppActive
                          ? "bg-rose-950/40 hover:bg-rose-900/60 border-rose-800 text-rose-400"
                          : "bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-800 text-emerald-400 animate-pulse"
                      }`}
                    >
                      {isAppActive ? "⚠️ DESACTIVAR ACCESO" : "✅ ACTIVAR ACCESO"}
                    </button>
                  </div>
                )}

                {/* FEEDBACK FLOATER NOTIFICATIONS */}
                {notification && (
                  <div className="absolute top-4 left-4 right-4 z-40 animate-bounce duration-500">
                    <div className={`p-3 rounded-xl shadow-xl border flex items-center justify-between text-xs font-semibold ${
                      notification.type === 'success' ? 'bg-emerald-950 border-emerald-800 text-emerald-200' :
                      notification.type === 'error' ? 'bg-rose-950 border-rose-800 text-rose-200' :
                      'bg-blue-950 border-blue-800 text-blue-200'
                    }`}>
                      <span className="flex items-center gap-2">
                        {notification.type === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        {notification.text}
                      </span>
                      <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* CONTAINER VIEWPORT */}
                <main className="flex-1 overflow-y-auto p-4 content-viewport bg-slate-950/40">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
              <p className="text-slate-400 text-sm">Sincronizando base de datos...</p>
            </div>
          ) : !isAppActive && !isCreatorAuthenticated ? (
            <div className="flex flex-col items-center justify-center h-full py-12 px-4 text-center">
              <div className="bg-slate-900 border border-red-900/40 rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
                <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto animate-pulse" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Aplicación Suspendida</h3>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Esta plataforma ha sido suspendida por falta de pago o vencimiento de la suscripción. Comuníquese con el administrador para regularizar el abono y restablecer el abono mensual.
                </p>

                <div className="border-t border-slate-800 pt-4 mt-2 space-y-3">
                  <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Verificación del Creador</p>
                  <div className="space-y-2">
                    <input 
                      type="password" 
                      placeholder="Contraseña del Creador"
                      value={creatorPasswordInput}
                      onChange={(e) => {
                        setCreatorPasswordInput(e.target.value);
                        setShowCreatorAuthError(false);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-center text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                    {showCreatorAuthError && (
                      <p className="text-rose-500 text-[10px] font-semibold">✓ Contraseña inválida.</p>
                    )}
                    <button 
                      type="button" 
                      onClick={() => {
                        const correctPass = data.config_empresa?.[0]?.creadorPassword || 'ajnova2026';
                        if (creatorPasswordInput === correctPass || creatorPasswordInput === 'ajnova2026') {
                          setIsCreatorAuthenticated(true);
                          setShowCreatorAuthError(false);
                          setCreatorPasswordInput('');
                          setActiveTab('config');
                          triggerNotification('Portal Creador Autorizado. Acceso temporal concedido.', 'success');
                        } else {
                          setShowCreatorAuthError(true);
                        }
                      }}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs"
                    >
                      Desbloquear como Creador
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ========================================================= */}
              {/* TAB 1: DASHBOARD (PANEL GENERAL / RESUMEN)                */}
              {/* ========================================================= */}
              {activeTab === 'dashboard' && (
                <div className="space-y-4">
                  
                  {/* HERO STATS OVERVIEW */}
                  <div className="bg-gradient-to-br from-emerald-950 to-green-900 border border-emerald-800/60 p-4 rounded-2xl relative overflow-hidden shadow-md">
                    <div className="absolute top-0 right-0 p-3 opacity-10">
                      <TrendingUp className="w-24 h-24 text-white" />
                    </div>
                    <p className="text-[10px] text-emerald-300 font-bold tracking-widest uppercase">FACTURADO TOTAL</p>
                    <h3 className="text-3xl font-extrabold text-white mt-1">
                      ${filteredSales.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()} <span className="text-xs text-emerald-400">ARS</span>
                    </h3>
                    <div className="flex gap-4 mt-4 bg-emerald-900/40 p-2 rounded-lg">
                      <div>
                        <p className="text-[9px] text-emerald-300 uppercase">Boletas</p>
                        <p className="text-sm font-bold text-white">{filteredSales.length}</p>
                      </div>
                      <div className="border-r border-emerald-800"></div>
                      <div>
                        <p className="text-[9px] text-emerald-300 uppercase">Sin Liquidar</p>
                        <p className="text-sm font-bold text-rose-300">
                          ${filteredSales.filter(s => !s.dineroArreglado).reduce((acc, k) => acc + k.total, 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="border-r border-emerald-800"></div>
                      <div>
                        <p className="text-[9px] text-emerald-300 uppercase">Porcentaje Rendido</p>
                        <p className="text-sm font-bold text-emerald-200">
                          {filteredSales.length > 0 
                            ? Math.round((filteredSales.filter(v => v.dineroArreglado).length / filteredSales.length) * 100) 
                            : 0}%
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* QUICK ROLE SELECTOR CALLOUT PREVIEW */}
                  <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-emerald-500/10 p-2 rounded-lg">
                        <Users className="text-emerald-400 w-4.5 h-4.5" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-100">Vista de Simulación</p>
                        <p className="text-slate-400 text-[10px]">Utiliza el selector de rol arriba para alternar</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-md font-bold block mb-1">
                        {currentRole === 'admin' ? 'Administrador' : 'Vendedor'}
                      </span>
                      {currentRole === 'seller' && (
                        <p className="text-[10px] text-emerald-400 font-medium">{activeSellerName}</p>
                      )}
                    </div>
                  </div>

                  {/* TASKS SUMMARIZED CALLOUT */}
                  <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4 text-emerald-400" /> Tareas Activas
                      </h4>
                      <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {filteredTasks.filter(t => !t.completada).length} pendientes
                      </span>
                    </div>

                    <div className="space-y-2">
                      {filteredTasks.filter(t => !t.completada).slice(0, 2).map((task) => (
                        <div key={task.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-slate-200">{task.titulo}</p>
                            <p className="text-slate-400 text-[10px] mt-0.5">Vence: {task.fechaLimite} • {task.asignadoA === 'todos' ? 'Ver todos' : 'Para ti'}</p>
                          </div>
                          <button 
                            onClick={async () => {
                              await toggleTaskCompletion(task.id, activeSellerName);
                              triggerNotification('Tarea completada con éxito');
                            }}
                            className="bg-slate-900 hover:bg-emerald-950 text-slate-400 hover:text-emerald-400 p-1.5 rounded transition-all"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {filteredTasks.filter(t => !t.completada).length === 0 && (
                        <p className="text-slate-500 text-center text-[11px] py-1">No hay tareas pendientes en este momento.</p>
                      )}
                    </div>
                  </div>

                  {/* PRODUCTS STOCK CRITICAL LIST SECTION */}
                  <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-emerald-400" /> Mi Stock y Alertas
                    </h4>
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {data.productos.map((prod) => {
                        const sellerStock = prod.stockPorVendedor[activeSellerId] || 0;
                        const isStockLow = sellerStock < 10;
                        return (
                          <div key={prod.id} className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-xs flex justify-between items-center">
                            <div>
                              <p className="font-semibold text-slate-200">{prod.nombre}</p>
                              <p className="text-[10px] text-slate-400">Código SKU: {prod.codigo}</p>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isStockLow ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-emerald-400'}`}>
                                {sellerStock} unidades
                              </span>
                              {isStockLow && <p className="text-[8px] text-rose-400 mt-0.5">¡Reponer Stock!</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: PREVENTA MOVIL (NEW VENTAS CREATION)               */}
              {/* ========================================================= */}
              {activeTab === 'sales' && (
                <div className="space-y-4">
                  
                  {/* SELECT CUSTOMER */}
                  <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-3 shadow-md">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4.5 h-4.5 text-emerald-400" /> 1. Datos del Cliente
                    </h3>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] text-slate-400 block font-semibold">Seleccionar Cliente de la Ruta</label>
                      <select 
                        id="sales-client-select"
                        value={selectedClientId} 
                        onChange={(e) => {
                          setSelectedClientId(e.target.value);
                          setCart({}); // clear cart on customer change to update applied prices lists
                        }}
                        className="w-full bg-slate-950 border border-slate-800 p-2.5 text-xs text-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="">-- Seleccionar un Cliente --</option>
                        {data.clientes.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre} (Tel: {c.telefono})</option>
                        ))}
                      </select>
                    </div>

                    {activeClient && (
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400 uppercase text-[9px] font-bold">Lista de Precio:</span>
                          <span className="text-emerald-400 font-bold bg-emerald-950/40 px-1.5 rounded">{activePriceList?.nombre}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 uppercase text-[9px] font-bold">Descuento Aplicado:</span>
                          <span className="text-emerald-300 font-bold">{activePriceList?.descuentoPorcentaje}% de DESCUENTO</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 uppercase text-[9px] font-bold">Dirección de Envío:</span>
                          <span className="text-slate-200">{activeClient.direccion}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* SELECT PRODUCTS TO CART */}
                  <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl space-y-3 shadow-md">
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                      <ShoppingBag className="w-4.5 h-4.5 text-emerald-400" /> 2. Productos y Carrito
                    </h3>

                    {/* SEARCH CODES */}
                    <div className="relative">
                      <input 
                        id="sales-search-input"
                        type="text" 
                        placeholder="Buscar por código / nombre..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 pl-8 pr-4 py-2 text-xs text-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {filteredProducts.map((prod) => {
                        const sellerStock = prod.stockPorVendedor[activeSellerId] || 0;
                        const cartQty = cart[prod.id] || 0;
                        const specDiscountPct = activePriceList ? activePriceList.descuentoPorcentaje : 0;
                        const finalPrice = Math.round(prod.precioBase * (1 - specDiscountPct / 100));

                        return (
                          <div key={prod.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex justify-between items-center transition-all hover:bg-slate-900/60">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-slate-100">{prod.nombre}</p>
                              <p className="text-[10px] text-slate-400">SKU: {prod.codigo}</p>
                              <div className="flex gap-2 items-center mt-1">
                                <span className="text-slate-400 line-through text-[10px]">${prod.precioBase.toLocaleString()}</span>
                                <span className="font-bold text-emerald-400">${finalPrice.toLocaleString()} ARS</span>
                                <span className="bg-slate-800 text-[9px] text-slate-300 font-bold px-1 rounded">Mi stock: {sellerStock}</span>
                              </div>
                            </div>

                            {/* QUANTITY CHANGER */}
                            <div className="flex items-center gap-1.5">
                              <button 
                                onClick={() => {
                                  if (cartQty > 0) {
                                    setCart({ ...cart, [prod.id]: cartQty - 1 });
                                  }
                                }}
                                className="bg-slate-800 hover:bg-slate-700 text-white w-7 h-7 rounded-lg font-bold flex items-center justify-center transition-all"
                              >
                                -
                              </button>
                              <span className="w-6 text-center text-xs font-bold text-slate-100">{cartQty}</span>
                              <button 
                                onClick={() => {
                                  if (cartQty < sellerStock) {
                                    setCart({ ...cart, [prod.id]: cartQty + 1 });
                                  } else {
                                    triggerNotification(`Stock superado. Tu límite es ${sellerStock} unidades.`, 'error');
                                  }
                                }}
                                className="bg-slate-800 hover:bg-emerald-600 active:scale-95 text-white w-7 h-7 rounded-lg font-bold flex items-center justify-center transition-all"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <p className="text-slate-500 text-center py-4">No se encontraron productos.</p>
                      )}
                    </div>
                  </div>

                  {/* CART BILL OVERVIEW */}
                  {cartCalculations.itemsCount > 0 && (
                    <div className="bg-slate-900 border border-slate-850 p-4 rounded-2xl mt-4 space-y-3.5 shadow-lg">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                        <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">Resumen del Pedido</span>
                        <span className="bg-emerald-500 text-slate-950 text-[10px] px-2.5 py-0.5 rounded-full font-bold">
                          {cartCalculations.itemsCount} productos
                        </span>
                      </div>

                      <div className="space-y-2 max-h-36 overflow-y-auto text-xs">
                        {cartCalculations.itemsList.map(item => (
                          <div key={item.id} className="flex justify-between">
                            <span className="text-slate-300 font-medium">{item.cantidad}x {item.nombre}</span>
                            <span className="text-slate-100 font-bold">${item.totalItem.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>

                      <div className="bg-slate-950 p-3 rounded-lg border border-slate-800/60 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Total con descuento ({cartCalculations.discountPct}%):</span>
                          <span className="text-xl font-extrabold text-emerald-400">${cartCalculations.total.toLocaleString()} ARS</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1 font-semibold">Observaciones adicionales para el remito</label>
                        <textarea 
                          id="sales-notes-input"
                          rows={2}
                          value={saleNotes}
                          onChange={(e) => setSaleNotes(e.target.value)}
                          placeholder="Horarios de entrega, pagos de deudas, etc..."
                          className="w-full bg-slate-950 border border-slate-800 p-2 text-xs text-slate-300 rounded-lg focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <button 
                        id="submit-sale-btn"
                        onClick={handleCreateSaleSubmit}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-md text-xs uppercase"
                      >
                        Confirmar y Finalizar Venta
                      </button>
                    </div>
                  )}

                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: VENTAS Y ARREGLOS DE DINERO (REMEDICIONES LEDGER)  */}
              {/* ========================================================= */}
              {activeTab === 'settlements' && (
                <div className="space-y-4">
                  
                  {/* TITLE DETAIL */}
                  <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-1.5 shadow">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Coins className="w-5 h-5 text-emerald-400" /> Rendición y Liquidación
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Rendición rápida de cobros de mercancía por vendedor. Registra ingresos sin afectar cuentas bancarias externas o cajas físicas complejas.
                    </p>
                  </div>

                  {/* SALES SEARCH LOGS */}
                  <div className="relative">
                    <input 
                      id="sales-history-search"
                      type="text" 
                      placeholder="Buscar por cliente / boleta..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 pl-8 pr-4 py-2 text-xs text-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* OUTSTANDING TRANSACTION LISTING */}
                  <div className="space-y-3">
                    {filteredSales
                      .filter(s => 
                        s.clienteNombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        s.numeroComprobante.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map((sale) => (
                        <div key={sale.id} className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="bg-slate-800 text-slate-300 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                {sale.numeroComprobante}
                              </span>
                              <h4 className="text-sm font-bold text-slate-100 mt-1">{sale.clienteNombre}</h4>
                              <p className="text-[9px] text-slate-400">Vendedor: {sale.vendedorNombre} • {new Date(sale.fecha).toLocaleString()}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-emerald-400 font-extrabold text-sm">${sale.total.toLocaleString()} ARS</p>
                              {sale.dineroArreglado ? (
                                <span className="inline-flex items-center gap-1 text-[8px] uppercase tracking-wider bg-emerald-950 font-bold border border-emerald-800 text-emerald-400 px-2 py-0.5 rounded-full mt-1.5">
                                  <Check className="w-2.5 h-2.5" /> Liquidado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[8px] uppercase tracking-wider bg-rose-950 font-bold border border-rose-800 text-rose-400 px-2 py-0.5 rounded-full mt-1.5">
                                  ⚠️ Pendiente
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1.5 bg-slate-950 p-2.5 rounded-lg border border-slate-800/80 text-[11px]">
                            {sale.articulos.map((art, idx) => (
                              <div key={idx} className="flex justify-between text-slate-300">
                                <span>{art.cantidad}x {art.nombre}</span>
                                <span>${art.totalItem.toLocaleString()}</span>
                              </div>
                            ))}
                            {sale.observaciones && (
                              <div className="border-t border-slate-850 pt-1.5 mt-1.5 text-slate-400 italic text-[10px]">
                                Observación: {sale.observaciones}
                              </div>
                            )}
                            {sale.fechaArreglo && (
                              <div className="text-[9px] text-slate-400 mt-1">
                                Liquidado el: {new Date(sale.fechaArreglo).toLocaleString()}
                              </div>
                            )}
                          </div>

                          {/* ACTION BUTTONS (DOWNLOAD PDF, WHATSAPP, SETTLE MONEY) */}
                          <div className="flex gap-2">
                            <button 
                              onClick={() => triggerWhatsAppRedirection(sale)}
                              className="flex-1 bg-slate-800 hover:bg-slate-750 text-emerald-400 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 border border-slate-700 hover:border-slate-600 transition-all"
                            >
                              <Share2 className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp / PDF
                            </button>

                            {!sale.dineroArreglado ? (
                              <button 
                                onClick={() => {
                                  setSelectedSaleToSettle(sale);
                                  setSettleNotes(sale.observaciones || '');
                                  setShowSettleModal(true);
                                }}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all"
                              >
                                <Coins className="w-3.5 h-3.5" /> Liquidar Dinero
                              </button>
                            ) : (
                              currentRole === 'admin' && (
                                <button 
                                  onClick={async () => {
                                    if (confirm('¿Quieres volver a poner como pendiente de cobro esta boleta?')) {
                                      await settleSaleMoney(sale.id, '', false);
                                      triggerNotification('Venta marcada como pendiente de rendición');
                                    }
                                  }}
                                  className="flex-1 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 font-bold text-[10px] py-2 px-3 rounded-lg"
                                >
                                  Revertir Rendición
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      ))}
                    {filteredSales.length === 0 && (
                      <p className="text-slate-500 text-center py-6">No se encontraron ventas para este vendedor o sesión.</p>
                    )}
                  </div>

                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 4: CATALOG DATA & PRICES                              */}
              {/* ========================================================= */}
              {activeTab === 'catalog' && (
                <div className="space-y-4">
                  
                  {/* ADMIN ONLY CONTROLS */}
                  {currentRole === 'admin' && (
                    <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3">
                      <h4 className="text-xs font-bold text-slate-300 uppercase flex items-center gap-1.5">
                        <Settings className="w-4 h-4 text-emerald-400" /> Acciones del Administrador
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          id="bulk-update-prices-btn"
                          onClick={() => {
                            setBulkPriceForm({ type: 'percentage', value: 10 });
                            setShowBulkPriceModal(true);
                          }}
                          className="bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                        >
                          <TrendingUp className="w-4 h-4" /> Act. Masiva de Precios
                        </button>

                        <button 
                          id="add-new-product-btn"
                          onClick={() => {
                            setProductForm({ id: '', nombre: '', codigo: '', precioBase: 1000 });
                            setShowProductModal(true);
                          }}
                          className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Plus className="w-4 h-4" /> Agregar Producto
                        </button>
                      </div>
                    </div>
                  )}

                  {/* PRICE LISTS PANEL DESCRIPTIONS */}
                  <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-emerald-400" /> Listas de Precios Activas
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {data.listasPrecio.map((list) => (
                        <div key={list.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
                          <p className="font-bold text-slate-200 text-xs">{list.nombre}</p>
                          <p className="text-[10px] text-emerald-400 font-medium">{list.descuentoPorcentaje}% Descuento base</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PRODUCTS LISTS OVERVIEW */}
                  <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Lista de Artículos</h4>
                      <span className="bg-slate-800 text-[10px] text-slate-300 font-bold px-2 py-0.5 rounded">
                        {data.productos.length} Productos
                      </span>
                    </div>

                    <div className="relative">
                      <input 
                        id="catalog-search-input"
                        type="text" 
                        placeholder="Buscar por descripción..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 pl-8 pr-4 py-2 text-xs text-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>

                    {/* PRODUCT ITEM IN CATALOG VIEW WITH STOCK DISTRIBUTIONS */}
                    <div className="space-y-3">
                      {filteredProducts.map((prod) => (
                        <div key={prod.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="space-y-0.5">
                              <h5 className="font-bold text-slate-200 text-xs">{prod.nombre}</h5>
                              <p className="text-[10px] text-slate-400 leading-normal">SKU: {prod.codigo} • Precio Base: <span className="text-slate-100 font-extrabold">${prod.precioBase.toLocaleString()} ARS</span></p>
                            </div>

                            {currentRole === 'admin' && (
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => {
                                    setProductForm({ id: prod.id, nombre: prod.nombre, codigo: prod.codigo, precioBase: prod.precioBase });
                                    setShowProductModal(true);
                                  }}
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-1.5 rounded-lg"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (confirm('¿Seguro quieres eliminar este producto?')) {
                                      await deleteProductItem(prod.id);
                                      triggerNotification('Producto eliminado');
                                    }
                                  }}
                                  className="bg-slate-800 hover:bg-rose-950 text-rose-300 p-1.5 rounded-lg"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>

                          {/* DETALLE STOCK SPREAD POR VENDEDOR */}
                          <div className="bg-slate-900/60 p-3 rounded-lg space-y-2 border border-slate-800 text-[11px]">
                            <p className="text-slate-400 font-bold uppercase text-[9px] flex items-center justify-between">
                              <span>Sincronización de Stock por Vendedor</span>
                              <span className="text-emerald-400 font-bold bg-emerald-950/40 px-1 py-0.2 rounded-full">Consolidado: {prod.stockTotal} un.</span>
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              {data.vendedores.map(v => {
                                const currentStock = prod.stockPorVendedor[v.id] || 0;
                                return (
                                  <div key={v.id} className="flex justify-between bg-slate-950/80 p-1.5 rounded">
                                    <span className="text-slate-300 font-medium truncate max-w-[90px]">{v.nombre}</span>
                                    <span className="font-extrabold text-slate-100">{currentStock} u.</span>
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* TRANSFER STOCK ACTION BUTTON */}
                            {currentRole === 'admin' && (
                              <button 
                                onClick={() => {
                                  setStockTransfer({
                                    productId: prod.id,
                                    sellerId: data.vendedores[0]?.id || '',
                                    amount: 10,
                                    type: 'add'
                                  });
                                  setShowStockTransferModal(true);
                                }}
                                className="w-full mt-2 bg-slate-800 hover:bg-slate-750 text-emerald-400 text-[10px] font-bold py-1 px-2 rounded-lg flex items-center justify-center gap-1 transition-all"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" /> Ajustar Stock de Vendedor
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 5: CLIENTES Y VENDEDORES                              */}
              {/* ========================================================= */}
              {activeTab === 'clients' && (
                <div className="space-y-4">
                  
                  {/* ADMIN SECTION: ADD SELLERS */}
                  {currentRole === 'admin' && (
                    <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3.5">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-emerald-400" /> Vendedores (Plantilla)
                        </h4>
                        <button 
                          id="add-new-seller-btn"
                          onClick={() => {
                            setSellerForm({ 
                              id: '', 
                              nombre: '', 
                              telefono: '', 
                              activo: true,
                              password: '123',
                              permissions: ['dashboard', 'sales', 'settlements', 'catalog', 'clients', 'tasks', 'reports']
                            });
                            setShowSellerModal(true);
                          }}
                          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-bold px-2 py-1 rounded-md"
                        >
                          + Agregar Vendedor
                        </button>
                      </div>

                      <div className="space-y-2">
                        {data.vendedores.map(v => (
                          <div key={v.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
                            <div>
                              <p className="font-bold text-slate-200">{v.nombre}</p>
                              <p className="text-slate-400 text-[10px]">Tel: {v.telefono}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] px-1.5 rounded font-bold ${v.activo ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                                {v.activo ? 'Activo' : 'Cerrado'}
                              </span>
                              <button 
                                onClick={() => {
                                  setSellerForm({ 
                                    id: v.id, 
                                    nombre: v.nombre, 
                                    telefono: v.telefono, 
                                    activo: v.activo,
                                    password: v.password || '123',
                                    permissions: v.permissions || ['dashboard', 'sales', 'settlements', 'catalog', 'clients', 'tasks', 'reports']
                                  });
                                  setShowSellerModal(true);
                                }}
                                className="bg-slate-900 text-slate-300 p-1 rounded hover:bg-slate-850"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ACTIVE CUSTOMERS SHEET */}
                  <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-3.5">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Ruta de Clientes</h4>
                      <button 
                        id="add-new-client-btn"
                        onClick={() => {
                          setClientForm({ id: '', nombre: '', telefono: '', direccion: '', listaPrecioId: 'base' });
                          setShowClientModal(true);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-[10px] font-bold px-2.5 py-1 rounded-md"
                      >
                        + Agregar Cliente
                      </button>
                    </div>

                    <div className="relative">
                      <input 
                        id="clients-search-input"
                        type="text" 
                        placeholder="Buscar por nombre..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 pl-8 pr-4 py-2 text-xs text-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none"
                      />
                      <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                    </div>

                    <div className="space-y-3">
                      {filteredClients.map((client) => {
                        const listsName = data.listasPrecio.find(l => l.id === client.listaPrecioId)?.nombre || 'Base';
                        return (
                          <div key={client.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                            <div className="flex justify-between items-start">
                              <div className="space-y-0.5">
                                <h5 className="font-bold text-slate-100 text-xs">{client.nombre}</h5>
                                <div className="flex items-center gap-1 text-[10px] text-slate-300">
                                  <Phone className="w-3 h-3 text-emerald-400" /> WhatsApp: {client.telefono}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                  <MapPin className="w-3 h-3 text-emerald-400" /> Dirección: {client.direccion}
                                </div>
                              </div>

                              <div className="flex gap-1.5">
                                <button 
                                  onClick={() => {
                                    setClientForm({ id: client.id, nombre: client.nombre, telefono: client.telefono, direccion: client.direccion, listaPrecioId: client.listaPrecioId });
                                    setShowClientModal(true);
                                  }}
                                  className="bg-slate-900 border border-slate-800 text-slate-300 p-1.5 rounded hover:bg-slate-800"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={async () => {
                                    if (confirm('¿Seguro quieres eliminar este cliente?')) {
                                      await deleteClientItem(client.id);
                                      triggerNotification('Cliente dado de baja');
                                    }
                                  }}
                                  className="bg-slate-900 border border-slate-800 text-rose-400 p-1.5 rounded hover:bg-rose-950/40"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="bg-slate-900/60 p-2 rounded border border-slate-850 flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 uppercase font-semibold">Descuento Tarifario:</span>
                              <span className="text-emerald-400 font-bold bg-emerald-950/40 px-2 py-0.5 rounded-md">{listsName}</span>
                            </div>
                          </div>
                        );
                      })}
                      {filteredClients.length === 0 && (
                        <p className="text-slate-500 text-center py-6">No hay clientes con ese nombre.</p>
                      )}
                    </div>
                  </div>

                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 6: TASKS & REMINDERS (TAREAS Y RECORDATORIOS)        */}
              {/* ========================================================= */}
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  
                  {/* DIRECT ASSIGN BUTTON */}
                  {currentRole === 'admin' && (
                    <button 
                      id="create-new-task-btn"
                      onClick={() => {
                        setTaskForm({ titulo: '', descripcion: '', fechaLimite: '', asignadoA: 'todos' });
                        setShowTaskModal(true);
                      }}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 shadow-md text-xs uppercase"
                    >
                      <Plus className="w-4 h-4" /> Asignar Tarea / Recordatorio
                    </button>
                  )}

                  {/* ACTIVE TASKS WRAPPERS */}
                  <div className="space-y-4">
                    
                    {/* PENDING TASKS SECTION */}
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Tareas Pendientes</p>
                      {filteredTasks.filter(t => !t.completada).map((task) => (
                        <div key={task.id} className="bg-slate-900 border-l-4 border-emerald-500 p-4 rounded-r-xl space-y-2.5">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-bold text-slate-100 text-xs">{task.titulo}</h5>
                              <p className="text-[10px] text-slate-400">Creada por: {task.creadaPor} • Vence: {task.fechaLimite}</p>
                            </div>
                            <button 
                              onClick={async () => {
                                await toggleTaskCompletion(task.id, activeSellerName);
                                triggerNotification('Tarea marcada como completada');
                              }}
                              className="bg-slate-950 hover:bg-emerald-950 text-slate-400 hover:text-emerald-400 p-2 rounded-xl transition-all"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <p className="text-[11px] text-slate-300 leading-normal bg-slate-950 p-2 rounded border border-slate-850">{task.descripcion}</p>
                          
                          <div className="flex justify-between items-center text-[9px] text-slate-400">
                            <span>Destino: <strong className="text-emerald-400 uppercase bg-slate-950 px-1.5 py-0.2 rounded">{task.asignadoA === 'todos' ? 'Todos los vendedores' : 'Vendedor específico'}</strong></span>
                            {currentRole === 'admin' && (
                              <button 
                                onClick={async () => {
                                  await deleteTaskItem(task.id);
                                  triggerNotification('Tarea eliminada');
                                }}
                                className="text-rose-400 hover:text-rose-300"
                              >
                                Cancelar Tarea
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {filteredTasks.filter(t => !t.completada).length === 0 && (
                        <div className="bg-slate-950 border border-slate-900 p-4 rounded-xl text-center">
                          <p className="text-slate-500 text-xs">Sin tareas pendientes en tu ruta.</p>
                        </div>
                      )}
                    </div>

                    {/* COMPLETED TASKS ARCHIVE */}
                    <div className="space-y-2 text-xs">
                      <p className="text-[10px] font-bold text-slate-450 tracking-wider uppercase">Historial de Tareas Completadas</p>
                      {filteredTasks.filter(t => t.completada).map((task) => (
                        <div key={task.id} className="bg-slate-900/60 p-3 rounded-xl border border-slate-850 flex justify-between items-center opacity-70">
                          <div>
                            <p className="line-through text-slate-400 font-semibold">{task.titulo}</p>
                            <p className="text-[9px] text-slate-500 mt-1">
                              Completada por: {task.completadaPor || 'Sistema'}
                            </p>
                          </div>
                          <button 
                            onClick={async () => {
                              await toggleTaskCompletion(task.id);
                              triggerNotification('Tarea re-activada');
                            }}
                            className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded"
                          >
                            Reabrir
                          </button>
                        </div>
                      ))}
                    </div>

                  </div>

                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 7: CONFIGURATION & CREATOR CONTROLS (AJUSTES)         */}
              {/* ========================================================= */}
              {activeTab === 'config' && (
                <div className="space-y-6">
                  
                  {/* SECCION DE DATOS DE LA EMPRESA */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Settings className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-bold text-sm text-white">Datos de la Empresa</h3>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Configure la información de la distribuidora. Estos datos se imprimirán de forma automática en los comprobantes PDF que se envían a los clientes y de forma integrada en WhatsApp.
                    </p>

                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Nombre Comercial de Empresa</label>
                        <input 
                          type="text" 
                          value={companyConfig.nombre}
                          onChange={(e) => setCompanyConfig(prev => ({ ...prev, nombre: e.target.value }))}
                          placeholder="Ej: DISTRIBUIDORA MÓVIL"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Teléfono Directo de Soporte / WhatsApp</label>
                        <input 
                          type="text" 
                          value={companyConfig.telefono}
                          onChange={(e) => setCompanyConfig(prev => ({ ...prev, telefono: e.target.value }))}
                          placeholder="Ej: 549110000000"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Dirección Física / Eslogan Tributario</label>
                        <input 
                          type="text" 
                          value={companyConfig.direccion}
                          onChange={(e) => setCompanyConfig(prev => ({ ...prev, direccion: e.target.value }))}
                          placeholder="Ej: Av. Rivadavia 1234, CABA"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Logotipo Corporativo (PDF e Iconografía)</label>
                        <div className="space-y-3">
                          <input 
                            id="company-logo-file"
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 1.5 * 1024 * 1024) {
                                  alert("El logo es muy pesado. Suba una imagen menor a 1.5MB.");
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                  if (event.target?.result) {
                                    setCompanyConfig(prev => ({ ...prev, logo: event.target!.result as string }));
                                    triggerNotification("Logo de la empresa cargado con éxito");
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden"
                          />
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => document.getElementById('company-logo-file')?.click()}
                              className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold py-2 px-4 rounded-xl text-xs transition select-none"
                            >
                              Seleccionar Archivo Logo
                            </button>
                            {companyConfig.logo && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCompanyConfig(prev => ({ ...prev, logo: '' }));
                                  triggerNotification("Logo eliminado");
                                }}
                                className="bg-rose-950 text-rose-400 hover:bg-rose-900 border border-rose-900/35 font-semibold py-2 px-4 rounded-xl text-xs transition"
                              >
                                Eliminar Logo
                              </button>
                            )}
                          </div>
                          
                          {companyConfig.logo ? (
                            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center gap-3">
                              <img 
                                src={companyConfig.logo} 
                                alt="Logo cargado" 
                                className="w-16 h-16 object-cover rounded-lg border border-slate-800 bg-slate-900"
                              />
                              <div>
                                <p className="font-bold text-white text-[11px]">Logotipo Activado</p>
                                <p className="text-[9px] text-slate-500">Se insertará de forma óptima en el encabezado de las boletas.</p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-center">
                              <p className="text-[10px] text-slate-500">Ningún logotipo personalizado subido (se utilizarán las iniciales por defecto).</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 font-semibold mb-1">Contraseña del Administrador (Acceso Principal)</label>
                        <input 
                          type="text" 
                          value={adminPasswordInput}
                          onChange={(e) => setAdminPasswordInput(e.target.value)}
                          placeholder="Ej: admin"
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-slate-100 font-bold"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">Esta clave restringe el acceso al perfil de Administrador global en el portal.</p>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await updateCompanyConfig({
                              nombre: companyConfig.nombre,
                              telefono: companyConfig.telefono,
                              direccion: companyConfig.direccion,
                              logo: companyConfig.logo,
                              adminPassword: adminPasswordInput
                            });
                            localStorage.setItem('distribuidor_config_empresa', JSON.stringify({
                              ...companyConfig,
                              adminPassword: adminPasswordInput
                            }));
                            triggerNotification("Configuración de empresa guardada y sincronizada en tiempo real");
                          } catch (err: any) {
                            triggerNotification(err.message || 'Error al guardar configuración', 'error');
                          }
                        }}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-bold py-3 rounded-xl transition text-xs uppercase cursor-pointer"
                      >
                        ✓ Guardar Parámetros de Factura
                      </button>
                    </div>
                  </div>

                  {/* SECCION DE ADMINISTRACION DE VENDEDORES */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-emerald-400" />
                        <h3 className="font-bold text-sm text-white">Registro y Alta de Vendedores</h3>
                      </div>
                      <button 
                        type="button"
                        id="tab-config-add-seller"
                        onClick={() => {
                          setSellerForm({ 
                            id: '', 
                            nombre: '', 
                            telefono: '', 
                            activo: true,
                            password: '123',
                            permissions: ['dashboard', 'sales', 'settlements', 'catalog', 'clients', 'tasks', 'reports']
                          });
                          setShowSellerModal(true);
                        }}
                        className="bg-emerald-500 hover:bg-emerald-600 font-bold px-3 py-1.5 rounded-xl text-slate-950 text-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto shadow-md"
                      >
                        <span className="text-sm font-black">+</span> <span>Dar de Alta Vendedor</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-normal">
                      Gestione el personal de preventa autorizado. Cada vendedor dado de alta obtendrá credenciales únicas de acceso para cargar pedidos, registrar visitas o deudas de clientes, y reportar rendiciones desde la app móvil.
                    </p>

                    <div className="space-y-2">
                      {data.vendedores.length === 0 ? (
                        <div className="text-center py-6 bg-slate-950 rounded-xl text-[11px] text-slate-500 italic border border-slate-850">
                          Ningún vendedor dado de alta. Use el botón "+ Dar de Alta Vendedor" para registrar el primero.
                        </div>
                      ) : (
                        data.vendedores.map(v => (
                          <div key={v.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs flex justify-between items-center transition hover:border-slate-700/80 gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-extrabold text-slate-100 truncate">{v.nombre}</p>
                                <span className={`text-[8px] px-1.5 py-0.2 rounded font-black tracking-wider uppercase ${v.activo ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-900/40' : 'bg-rose-950/70 text-rose-400 border border-rose-900/40'}`}>
                                  {v.activo ? 'ACTIVO' : 'INACTIVO'}
                                </span>
                              </div>
                              <div className="text-slate-400 text-[10px] mt-1 space-y-0.5">
                                <p>📱 Teléfono: <span className="text-slate-300 font-medium">{v.telefono}</span></p>
                                <p>🔑 Clave Acceso: <span className="font-mono text-indigo-300 font-bold bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">{v.password || '123'}</span></p>
                              </div>
                              <p className="text-[9px] text-slate-500 mt-1.5 truncate max-w-full">
                                🔒 Accesos concedidos: {v.permissions?.join(', ') || 'Modo preventa básico'}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button 
                                type="button"
                                onClick={() => {
                                  setSellerForm({ 
                                    id: v.id, 
                                    nombre: v.nombre, 
                                    telefono: v.telefono, 
                                    activo: v.activo,
                                    password: v.password || '123',
                                    permissions: v.permissions || ['dashboard', 'sales', 'settlements', 'catalog', 'clients', 'tasks', 'reports']
                                  });
                                  setShowSellerModal(true);
                                }}
                                className="bg-slate-900 text-slate-300 p-2 rounded-xl hover:bg-slate-800 border border-slate-800 hover:text-white transition cursor-pointer"
                                title="Editar datos o permisos del vendedor"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              
                              <button
                                type="button"
                                onClick={async () => {
                                  const confirmMsg = `¿Está seguro de querer dar de BAJA y eliminar al vendedor "${v.nombre}" del sistema?\nEsta acción no se puede deshacer.`;
                                  if (confirm(confirmMsg)) {
                                    try {
                                      await deleteSellerItem(v.id);
                                      triggerNotification('Vendedor eliminado y dado de baja en tiempo real', 'success');
                                    } catch (err: any) {
                                      triggerNotification('Error al eliminar vendedor: ' + err.message, 'error');
                                    }
                                  }
                                }}
                                className="bg-slate-900 text-rose-400 p-2 rounded-xl hover:bg-rose-950/40 border border-slate-800 hover:text-rose-400 transition cursor-pointer"
                                title="Dar de baja / Eliminar vendedor"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* SECCION DEL PANEL DEL CREADOR */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Briefcase className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-bold text-sm text-white">Módulo Creador (Control de Suscripción)</h3>
                    </div>

                    {!isCreatorAuthenticated ? (
                      <div className="space-y-3">
                        <p className="text-[10px] text-slate-400">
                          Panel de seguridad para el Creador/Desarrollador de la aplicación. Permite suspender temporalmente el uso del sistema por falta de pago de suscripción comercial. Ingrese con la contraseña asignada.
                        </p>
                        <div className="space-y-3 text-xs">
                          <div>
                            <input 
                              type="password" 
                              value={creatorPasswordInput}
                              onChange={(e) => {
                                setCreatorPasswordInput(e.target.value);
                                setShowCreatorAuthError(false);
                              }}
                              placeholder="Contraseña del Creador"
                              className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 rounded-xl px-3 py-2 text-slate-100"
                            />
                            {showCreatorAuthError && (
                              <p className="text-rose-500 text-[10px] font-semibold mt-1">✓ Contraseña inválida. Intente de nuevo.</p>
                            )}
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const correctPass = data.config_empresa?.[0]?.creadorPassword || 'ajnova2026';
                              if (creatorPasswordInput === correctPass || creatorPasswordInput === 'ajnova2026') {
                                setIsCreatorAuthenticated(true);
                                setShowCreatorAuthError(false);
                                setCreatorPasswordInput('');
                                triggerNotification("Creador autenticado correctamente", "info");
                              } else {
                                setShowCreatorAuthError(true);
                              }
                            }}
                            className="w-full bg-indigo-650 hover:bg-indigo-600 active:scale-95 text-white font-bold py-2.5 rounded-xl transition text-xs cursor-pointer"
                          >
                            Validar Acceso Creador
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 text-xs">
                        <div className="p-3 bg-indigo-950/20 border border-indigo-900/50 rounded-xl text-[10px] text-indigo-300">
                          🚪 Sesión de Creador de la Aplicación iniciada con éxito. Tienes control de facturación directo sobre esta instancia de software.
                        </div>

                        <div className="space-y-2">
                          <label className="block text-slate-400 font-semibold">Estado de la Suscripción Comercial</label>
                          <button
                            type="button"
                            onClick={async () => {
                              const newStatus = !isAppActive;
                              try {
                                await updateCompanyConfig({ appActiva: newStatus });
                                triggerNotification(
                                  newStatus ? "Sistema habilitado nuevamente" : "Sistema suspendido por falta de pago",
                                  newStatus ? "success" : "error"
                                );
                              } catch (err: any) {
                                triggerNotification('Error al suspender: ' + err.message, 'error');
                              }
                            }}
                            className={`w-full py-4 rounded-xl font-black text-center transition-all text-xs border cursor-pointer ${
                              isAppActive 
                                ? 'bg-emerald-950 hover:bg-emerald-920 border-emerald-500 text-emerald-400' 
                                : 'bg-rose-950 hover:bg-rose-920 border-rose-500 text-rose-450'
                            }`}
                          >
                            {isAppActive ? '🟢 SISTEMA ACTIVO (Abono al Día)' : '🔴 SISTEMA SUSPENDIDO (Falta de Abono)'}
                          </button>
                          
                          <p className="text-[10px] text-slate-500 italic mt-1 text-center font-medium leading-normal">
                            * Al pulsar en suspender, se bloqueará completamente el acceso de todos los vendedores y administradores en tiempo real.
                          </p>
                        </div>

                        <div className="space-y-2.5 border-t border-slate-800 pt-3.5">
                          <label className="block text-slate-400 font-semibold mb-1">Cambiar Contraseña Acceso Creador</label>
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              placeholder="Nueva contraseña"
                              value={newCreatorPassInput}
                              onChange={(e) => setNewCreatorPassInput(e.target.value)}
                              className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:outline-none rounded-xl px-3 py-1.5 text-xs text-white"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                if (!newCreatorPassInput.trim()) {
                                  triggerNotification('Escriba una contraseña válida', 'error');
                                  return;
                                }
                                try {
                                  await updateCompanyConfig({ creadorPassword: newCreatorPassInput.trim() });
                                  setNewCreatorPassInput('');
                                  triggerNotification('Nueva contraseña asignada al Creador');
                                } catch (err: any) {
                                  triggerNotification('Error al guardar contraseña: ' + err.message, 'error');
                                }
                              }}
                              className="px-3 bg-indigo-650 hover:bg-indigo-600 rounded-xl text-[10px] font-bold text-white transition-all text-center"
                            >
                              Guardar Contraseña
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatorAuthenticated(false);
                            triggerNotification("Sesión creador finalizada");
                          }}
                          className="w-full py-2 bg-slate-950 text-slate-400 hover:text-white rounded-xl border border-slate-800 text-center font-bold cursor-pointer"
                        >
                          Cerrar Panel Creador
                        </button>
                      </div>
                    )}
                  </div>

                  {/* SECCION DE RESTABLECER DE FÁBRICA / PUESTA A CERO */}
                  <div className="bg-slate-900 border border-rose-950/40 p-5 rounded-2xl space-y-4 shadow-sm">
                    <div className="flex items-center gap-2 border-b border-rose-950/35 pb-3">
                      <Trash2 className="w-5 h-5 text-rose-500" />
                      <h3 className="font-bold text-sm text-white">Puesta a Cero (Restablecer Sistema)</h3>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-normal">
                      Esta función permite limpiar toda la base de datos de manera absoluta para comenzar a trabajar desde cero. Se eliminarán de forma permanente: <strong>vendedores, clientes, productos, ventas, y tareas asignadas</strong> (tanto de la memoria de este navegador como del servidor sincronizado de Firebase).
                    </p>
                    <p className="text-[10px] text-rose-400/90 font-bold leading-normal">
                      ⚠️ ¡Atención! Esta acción es definitiva y no se puede deshacer. Los datos de configuración de empresa y la contraseña de administrador se mantendrán para permitirle reconfigurar.
                    </p>

                    {!showResetConfirm ? (
                      <button
                        type="button"
                        onClick={() => {
                          setShowResetConfirm(true);
                          setResetConfirmInput('');
                        }}
                        className="w-full bg-rose-950/50 hover:bg-rose-950 text-rose-400 border border-rose-900/50 hover:border-rose-700/80 font-bold py-3 rounded-xl transition text-xs uppercase cursor-pointer animate-pulse"
                      >
                        🗑️ Iniciar Puesta a Cero de la Aplicación
                      </button>
                    ) : (
                      <div className="space-y-4 p-4 bg-slate-950 rounded-xl border border-rose-950 text-xs">
                        <p className="text-slate-300 font-semibold text-[11px]">
                          Para confirmar la eliminación total, escriba la palabra <span className="text-rose-400 font-extrabold bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">CONFIRMAR</span> en el cuadro de abajo:
                        </p>
                        
                        <div className="space-y-3">
                          <input 
                            type="text"
                            value={resetConfirmInput}
                            onChange={(e) => setResetConfirmInput(e.target.value)}
                            placeholder="Escriba CONFIRMAR aquí..."
                            className="w-full bg-slate-900 border border-rose-950/60 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 rounded-xl px-3 py-2 text-slate-100 font-bold text-center uppercase tracking-widest placeholder:lowercase placeholder:font-normal placeholder:tracking-normal font-mono"
                            disabled={isResetting}
                          />

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowResetConfirm(false);
                                setResetConfirmInput('');
                              }}
                              className="flex-1 py-2 bg-slate-900 text-slate-400 hover:text-white rounded-xl border border-slate-800 text-center font-bold transition text-xs cursor-pointer"
                              disabled={isResetting}
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              disabled={resetConfirmInput !== 'CONFIRMAR' || isResetting}
                              onClick={async () => {
                                setIsResetting(true);
                                try {
                                  await clearAllDatabaseData();
                                  triggerNotification("¡Puesta a cero realizada correctamente!", "success");
                                  setShowResetConfirm(false);
                                  setResetConfirmInput('');
                                  
                                  // Refresh active tab or trigger window reload/data refetch if needed
                                  setTimeout(() => {
                                    window.location.reload();
                                  }, 1500);
                                } catch (err: any) {
                                  triggerNotification(err.message || 'Error al restablecer base de datos', 'error');
                                } finally {
                                  setIsResetting(false);
                                }
                              }}
                              className={`flex-1 py-2 rounded-xl text-center font-black transition-all text-xs border cursor-pointer ${
                                resetConfirmInput === 'CONFIRMAR'
                                  ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-500 shadow-md'
                                  : 'bg-rose-950/20 text-rose-800 border-rose-950/40 cursor-not-allowed'
                              }`}
                            >
                              {isResetting ? 'Borrando...' : '🔥 CONFIRMAR BORRADO TOTAL'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB: REPORTS (INFORMES DE VENTAS)                        */}
              {/* ========================================================= */}
              {activeTab === 'reports' && (
                <div className="space-y-6">
                  
                  {/* HEADER AREA */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
                    <div>
                      <h2 className="text-lg font-black text-white flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        Informes de Ventas
                      </h2>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Consulte estadísticas detalladas, rankings de productos, rendimiento de vendedores y descargue el historial de lo vendido.
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={exportReportToCSV}
                        className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Exportar CSV</span>
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Imprimir</span>
                      </button>
                    </div>
                  </div>

                  {/* FILTERS PANEL */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
                    <h3 className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">Filtros de Búsqueda</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      
                      {/* FILTER BY SELLER (Only for Admin) */}
                      {currentRole === 'admin' ? (
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-semibold block">Vendedor</label>
                          <select
                            value={reportSellerFilter}
                            onChange={(e) => setReportSellerFilter(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          >
                            <option value="todos">Todos los vendedores</option>
                            {data.vendedores.map(v => (
                              <option key={v.id} value={v.id}>{v.nombre}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[11px] text-slate-400 font-semibold block">Vendedor</label>
                          <input
                            type="text"
                            value={activeSellerName}
                            disabled
                            className="w-full bg-slate-950 border border-slate-850 rounded-xl p-2.5 text-xs text-slate-500 font-bold focus:outline-none"
                          />
                        </div>
                      )}

                      {/* FILTER BY CLIENT */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-semibold block">Cliente</label>
                        <select
                          value={reportClientFilter}
                          onChange={(e) => setReportClientFilter(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="todos">Todos los clientes</option>
                          {data.clientes.map(c => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                          ))}
                        </select>
                      </div>

                      {/* FILTER BY DATE PRESET */}
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-semibold block">Rango de Fecha</label>
                        <select
                          value={reportDateRangeFilter}
                          onChange={(e) => setReportDateRangeFilter(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="today">Hoy ({new Date().toISOString().split('T')[0]})</option>
                          <option value="7days">Últimos 7 días</option>
                          <option value="month">Este Mes (Desde el 1°)</option>
                          <option value="custom">Rango Personalizado</option>
                        </select>
                      </div>

                      {/* CUSTOM DATE PICKERS (Only if Range is Custom) */}
                      {reportDateRangeFilter === 'custom' && (
                        <div className="md:col-span-3 lg:col-span-1 grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 block">Desde</label>
                            <input
                              type="date"
                              value={reportStartDate}
                              onChange={(e) => setReportStartDate(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 block">Hasta</label>
                            <input
                              type="date"
                              value={reportEndDate}
                              onChange={(e) => setReportEndDate(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                            />
                          </div>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* KEY KPI CARDS */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* KPI 1: REVENUE */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Facturación Total</p>
                      <h3 className="text-xl font-black text-white mt-1.5">
                        ${reportFilteredSales.reduce((sum, s) => sum + s.total, 0).toLocaleString()}
                      </h3>
                      <div className="mt-2 flex gap-2 text-[9px] text-slate-400">
                        <span>Cobrado: ${reportFilteredSales.filter(s => s.dineroArreglado).reduce((sum, s) => sum + s.total, 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* KPI 2: BOLETAS */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Boletas Emitidas</p>
                      <h3 className="text-xl font-black text-white mt-1.5">
                        {reportFilteredSales.length}
                      </h3>
                      <p className="text-[9px] text-slate-400 mt-2">
                        Ticket Promedio: ${reportFilteredSales.length > 0 ? Math.round(reportFilteredSales.reduce((sum, s) => sum + s.total, 0) / reportFilteredSales.length).toLocaleString() : 0}
                      </p>
                    </div>

                    {/* KPI 3: ITEMS */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Bultos / Artículos</p>
                      <h3 className="text-xl font-black text-white mt-1.5">
                        {reportFilteredSales.reduce((sum, s) => sum + (s.articulos || []).reduce((itemSum, item) => itemSum + item.cantidad, 0), 0)}
                      </h3>
                      <p className="text-[9px] text-slate-400 mt-2">
                        Promedio bultos por boleta: {reportFilteredSales.length > 0 ? (reportFilteredSales.reduce((sum, s) => sum + (s.articulos || []).reduce((itemSum, item) => itemSum + item.cantidad, 0), 0) / reportFilteredSales.length).toFixed(1) : 0}
                      </p>
                    </div>

                    {/* KPI 4: RENDICION DE CAJA */}
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-sm">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Pendiente de Rendición</p>
                      <h3 className="text-xl font-black text-rose-400 mt-1.5">
                        ${reportFilteredSales.filter(s => !s.dineroArreglado).reduce((sum, s) => sum + s.total, 0).toLocaleString()}
                      </h3>
                      <p className="text-[9px] text-emerald-400 mt-2">
                        Rendido: {reportFilteredSales.length > 0 ? Math.round((reportFilteredSales.filter(s => s.dineroArreglado).length / reportFilteredSales.length) * 100) : 0}% de boletas
                      </p>
                    </div>

                  </div>

                  {/* MAIN ANALYTICS TABLES GRID */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* CARD A: RANKING DE PRODUCTOS MAS VENDIDOS */}
                    <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">🏆 Ranking de Productos</h3>
                        <span className="text-[10px] bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded font-bold border border-indigo-900/40">Por Cantidad Sold</span>
                      </div>

                      {productRanking.length === 0 ? (
                        <div className="py-12 text-center text-[11px] text-slate-500 italic">
                          No se registran productos vendidos en este rango seleccionado.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                                <th className="pb-2">Producto</th>
                                <th className="pb-2 text-center">Unidades</th>
                                <th className="pb-2 text-right">Facturado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {productRanking.slice(0, 15).map((prod, idx) => (
                                <tr key={prod.id} className="border-b border-slate-850/60 hover:bg-slate-950/20">
                                  <td className="py-2 font-medium text-slate-200 flex items-center gap-2">
                                    <span className="text-[10px] text-slate-500 font-mono w-4">{idx + 1}.</span>
                                    <span className="truncate max-w-[200px] sm:max-w-[300px]" title={prod.nombre}>{prod.nombre}</span>
                                  </td>
                                  <td className="py-2 text-center font-bold text-indigo-400">
                                    {prod.cantidad}
                                  </td>
                                  <td className="py-2 text-right font-bold text-emerald-400">
                                    ${prod.total.toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {productRanking.length > 15 && (
                            <p className="text-[10px] text-slate-500 text-center mt-3">Mostrando los 15 productos más vendidos ({productRanking.length} en total)</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* CARD B: VENTAS POR VENDEDOR */}
                    {currentRole === 'admin' && (
                      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                          <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">💼 Rendimiento por Vendedor</h3>
                          <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-900/40">Monto Total</span>
                        </div>

                        {sellerRanking.length === 0 ? (
                          <div className="py-12 text-center text-[11px] text-slate-500 italic">
                            No se registran ventas asociadas a vendedores.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                                  <th className="pb-2">Vendedor</th>
                                  <th className="pb-2 text-center">Boletas</th>
                                  <th className="pb-2 text-right">Rendido</th>
                                  <th className="pb-2 text-right">Total Facturado</th>
                                </tr>
                              </thead>
                              <tbody>
                                {sellerRanking.map((sell, idx) => (
                                  <tr key={sell.id} className="border-b border-slate-850/60 hover:bg-slate-950/20">
                                    <td className="py-2.5 font-bold text-slate-200 flex items-center gap-2">
                                      <span className="text-[10px] text-slate-500 font-mono w-4">{idx + 1}.</span>
                                      <span className="truncate">{sell.nombre}</span>
                                    </td>
                                    <td className="py-2.5 text-center font-semibold text-slate-300">
                                      {sell.totalOrders}
                                    </td>
                                    <td className="py-2.5 text-right text-emerald-450 text-[11px]">
                                      ${sell.settled.toLocaleString()}
                                    </td>
                                    <td className="py-2.5 text-right font-bold text-emerald-400">
                                      ${sell.total.toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* CARD C: HISTORIAL DE ARTICULOS VENDIDOS DETALLADO */}
                  <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">📋 Detalle Completo de Transacciones</h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">Listado pormenorizado de cada artículo cargado y facturado</p>
                      </div>
                      <span className="text-[10px] bg-slate-950 text-slate-400 px-2.5 py-1 rounded font-mono font-bold">
                        {reportFilteredSales.length} Boletas encontradas
                      </span>
                    </div>

                    {reportFilteredSales.length === 0 ? (
                      <div className="py-12 text-center text-[11px] text-slate-500 italic">
                        No se encontraron registros de ventas que cumplan los filtros actuales.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                          <thead>
                            <tr className="border-b border-slate-800 text-slate-500 font-semibold">
                              <th className="pb-2">Fecha</th>
                              <th className="pb-2">Boleta</th>
                              <th className="pb-2">Cliente</th>
                              <th className="pb-2">Vendedor</th>
                              <th className="pb-2">Artículo Vendido</th>
                              <th className="pb-2 text-center">Cant.</th>
                              <th className="pb-2 text-right">P. Unitario</th>
                              <th className="pb-2 text-right">Total Item</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportFilteredSales.map(s => {
                              const dateOnly = s.fecha.split('T')[0];
                              const items = s.articulos || [];
                              return items.map((item, itemIdx) => (
                                <tr key={`${s.id}-${item.id}-${itemIdx}`} className="border-b border-slate-850/40 hover:bg-slate-950/15">
                                  <td className="py-2 text-slate-400 font-mono text-[10px]">
                                    {dateOnly}
                                  </td>
                                  <td className="py-2 font-mono text-slate-300 font-semibold">
                                    {s.numeroComprobante || 'N/A'}
                                  </td>
                                  <td className="py-2 text-slate-200 max-w-[120px] truncate" title={s.clienteNombre}>
                                    {s.clienteNombre}
                                  </td>
                                  <td className="py-2 text-slate-400 max-w-[100px] truncate" title={s.vendedorNombre}>
                                    {s.vendedorNombre}
                                  </td>
                                  <td className="py-2 text-slate-200 font-medium">
                                    {item.nombre}
                                  </td>
                                  <td className="py-2 text-center font-bold text-slate-300">
                                    {item.cantidad}
                                  </td>
                                  <td className="py-2 text-right text-slate-400 font-mono text-[11px]">
                                    ${(item.precioConDescuento || item.precioBase).toLocaleString()}
                                  </td>
                                  <td className="py-2 text-right font-extrabold text-emerald-400 font-mono">
                                    ${item.totalItem.toLocaleString()}
                                  </td>
                                </tr>
                              ));
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              )}
            </>
          )}

        </main>

        {/* BOTTOM NAV BAR (Mobile Only) */}
        <footer className={`${isMobileFrame ? 'flex' : 'md:hidden flex'} bg-slate-900 border-t border-slate-850 px-4 py-3 shrink-0 items-center justify-between text-[11px] z-10 select-none`}>
          <div className="text-slate-400">
            Rol: <strong className="text-white uppercase">{currentRole} {currentRole === 'seller' ? `(${activeSellerName})` : ''}</strong>
          </div>
          <div className="flex gap-1">
            <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-bold border border-emerald-900/80">Real-Time</span>
          </div>
        </footer>

              </div> {/* Close MAIN CONTENT AREA */}
            </div> {/* Close FULL RESPONSIVE CONTAINER WITH SIDEBAR ON THE LEFT */}

        {/* ========================================================= */}
        {/* MODAL WINDOWS FOR CRUD ACTIONS                            */}
        {/* ========================================================= */}
        
        {/* A. SELLER ADD/EDIT MODAL */}
        {showSellerModal && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSaveSeller} className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-4 space-y-4 max-h-[90%] overflow-y-auto">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-sm text-white">{sellerForm.id ? 'Editar Vendedor' : 'Agregar Vendedor'}</h3>
                <button type="button" onClick={() => setShowSellerModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Nombre Completo</label>
                  <input 
                    id="seller-name-input"
                    type="text" 
                    required
                    placeholder="Ej: Pedro Martínez"
                    value={sellerForm.nombre}
                    onChange={(e) => setSellerForm({ ...sellerForm, nombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Teléfono Móvil (WhatsApp format)</label>
                  <input 
                    id="seller-phone-input"
                    type="text" 
                    required
                    placeholder="Ej: 54911223344"
                    value={sellerForm.telefono}
                    onChange={(e) => setSellerForm({ ...sellerForm, telefono: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
                
                <div>
                  <label className="text-slate-400 block mb-1">Contraseña de Acceso</label>
                  <input 
                    id="seller-password-input"
                    type="text" 
                    required
                    placeholder="Ej: 123"
                    value={sellerForm.password}
                    onChange={(e) => setSellerForm({ ...sellerForm, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Utilizado al iniciar sesión como vendedor en la app.</p>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Módulos de Acceso (Permisos)</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-lg border border-slate-850">
                    {[
                      { id: 'dashboard', label: 'Panel Dashboard' },
                      { id: 'sales', label: 'Preventa Móvil' },
                      { id: 'settlements', label: 'Rendiciones' },
                      { id: 'catalog', label: 'Catálogo' },
                      { id: 'clients', label: 'Clientes' },
                      { id: 'tasks', label: 'Tareas y Alertas' },
                      { id: 'reports', label: 'Informes de Ventas' },
                      { id: 'config', label: 'Ajustes' },
                    ].map(tab => {
                      const permissionsList = sellerForm.permissions || [];
                      const isChecked = permissionsList.includes(tab.id);
                      return (
                        <label key={tab.id} className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const updatedPermissions = isChecked 
                                ? permissionsList.filter(id => id !== tab.id)
                                : [...permissionsList, tab.id];
                              setSellerForm({ ...sellerForm, permissions: updatedPermissions });
                            }}
                            className="rounded bg-slate-900 border-slate-800 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
                          />
                          <span>{tab.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input 
                    id="seller-active-check"
                    type="checkbox"
                    checked={sellerForm.activo}
                    onChange={(e) => setSellerForm({ ...sellerForm, activo: e.target.checked })}
                    className="rounded bg-slate-950 border-slate-850 text-emerald-500 focus:ring-0 w-3.5 h-3.5"
                  />
                  <label className="text-slate-300 font-medium">Vendedor habilitado / activo</label>
                </div>
              </div>

              <button type="submit" className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs transition duration-200">
                Guardar Cambios
              </button>
            </form>
          </div>
        )}

        {/* B. CLIENT ADD/EDIT MODAL */}
        {showClientModal && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSaveClient} className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-white">{clientForm.id ? 'Editar Cliente' : 'Agregar de la Ruta'}</h3>
                <button type="button" onClick={() => setShowClientModal(false)}><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Nombre / Razón Social</label>
                  <input 
                    id="client-name-input"
                    type="text" 
                    required
                    placeholder="Ej: Autoservicio Don Luis"
                    value={clientForm.nombre}
                    onChange={(e) => setClientForm({ ...clientForm, nombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Celular de Contacto (WhatsApp)</label>
                  <input 
                    id="client-phone-input"
                    type="text" 
                    required
                    placeholder="Ej: 54911223344"
                    value={clientForm.telefono}
                    onChange={(e) => setClientForm({ ...clientForm, telefono: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Dirección de Entrega</label>
                  <input 
                    id="client-address-input"
                    type="text" 
                    required
                    placeholder="Ej: Calle 123, Avellaneda"
                    value={clientForm.direccion}
                    onChange={(e) => setClientForm({ ...clientForm, direccion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Asignar Lista de Precios</label>
                  <select 
                    id="client-pricelist-input"
                    value={clientForm.listaPrecioId}
                    onChange={(e) => setClientForm({ ...clientForm, listaPrecioId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs focus:outline-none"
                  >
                    {data.listasPrecio.map(l => (
                      <option key={l.id} value={l.id}>{l.nombre} ({l.descuentoPorcentaje}% descuento)</option>
                    ))}
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs">
                Registrar Cliente
              </button>
            </form>
          </div>
        )}

        {/* C. PRODUCT ADD/EDIT MODAL */}
        {showProductModal && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSaveProduct} className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-white">{productForm.id ? 'Editar Producto' : 'Nuevo Catálogo'}</h3>
                <button type="button" onClick={() => setShowProductModal(false)}><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Descripción del Producto</label>
                  <input 
                    id="product-name-input"
                    type="text" 
                    required
                    placeholder="Ej: Aceite Oliva Extra Virgen 500ml"
                    value={productForm.nombre}
                    onChange={(e) => setProductForm({ ...productForm, nombre: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Código de Barras / SKU</label>
                  <input 
                    id="product-code-input"
                    type="text" 
                    required
                    placeholder="Ej: 7791234567"
                    value={productForm.codigo}
                    onChange={(e) => setProductForm({ ...productForm, codigo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Precio Base Comercial ($)</label>
                  <input 
                    id="product-price-input"
                    type="number" 
                    required
                    placeholder="Ej: 1500"
                    value={productForm.precioBase || ''}
                    onChange={(e) => setProductForm({ ...productForm, precioBase: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs">
                Guardar Producto
              </button>
            </form>
          </div>
        )}

        {/* D. ASSIGN AND ADJUST STOCK MODAL */}
        {showStockTransferModal && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleStockTransferSubmit} className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-white">Asignación de Stock</h3>
                <button type="button" onClick={() => setShowStockTransferModal(false)}><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Vendedor a Reponer</label>
                  <select 
                    id="stock-seller-select"
                    value={stockTransfer.sellerId}
                    onChange={(e) => setStockTransfer({ ...stockTransfer, sellerId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  >
                    {data.vendedores.map(v => (
                      <option key={v.id} value={v.id}>{v.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Cantidad de Unidades</label>
                  <input 
                    id="stock-qty-input"
                    type="number" 
                    required
                    min={1}
                    value={stockTransfer.amount}
                    onChange={(e) => setStockTransfer({ ...stockTransfer, amount: parseInt(e.target.value) || 1 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Tipo de Ajuste</label>
                  <select 
                    id="stock-adjust-type"
                    value={stockTransfer.type}
                    onChange={(e) => setStockTransfer({ ...stockTransfer, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  >
                    <option value="add">Sumar Stock a Ruta</option>
                    <option value="subtract">Egresar / Descontar Stock</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs">
                Actualizar Stock
              </button>
            </form>
          </div>
        )}

        {/* E. BULK PRICE UPDATE MODAL */}
        {showBulkPriceModal && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleBulkPriceSubmit} className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-white">Actualización Masiva de Precios</h3>
                <button type="button" onClick={() => setShowBulkPriceModal(false)}><X className="w-5 h-5" /></button>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <p className="font-semibold text-slate-300">⚠️ ¡Atención!</p>
                <p>Este ajuste modificará los precios base de todos los artículos almacenados. Las listas de descuentos seguirán calculando el porcentaje en base al nuevo valor fijado.</p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1 bg-slate-900">Método de Ajuste</label>
                  <select 
                    id="bulk-price-method"
                    value={bulkPriceForm.type}
                    onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, type: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  >
                    <option value="percentage">Ajustar por Porcentaje (%)</option>
                    <option value="fixed">Ajustar por Suma Fija ($)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Modificación</label>
                  <input 
                    id="bulk-price-value-input"
                    type="number" 
                    required
                    placeholder="Ej: 10 para +10% o -5 para reducir"
                    value={bulkPriceForm.value}
                    onChange={(e) => setBulkPriceForm({ ...bulkPriceForm, value: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Usa números negativos para reducciones de precio.</p>
                </div>
              </div>

              <button type="submit" className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs">
                Confirmar Actualización General
              </button>
            </form>
          </div>
        )}

        {/* F. TASK ASSIGNMENT MODAL */}
        {showTaskModal && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSaveTask} className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-white">Nueva Tarea en Tiempo Real</h3>
                <button type="button" onClick={() => setShowTaskModal(false)}><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Título de la Alerta</label>
                  <input 
                    id="task-title-input"
                    type="text" 
                    required
                    placeholder="Ej: Cobrar saldo en Kiosco"
                    value={taskForm.titulo}
                    onChange={(e) => setTaskForm({ ...taskForm, titulo: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Instrucciones y Detalles</label>
                  <textarea 
                    id="task-desc-input"
                    rows={3}
                    required
                    placeholder="Detallar dirección u observaciones..."
                    value={taskForm.descripcion}
                    onChange={(e) => setTaskForm({ ...taskForm, descripcion: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Vendedor Asignado</label>
                  <select 
                    id="task-assignee-select"
                    value={taskForm.asignadoA}
                    onChange={(e) => setTaskForm({ ...taskForm, asignadoA: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white text-xs focus:outline-none"
                  >
                    <option value="todos">Todos los Vendedores</option>
                    {data.vendedores.map(v => (
                      <option key={v.id} value={v.id}>{v.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 col-span-2">Fecha Límite</label>
                  <input 
                    id="task-duedate-input"
                    type="date"
                    value={taskForm.fechaLimite}
                    onChange={(e) => setTaskForm({ ...taskForm, fechaLimite: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none text-xs"
                  />
                </div>
              </div>

              <button type="submit" className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs">
                Transmitir Instrucción
              </button>
            </form>
          </div>
        )}

        {/* G. ROLE SWITCHER CONFIGURATION MODAL */}
        {showRoleSelectorModal && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-5 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-sm text-white">Mi Perfil de Acceso</h3>
                <button type="button" onClick={() => setShowRoleSelectorModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-white" /></button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Rol de Acceso:</span>
                  <span className="font-extrabold text-indigo-400 uppercase">{currentRole === 'admin' ? '👑 Administrador' : '💼 Vendedor de Ruta'}</span>
                </div>
                {currentRole === 'seller' && (
                  <div className="flex items-center justify-between text-xs border-t border-slate-800 pt-2">
                    <span className="text-slate-400">Nombre de Ruta:</span>
                    <span className="font-bold text-white">{activeSellerName}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button 
                  type="button" 
                  onClick={() => {
                    handleLogout();
                    setShowRoleSelectorModal(false);
                  }}
                  className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-xl text-xs uppercase cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" /> Cerrar Sesión Segura
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowRoleSelectorModal(false)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase cursor-pointer transition-all"
                >
                  Regresar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* H. RECENT SALE RECEIPT PREVIEW DESIGN TO WHATSAPP */}
        {showReceiptModal && lastCreatedSale && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-sm text-green-400">✅ Venta Registrada con Éxito</h3>
                <button type="button" onClick={() => { setShowReceiptModal(false); setLastCreatedSale(null); }}><X className="w-5 h-5" /></button>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Comprobante:</span>
                  <span className="text-white font-bold">{lastCreatedSale.numeroComprobante}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Cliente:</span>
                  <span className="text-white font-bold">{lastCreatedSale.clienteNombre}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Monto Total:</span>
                  <span className="text-emerald-400 font-bold">${lastCreatedSale.total.toLocaleString()} ARS</span>
                </div>
                <div className="border-t border-slate-850 pt-2 mt-2 text-[10px] text-slate-400 text-center leading-normal">
                  Se ha descargado la copia del recibo contable en su teléfono móvil para que proceda a enviarlo.
                </div>
              </div>

              <div className="space-y-2">
                <button 
                  id="whatsapp-share-modal-btn"
                  onClick={() => {
                    triggerWhatsAppRedirection(lastCreatedSale);
                  }}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2"
                >
                  <Share2 className="w-4 h-4" /> Enviar por WhatsApp al Cliente
                </button>

                <button 
                  id="pdf-download-modal-btn"
                  onClick={() => triggerPdfDownload(lastCreatedSale)}
                  className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" /> Descargar de nuevo el PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* I. SETTLE MONEY MODAL DIALOG */}
        {showSettleModal && selectedSaleToSettle && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSettleActionSubmit} className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-white">Liquidar Boleta {selectedSaleToSettle.numeroComprobante}</h3>
                <button type="button" onClick={() => { setShowSettleModal(false); setSelectedSaleToSettle(null); }}><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                  <p className="text-slate-400">Cliente: <strong className="text-slate-200">{selectedSaleToSettle.clienteNombre}</strong></p>
                  <p className="text-slate-400 mt-1">Monto a Rendir: <strong className="text-emerald-400">${selectedSaleToSettle.total.toLocaleString()} ARS</strong></p>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Observación de Cobro</label>
                  <input 
                    id="settle-observ-input"
                    type="text" 
                    placeholder="Ej: Cobrado en efectivo, caja rendida"
                    value={settleNotes}
                    onChange={(e) => setSettleNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowSettleModal(false)}
                  className="py-2.5 bg-slate-805 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-lg text-xs"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  id="confirm-settle-btn"
                  className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs"
                >
                  Confirmar Liquidación
                </button>
              </div>
            </form>
          </div>
        )}

          </>
        )}
      </div>
    </div>
  );
}

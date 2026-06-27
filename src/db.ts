import { 
  collection, 
  doc, 
  setDoc, 
  addDoc,
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, isFirebaseEnabled as isFb } from './firebase';
export const isFirebaseEnabled = isFb;

// Document types matching our schema
export interface Seller {
  id: string;
  nombre: string;
  telefono: string;
  activo: boolean;
  password?: string;
  permissions?: string[]; // Array of tab IDs they are allowed to access
}

export interface Client {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  listaPrecioId: string; // Associated price list
}

export interface Product {
  id: string;
  nombre: string;
  codigo: string;
  precioBase: number;
  stockPorVendedor: { [sellerId: string]: number }; // ID -> Stock amount
  stockTotal: number;
}

export interface PriceList {
  id: string;
  nombre: string;
  descuentoPorcentaje: number; // Discount rate subtracted from base price
}

export interface SaleItem {
  id: string; // Product ID
  productoId: string;
  nombre: string;
  cantidad: number;
  precioBase: number;
  precioConDescuento: number;
  totalItem: number;
}

export interface Sale {
  id: string;
  numeroComprobante: string;
  fecha: string; // ISO String
  vendedorId: string;
  vendedorNombre: string;
  clienteId: string;
  clienteNombre: string;
  articulos: SaleItem[];
  total: number;
  dineroArreglado: boolean; // Cleared / Settle status
  observaciones?: string;
  fechaArreglo?: string;
}

export interface Task {
  id: string;
  titulo: string;
  descripcion: string;
  fechaLimite: string; // YYYY-MM-DD
  asignadoA: string; // sellerId or "todos"
  completada: boolean;
  creadaPor: string;
  createdAt: string; // ISO String
  completadaPor?: string;
}

export interface CompanyConfig {
  id: string;
  nombre: string;
  telefono: string;
  direccion: string;
  logo: string; // base64
  appActiva: boolean;
  creadorPassword?: string;
  adminPassword?: string;
}

// Initial Mock Data to seed the application so it is ready-to-test
const DEFAULT_PRICE_LISTS: PriceList[] = [
  { id: 'base', nombre: 'Lista Base (0%)', descuentoPorcentaje: 0 },
  { id: 'minorista_premium', nombre: 'Minorista Premium (5%)', descuentoPorcentaje: 5 },
  { id: 'mayorista', nombre: 'Mayorista Distribuidores (15%)', descuentoPorcentaje: 15 },
  { id: 'super_vip', nombre: 'Cliente Súper VIP (25%)', descuentoPorcentaje: 25 }
];

const DEFAULT_SELLERS: Seller[] = [
  { id: 'vend_carlos', nombre: 'Carlos Gómez', telefono: '5491122334455', activo: true, password: '123', permissions: ['dashboard', 'sales', 'settlements', 'catalog', 'clients', 'tasks'] },
  { id: 'vend_maria', nombre: 'María Rodríguez', telefono: '5491155667788', activo: true, password: '123', permissions: ['dashboard', 'sales', 'settlements', 'catalog', 'clients', 'tasks'] },
  { id: 'vend_javier', nombre: 'Javier Fernández', telefono: '5491199001122', activo: true, password: '123', permissions: ['dashboard', 'sales', 'settlements', 'catalog', 'clients', 'tasks'] }
];

const DEFAULT_CLIENTS: Client[] = [
  { id: 'cli_central', nombre: 'Supermercado Central', telefono: '5491133445566', direccion: 'Av. Corrientes 4500, CABA', listaPrecioId: 'mayorista' },
  { id: 'cli_sol', nombre: 'Almacén El Sol', telefono: '5491155443322', direccion: 'Calle Belgrano 120, Quilmes', listaPrecioId: 'minorista_premium' },
  { id: 'cli_esquina', nombre: 'Kiosco El Trébol', telefono: '5491177665544', direccion: 'Paso de la Patria 623, Morón', listaPrecioId: 'base' },
  { id: 'cli_vip_dist', nombre: 'Distribuidora Norte', telefono: '5491188990011', direccion: 'Av. San Martín 1500, San Isidro', listaPrecioId: 'super_vip' }
];

const DEFAULT_PRODUCTS: Product[] = [
  { 
    id: 'prod_aceite', 
    nombre: 'Aceite de Girasol Natura 1.5L', 
    codigo: '779023411132', 
    precioBase: 2500, 
    stockPorVendedor: { 'vend_carlos': 45, 'vend_maria': 30, 'vend_javier': 25 },
    stockTotal: 100
  },
  { 
    id: 'prod_arroz', 
    nombre: 'Arroz Lucchetti Largo Fino 1kg', 
    codigo: '779023455243', 
    precioBase: 1200, 
    stockPorVendedor: { 'vend_carlos': 80, 'vend_maria': 60, 'vend_javier': 40 },
    stockTotal: 180
  },
  { 
    id: 'prod_harina', 
    nombre: 'Harina de Trigo Cañuelas 000 1kg', 
    codigo: '779011110022', 
    precioBase: 950, 
    stockPorVendedor: { 'vend_carlos': 120, 'vend_maria': 50, 'vend_javier': 70 },
    stockTotal: 240
  },
  { 
    id: 'prod_fideos', 
    nombre: 'Fideos Tallarines Don Vicente 500g', 
    codigo: '779033322110', 
    precioBase: 1400, 
    stockPorVendedor: { 'vend_carlos': 30, 'vend_maria': 45, 'vend_javier': 50 },
    stockTotal: 125
  },
  { 
    id: 'prod_puré', 
    nombre: 'Puré de Tomate Arcor 520g', 
    codigo: '779055544331', 
    precioBase: 800, 
    stockPorVendedor: { 'vend_carlos': 15, 'vend_maria': 110, 'vend_javier': 85 },
    stockTotal: 210
  },
  { 
    id: 'prod_yerba', 
    nombre: 'Yerba Mate Playadito con Palo 1kg', 
    codigo: '779088899551', 
    precioBase: 3800, 
    stockPorVendedor: { 'vend_carlos': 25, 'vend_maria': 25, 'vend_javier': 25 },
    stockTotal: 75
  }
];

const DEFAULT_SALES: Sale[] = [
  {
    id: 'sale_1',
    numeroComprobante: 'V-0001',
    fecha: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // Yesterday
    vendedorId: 'vend_carlos',
    vendedorNombre: 'Carlos Gómez',
    clienteId: 'cli_sol',
    clienteNombre: 'Almacén El Sol',
    total: 31350,
    dineroArreglado: true,
    fechaArreglo: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    observaciones: 'Pago en efectivo completo.',
    articulos: [
      { id: 'prod_aceite', productoId: 'prod_aceite', nombre: 'Aceite de Girasol Natura 1.5L', cantidad: 5, precioBase: 2500, precioConDescuento: 2375, totalItem: 11875 },
      { id: 'prod_yerba', productoId: 'prod_yerba', nombre: 'Yerba Mate Playadito con Palo 1kg', cantidad: 5, precioBase: 3800, precioConDescuento: 3610, totalItem: 18050 },
      { id: 'prod_puré', productoId: 'prod_puré', nombre: 'Puré de Tomate Arcor 520g', cantidad: 2, precioBase: 800, precioConDescuento: 760, totalItem: 1520 }
    ]
  },
  {
    id: 'sale_2',
    numeroComprobante: 'V-0002',
    fecha: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), // Today
    vendedorId: 'vend_maria',
    vendedorNombre: 'María Rodríguez',
    clienteId: 'cli_central',
    clienteNombre: 'Supermercado Central',
    total: 48450,
    dineroArreglado: false,
    observaciones: 'Dinero pendiente de rendir al administrador.',
    articulos: [
      { id: 'prod_arroz', productoId: 'prod_arroz', nombre: 'Arroz Lucchetti Largo Fino 1kg', cantidad: 20, precioBase: 1200, precioConDescuento: 1020, totalItem: 20400 },
      { id: 'prod_harina', productoId: 'prod_harina', nombre: 'Harina de Trigo Cañuelas 000 1kg', cantidad: 30, precioBase: 950, precioConDescuento: 807.5, totalItem: 24225 },
      { id: 'prod_fideos', productoId: 'prod_fideos', nombre: 'Fideos Tallarines Don Vicente 500g', cantidad: 3, precioBase: 1400, precioConDescuento: 1190, totalItem: 3570 }
    ]
  }
];

const DEFAULT_COMPANY_CONFIG: CompanyConfig[] = [
  {
    id: 'config_empresa',
    nombre: 'DISTRIBUIDORA MÓVIL',
    telefono: '5491122334455',
    direccion: 'Av. Corrientes 4500, CABA',
    logo: '',
    appActiva: true,
    creadorPassword: 'creadoradmin',
    adminPassword: 'admin'
  }
];

const DEFAULT_TASKS: Task[] = [
  {
    id: 'task_1',
    titulo: 'Cobro urgente y entrega de folletos',
    descripcion: 'Cobrar saldo anterior en Almacén El Sol y entregar catálogo con nuevos precios.',
    fechaLimite: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
    asignadoA: 'vend_carlos',
    completada: false,
    creadaPor: 'Administrador',
    createdAt: new Date().toISOString()
  },
  {
    id: 'task_2',
    titulo: 'Recuento de stock mensual',
    descripcion: 'Hacer el recuento físico de mercadería asignada y notificar discrepancias en el camión.',
    fechaLimite: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0],
    asignadoA: 'todos',
    completada: false,
    creadaPor: 'Administrador',
    createdAt: new Date().toISOString()
  },
  {
    id: 'task_3',
    titulo: 'Enviar reporte de cobranzas',
    descripcion: 'Verificar planillas y cuadrar dinero del día de ayer.',
    fechaLimite: new Date().toISOString().split('T')[0],
    asignadoA: 'vend_maria',
    completada: true,
    completadaPor: 'María Rodríguez',
    creadaPor: 'Administrador',
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  }
];

// Helper to sanitize paths
function filterAndSanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_\-]/g, '');
}

// Client-side Database Engine
class LocalDbService {
  private listeners: { [key: string]: Array<(data: any) => void> } = {};

  // Check if we already populated data, if not load defaults to localStorage
  initialize() {
    this.ensureCollection('listasPrecio', DEFAULT_PRICE_LISTS);
    this.ensureCollection('vendedores', DEFAULT_SELLERS);
    this.ensureCollection('clientes', DEFAULT_CLIENTS);
    this.ensureCollection('productos', DEFAULT_PRODUCTS);
    this.ensureCollection('ventas', DEFAULT_SALES);
    this.ensureCollection('tareas', DEFAULT_TASKS);
    this.ensureCollection('config_empresa', DEFAULT_COMPANY_CONFIG);
  }

  private ensureCollection(key: string, defaultData: any[]) {
    if (!localStorage.getItem(`distribuidor_${key}`)) {
      localStorage.setItem(`distribuidor_${key}`, JSON.stringify(defaultData));
    }
  }

  getCollection<T>(key: string): T[] {
    const data = localStorage.getItem(`distribuidor_${key}`);
    return data ? JSON.parse(data) : [];
  }

  saveCollection<T>(key: string, data: T[]) {
    localStorage.setItem(`distribuidor_${key}`, JSON.stringify(data));
    this.triggerUpdate(key, data);
  }

  subscribe(key: string, callback: (data: any) => void): () => void {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
    
    // Call immediately with current data
    callback(this.getCollection(key));

    // Return unsubscriber
    return () => {
      this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
    };
  }

  private triggerUpdate(key: string, data: any) {
    if (this.listeners[key]) {
      this.listeners[key].forEach(callback => callback(data));
    }
  }
}

export const localDb = new LocalDbService();
localDb.initialize();

// Synchronized Actions Layer
// Direct actions checks: if firebase is enabled, write to firestore + localDb, otherwise write to localDb.
// This gives robust double-reliability in preview frames!

export async function addSellerItem(seller: Omit<Seller, 'id'> & { id?: string }): Promise<string> {
  const finalId = filterAndSanitizeId(seller.id || 'vend_' + Math.random().toString(36).substr(2, 9));
  const newSeller: Seller = {
    id: finalId,
    nombre: seller.nombre,
    telefono: seller.telefono,
    activo: seller.activo,
    password: seller.password || '',
    permissions: seller.permissions || ['dashboard', 'sales', 'settlements', 'catalog', 'clients', 'tasks']
  };

  const list = localDb.getCollection<Seller>('vendedores');
  localDb.saveCollection('vendedores', [...list.filter(s => s.id !== finalId), newSeller]);

  if (isFirebaseEnabled) {
    const path = `vendedores`;
    try {
      await setDoc(doc(db, path, finalId), newSeller);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${path}/${finalId}`);
    }
  }
  return finalId;
}

export async function updateSellerItem(id: string, seller: Partial<Seller>): Promise<void> {
  const list = localDb.getCollection<Seller>('vendedores');
  const index = list.findIndex(s => s.id === id);
  if (index !== -1) {
    const updated = { ...list[index], ...seller };
    list[index] = updated;
    localDb.saveCollection('vendedores', list);

    if (isFirebaseEnabled) {
      const path = `vendedores`;
      try {
        await updateDoc(doc(db, path, id), seller as any);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${path}/${id}`);
      }
    }
  }
}

export async function deleteSellerItem(id: string): Promise<void> {
  const list = localDb.getCollection<Seller>('vendedores');
  localDb.saveCollection('vendedores', list.filter(s => s.id !== id));

  if (isFirebaseEnabled) {
    const path = `vendedores`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${path}/${id}`);
    }
  }
}

export async function addClientItem(client: Omit<Client, 'id'> & { id?: string }): Promise<string> {
  const finalId = filterAndSanitizeId(client.id || 'cli_' + Math.random().toString(36).substr(2, 9));
  const newClient: Client = {
    id: finalId,
    nombre: client.nombre,
    telefono: client.telefono,
    direccion: client.direccion,
    listaPrecioId: client.listaPrecioId
  };

  const list = localDb.getCollection<Client>('clientes');
  localDb.saveCollection('clientes', [...list.filter(c => c.id !== finalId), newClient]);

  if (isFirebaseEnabled) {
    const path = `clientes`;
    try {
      await setDoc(doc(db, path, finalId), newClient);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${path}/${finalId}`);
    }
  }
  return finalId;
}

export async function updateClientItem(id: string, client: Partial<Client>): Promise<void> {
  const list = localDb.getCollection<Client>('clientes');
  const index = list.findIndex(c => c.id === id);
  if (index !== -1) {
    const updated = { ...list[index], ...client };
    list[index] = updated;
    localDb.saveCollection('clientes', list);

    if (isFirebaseEnabled) {
      const path = `clientes`;
      try {
        await updateDoc(doc(db, path, id), client as any);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${path}/${id}`);
      }
    }
  }
}

export async function deleteClientItem(id: string): Promise<void> {
  const list = localDb.getCollection<Client>('clientes');
  localDb.saveCollection('clientes', list.filter(c => c.id !== id));

  if (isFirebaseEnabled) {
    const path = `clientes`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${path}/${id}`);
    }
  }
}

export async function addProductItem(product: Omit<Product, 'id'> & { id?: string }): Promise<string> {
  const finalId = filterAndSanitizeId(product.id || 'prod_' + Math.random().toString(36).substr(2, 9));
  const newProduct: Product = {
    id: finalId,
    nombre: product.nombre,
    codigo: product.codigo,
    precioBase: product.precioBase,
    stockPorVendedor: product.stockPorVendedor,
    stockTotal: product.stockTotal
  };

  const list = localDb.getCollection<Product>('productos');
  localDb.saveCollection('productos', [...list.filter(p => p.id !== finalId), newProduct]);

  if (isFirebaseEnabled) {
    const path = `productos`;
    try {
      await setDoc(doc(db, path, finalId), newProduct);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${path}/${finalId}`);
    }
  }
  return finalId;
}

export async function updateProductItem(id: string, product: Partial<Product>): Promise<void> {
  const list = localDb.getCollection<Product>('productos');
  const index = list.findIndex(p => p.id === id);
  if (index !== -1) {
    const updated = { ...list[index], ...product };
    list[index] = updated;
    localDb.saveCollection('productos', list);

    if (isFirebaseEnabled) {
      const path = `productos`;
      try {
        await updateDoc(doc(db, path, id), product as any);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${path}/${id}`);
      }
    }
  }
}

export async function deleteProductItem(id: string): Promise<void> {
  const list = localDb.getCollection<Product>('productos');
  localDb.saveCollection('productos', list.filter(p => p.id !== id));

  if (isFirebaseEnabled) {
    const path = `productos`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${path}/${id}`);
    }
  }
}

// Massive Price Update (Actualización Masiva de Precios)
export async function bulkPriceUpdateAction(type: 'percentage' | 'fixed', value: number): Promise<void> {
  const list = localDb.getCollection<Product>('productos');
  const updatedList = list.map(prod => {
    let newPrice = prod.precioBase;
    if (type === 'percentage') {
      newPrice = Math.round(prod.precioBase * (1 + value / 100));
    } else {
      newPrice = Math.max(0, prod.precioBase + value);
    }
    return { ...prod, precioBase: newPrice };
  });

  localDb.saveCollection('productos', updatedList);

  if (isFirebaseEnabled) {
    // Perform updates sequentially or via batch to preserve real-time sync with database
    const path = `productos`;
    try {
      const batchList = updatedList;
      for (const prod of batchList) {
        await updateDoc(doc(db, path, prod.id), { precioBase: prod.precioBase });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
}

export async function addPriceListItem(pList: Omit<PriceList, 'id'> & { id?: string }): Promise<string> {
  const finalId = filterAndSanitizeId(pList.id || 'plist_' + Math.random().toString(36).substr(2, 9));
  const newList: PriceList = {
    id: finalId,
    nombre: pList.nombre,
    descuentoPorcentaje: pList.descuentoPorcentaje
  };

  const list = localDb.getCollection<PriceList>('listasPrecio');
  localDb.saveCollection('listasPrecio', [...list.filter(p => p.id !== finalId), newList]);

  if (isFirebaseEnabled) {
    const path = `listasPrecio`;
    try {
      await setDoc(doc(db, path, finalId), newList);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${path}/${finalId}`);
    }
  }
  return finalId;
}

export async function updatePriceListItem(id: string, pList: Partial<PriceList>): Promise<void> {
  const list = localDb.getCollection<PriceList>('listasPrecio');
  const index = list.findIndex(p => p.id === id);
  if (index !== -1) {
    const updated = { ...list[index], ...pList };
    list[index] = updated;
    localDb.saveCollection('listasPrecio', list);

    if (isFirebaseEnabled) {
      const path = `listasPrecio`;
      try {
        await updateDoc(doc(db, path, id), pList as any);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${path}/${id}`);
      }
    }
  }
}

export async function deletePriceListItem(id: string): Promise<void> {
  const list = localDb.getCollection<PriceList>('listasPrecio');
  localDb.saveCollection('listasPrecio', list.filter(p => p.id !== id));

  if (isFirebaseEnabled) {
    const path = `listasPrecio`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${path}/${id}`);
    }
  }
}

export async function createSaleTransaction(sale: Omit<Sale, 'id' | 'numeroComprobante'>): Promise<string> {
  const idStr = 'sale_' + Math.random().toString(36).substr(2, 9);
  const salesList = localDb.getCollection<Sale>('ventas');
  
  // Calculate voucher number (V-0001 format)
  const lastIndex = salesList.length;
  const numStr = String(lastIndex + 1).padStart(4, '0');
  const voucherNum = `V-${numStr}`;

  const newSale: Sale = {
    ...sale,
    id: idStr,
    numeroComprobante: voucherNum,
    fecha: new Date().toISOString()
  };

  // Add sale records
  localDb.saveCollection('ventas', [newSale, ...salesList]);

  // Adjust product stocks for that seller in real time
  const products = localDb.getCollection<Product>('productos');
  for (const item of sale.articulos) {
    const pIndex = products.findIndex(p => p.id === item.productoId);
    if (pIndex !== -1) {
      const prod = products[pIndex];
      const currentSellerStock = prod.stockPorVendedor[sale.vendedorId] || 0;
      const updatedSellerStock = Math.max(0, currentSellerStock - item.cantidad);
      const updatedStockPorVendedor = {
        ...prod.stockPorVendedor,
        [sale.vendedorId]: updatedSellerStock
      };
      
      // Keep total stock up-to-date as the aggregate of all stocks (plus general warehouse)
      const updatedStockTotal = Math.max(0, prod.stockTotal - item.cantidad);

      products[pIndex] = {
        ...prod,
        stockPorVendedor: updatedStockPorVendedor,
        stockTotal: updatedStockTotal
      };

      // Also fire write for product updates
      if (isFirebaseEnabled) {
        try {
          await updateDoc(doc(db, 'productos', prod.id), {
            stockPorVendedor: updatedStockPorVendedor,
            stockTotal: updatedStockTotal
          });
        } catch (e) {
          console.error("Failed to update stock in firestore", e);
        }
      }
    }
  }
  localDb.saveCollection('productos', products);

  if (isFirebaseEnabled) {
    const path = `ventas`;
    try {
      await setDoc(doc(db, path, idStr), newSale);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${path}/${idStr}`);
    }
  }
  return idStr;
}

export async function settleSaleMoney(saleId: string, observ: string = '', markSettle = true): Promise<void> {
  const salesList = localDb.getCollection<Sale>('ventas');
  const sIndex = salesList.findIndex(s => s.id === saleId);
  if (sIndex !== -1) {
    salesList[sIndex] = {
      ...salesList[sIndex],
      dineroArreglado: markSettle,
      fechaArreglo: markSettle ? new Date().toISOString() : undefined,
      observaciones: observ
    };
    localDb.saveCollection('ventas', salesList);

    if (isFirebaseEnabled) {
      const path = `ventas`;
      try {
        await updateDoc(doc(db, path, saleId), {
          dineroArreglado: markSettle,
          fechaArreglo: markSettle ? new Date().toISOString() : null,
          observaciones: observ
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${path}/${saleId}`);
      }
    }
  }
}

export async function addTaskItem(task: Omit<Task, 'id' | 'createdAt' | 'completada'> & { id?: string }): Promise<string> {
  const finalId = filterAndSanitizeId(task.id || 'task_' + Math.random().toString(36).substr(2, 9));
  const newTask: Task = {
    ...task,
    id: finalId,
    completada: false,
    createdAt: new Date().toISOString()
  };

  const list = localDb.getCollection<Task>('tareas');
  localDb.saveCollection('tareas', [...list.filter(t => t.id !== finalId), newTask]);

  if (isFirebaseEnabled) {
    const path = `tareas`;
    try {
      await setDoc(doc(db, path, finalId), newTask);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${path}/${finalId}`);
    }
  }
  return finalId;
}

export async function toggleTaskCompletion(id: string, completedBySellerName?: string): Promise<void> {
  const list = localDb.getCollection<Task>('tareas');
  const index = list.findIndex(t => t.id === id);
  if (index !== -1) {
    const currentStatus = list[index].completada;
    const patch: any = {
      completada: !currentStatus,
      completadaPor: !currentStatus ? (completedBySellerName || 'Administrador') : null
    };
    list[index] = { ...list[index], ...patch };
    localDb.saveCollection('tareas', list);

    if (isFirebaseEnabled) {
      const path = `tareas`;
      try {
        await updateDoc(doc(db, path, id), patch);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `${path}/${id}`);
      }
    }
  }
}

export async function deleteTaskItem(id: string): Promise<void> {
  const list = localDb.getCollection<Task>('tareas');
  localDb.saveCollection('tareas', list.filter(t => t.id !== id));

  if (isFirebaseEnabled) {
    const path = `tareas`;
    try {
      await deleteDoc(doc(db, path, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${path}/${id}`);
    }
  }
}

export async function updateCompanyConfig(config: Partial<CompanyConfig>): Promise<void> {
  const list = localDb.getCollection<CompanyConfig>('config_empresa');
  const existing = list[0] || DEFAULT_COMPANY_CONFIG[0];
  const updated = { ...existing, ...config };
  localDb.saveCollection('config_empresa', [updated]);

  if (isFirebaseEnabled) {
    const path = `config_empresa`;
    try {
      await setDoc(doc(db, path, 'config_empresa'), updated);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${path}/config_empresa`);
    }
  }
}

export async function clearAllDatabaseData(): Promise<void> {
  // 1) Clear local storage cache
  localDb.saveCollection('clientes', []);
  localDb.saveCollection('productos', []);
  localDb.saveCollection('ventas', []);
  localDb.saveCollection('tareas', []);
  localDb.saveCollection('vendedores', []);
  localDb.saveCollection('listasPrecio', DEFAULT_PRICE_LISTS);

  // 2) If Firebase is enabled, fetch all documents in each collection and delete them in batches
  if (isFirebaseEnabled) {
    const collectionsToClear = ['clientes', 'productos', 'ventas', 'tareas', 'vendedores', 'listasPrecio'];
    for (const colName of collectionsToClear) {
      try {
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        const batch = writeBatch(db);
        snapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
        console.log(`Firestore collection '${colName}' cleared successfully.`);
      } catch (err) {
        console.error(`Error clearing Firestore collection '${colName}':`, err);
        throw new Error(`Error al borrar la colección ${colName} en Firestore: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Re-seed default price lists into Firebase
    for (const list of DEFAULT_PRICE_LISTS) {
      try {
        await setDoc(doc(db, 'listasPrecio', list.id), list);
      } catch (err) {
        console.error("Error re-seeding default price lists in Firebase:", err);
      }
    }
  }
}

// React Custom Hook to Sync and Listen in Real-time for all modules!
// Installs onSnapshot listeners when isFirebaseEnabled matches.
export function subscribeToAllCollections(onUpdate: (data: {
  vendedores: Seller[];
  clientes: Client[];
  productos: Product[];
  listasPrecio: PriceList[];
  ventas: Sale[];
  tareas: Task[];
  config_empresa: CompanyConfig[];
}) => void) {
  
  const current: {
    vendedores: Seller[];
    clientes: Client[];
    productos: Product[];
    listasPrecio: PriceList[];
    ventas: Sale[];
    tareas: Task[];
    config_empresa: CompanyConfig[];
  } = {
    vendedores: localDb.getCollection('vendedores'),
    clientes: localDb.getCollection('clientes'),
    productos: localDb.getCollection('productos'),
    listasPrecio: localDb.getCollection('listasPrecio'),
    ventas: localDb.getCollection('ventas'),
    tareas: localDb.getCollection('tareas'),
    config_empresa: localDb.getCollection('config_empresa')
  };

  const dispatch = () => {
    onUpdate({ ...current });
  };

  // 1) Bind Local Fallback listeners
  const unsubLocalVendedores = localDb.subscribe('vendedores', (data) => { current.vendedores = data; dispatch(); });
  const unsubLocalClientes = localDb.subscribe('clientes', (data) => { current.clientes = data; dispatch(); });
  const unsubLocalProductos = localDb.subscribe('productos', (data) => { current.productos = data; dispatch(); });
  const unsubLocalListas = localDb.subscribe('listasPrecio', (data) => { current.listasPrecio = data; dispatch(); });
  const unsubLocalVentas = localDb.subscribe('ventas', (data) => { current.ventas = data; dispatch(); });
  const unsubLocalTareas = localDb.subscribe('tareas', (data) => { current.tareas = data; dispatch(); });
  const unsubLocalConfig = localDb.subscribe('config_empresa', (data) => { current.config_empresa = data; dispatch(); });

  let unsubFirebaseList: Array<() => void> = [];

  // 2) Bind Real Firestore snap listeners if supported!
  if (isFirebaseEnabled) {
    console.log("Firebase is configured! Subscribing to real-time firestore collections...");
    const collectionsToListen = ['vendedores', 'clientes', 'productos', 'listasPrecio', 'ventas', 'tareas', 'config_empresa'];
    
    collectionsToListen.forEach((colKey) => {
      try {
        const unsub = onSnapshot(collection(db, colKey), (snapshot) => {
          const list: any[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ ...docSnap.data(), id: docSnap.id });
          });
          
          if (list.length > 0) {
            // Update local snapshot cache
            localStorage.setItem(`distribuidor_${colKey}`, JSON.stringify(list));
            (current as any)[colKey] = list;
            dispatch();
          }
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, colKey);
        });
        unsubFirebaseList.push(unsub);
      } catch (err) {
        console.warn(`Firestore subscription failed for '${colKey}', using memory state.`, err);
      }
    });
  }

  // Unified Tear down
  return () => {
    unsubLocalVendedores();
    unsubLocalClientes();
    unsubLocalProductos();
    unsubLocalListas();
    unsubLocalVentas();
    unsubLocalTareas();
    unsubLocalConfig();
    unsubFirebaseList.forEach(unsub => unsub());
  };
}

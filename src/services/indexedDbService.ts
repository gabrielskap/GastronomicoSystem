/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const DB_NAME = 'MenuMesaOfflineDB';
const DB_VERSION = 1;

export interface UnsyncedOrder {
  id: string; // ID local temporário
  table_id: string;
  comanda_id: string | null;
  total: number;
  items: {
    product_id: string | null;
    name: string;
    price: number;
    quantity: number;
    extras: { name: string; price: number }[];
    observation?: string;
    customer_name: string;
  }[];
  createdAt: string;
}

export interface UnsyncedCall {
  id: string; // ID local temporário
  tableId: string;
  reason: string;
  customNote?: string;
  createdAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('unsynced_orders')) {
        db.createObjectStore('unsynced_orders', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('unsynced_calls')) {
        db.createObjectStore('unsynced_calls', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

export async function saveUnsyncedOrder(order: UnsyncedOrder): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('unsynced_orders', 'readwrite');
      const store = transaction.objectStore('unsynced_orders');
      const request = store.put(order);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB: Erro ao salvar pedido offline:', err);
  }
}

export async function getUnsyncedOrders(): Promise<UnsyncedOrder[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('unsynced_orders', 'readonly');
      const store = transaction.objectStore('unsynced_orders');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB: Erro ao buscar pedidos offline:', err);
    return [];
  }
}

export async function deleteUnsyncedOrder(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('unsynced_orders', 'readwrite');
      const store = transaction.objectStore('unsynced_orders');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB: Erro ao deletar pedido offline:', err);
  }
}

export async function saveUnsyncedCall(call: UnsyncedCall): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('unsynced_calls', 'readwrite');
      const store = transaction.objectStore('unsynced_calls');
      const request = store.put(call);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB: Erro ao salvar chamado offline:', err);
  }
}

export async function getUnsyncedCalls(): Promise<UnsyncedCall[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('unsynced_calls', 'readonly');
      const store = transaction.objectStore('unsynced_calls');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB: Erro ao buscar chamados offline:', err);
    return [];
  }
}

export async function deleteUnsyncedCall(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('unsynced_calls', 'readwrite');
      const store = transaction.objectStore('unsynced_calls');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB: Erro ao deletar chamado offline:', err);
  }
}

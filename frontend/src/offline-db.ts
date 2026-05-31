// IndexedDB offline storage for WMS PDA
const DB_NAME = "wms-offline";
const DB_VERSION = 1;

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("products")) {
        db.createObjectStore("products", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("employees")) {
        db.createObjectStore("employees", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("outboundQueue")) {
        const s = db.createObjectStore("outboundQueue", { keyPath: "localId", autoIncrement: true });
        s.createIndex("status", "status");
      }
      if (!db.objectStoreNames.contains("inboundQueue")) {
        const s = db.createObjectStore("inboundQueue", { keyPath: "localId", autoIncrement: true });
        s.createIndex("status", "status");
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

function txStore(storeName: string, mode: IDBTransactionMode = "readonly") {
  return openDB().then((db) => {
    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  });
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Products cache (max 2000) ───────────────────────────────────────────────

export async function cacheProducts(products: any[]) {
  const store = await txStore("products", "readwrite");
  for (const p of products.slice(0, 2000)) {
    store.put(p);
  }
}

export async function getCachedProduct(id: string): Promise<any | null> {
  const store = await txStore("products");
  return promisify(store.get(id)).then((r) => r ?? null);
}

export async function searchCachedProducts(query: string): Promise<any[]> {
  const store = await txStore("products");
  const all: any[] = await promisify(store.getAll());
  if (!query) return all.slice(0, 50);
  const q = query.toLowerCase();
  return all.filter(
    (p) =>
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.barcode?.toLowerCase().includes(q) ||
      p.qr_uuid?.toLowerCase().includes(q)
  );
}

// ─── Employees cache ─────────────────────────────────────────────────────────

export async function cacheEmployees(employees: any[]) {
  const store = await txStore("employees", "readwrite");
  for (const e of employees) {
    store.put(e);
  }
}

export async function getCachedEmployee(qrCode: string): Promise<any | null> {
  const store = await txStore("employees");
  const all: any[] = await promisify(store.getAll());
  return all.find((e) => e.qr_code === qrCode || e.employee_no === qrCode) ?? null;
}

// ─── Outbound queue ──────────────────────────────────────────────────────────

export async function enqueueOutbound(order: any): Promise<void> {
  const store = await txStore("outboundQueue", "readwrite");
  const count: number = await promisify(store.count());
  if (count >= 500) throw new Error("离线队列已满（500条），请先联网同步");
  store.add({ ...order, status: "pending", createdAt: Date.now() });
}

export async function getPendingOutbound(): Promise<any[]> {
  const store = await txStore("outboundQueue");
  const all: any[] = await promisify(store.getAll());
  return all.filter((r) => r.status === "pending");
}

export async function markOutboundSynced(localId: number): Promise<void> {
  const store = await txStore("outboundQueue", "readwrite");
  const item: any = await promisify(store.get(localId));
  if (item) store.put({ ...item, status: "synced" });
}

export async function getOutboundQueueCount(): Promise<number> {
  const store = await txStore("outboundQueue");
  const all: any[] = await promisify(store.getAll());
  return all.filter((r) => r.status === "pending").length;
}

// ─── Inbound queue ───────────────────────────────────────────────────────────

export async function enqueueInbound(order: any): Promise<void> {
  const store = await txStore("inboundQueue", "readwrite");
  const count: number = await promisify(store.count());
  if (count >= 500) throw new Error("离线队列已满（500条），请先联网同步");
  store.add({ ...order, status: "pending", createdAt: Date.now() });
}

export async function getPendingInbound(): Promise<any[]> {
  const store = await txStore("inboundQueue");
  const all: any[] = await promisify(store.getAll());
  return all.filter((r) => r.status === "pending");
}

export async function markInboundSynced(localId: number): Promise<void> {
  const store = await txStore("inboundQueue", "readwrite");
  const item: any = await promisify(store.get(localId));
  if (item) store.put({ ...item, status: "synced" });
}

export async function getInboundQueueCount(): Promise<number> {
  const store = await txStore("inboundQueue");
  const all: any[] = await promisify(store.getAll());
  return all.filter((r) => r.status === "pending").length;
}

// ─── Sync all pending queues ─────────────────────────────────────────────────

export async function syncQueues(
  postOutbound: (order: any) => Promise<any>,
  postInbound: (order: any) => Promise<any>
): Promise<{ outbound: number; inbound: number; errors: string[] }> {
  const errors: string[] = [];
  let outbound = 0;
  let inbound = 0;

  for (const item of await getPendingOutbound()) {
    try {
      await postOutbound(item);
      await markOutboundSynced(item.localId);
      outbound++;
    } catch (e: any) {
      errors.push(`出库 #${item.localId}: ${e.message}`);
    }
  }

  for (const item of await getPendingInbound()) {
    try {
      await postInbound(item);
      await markInboundSynced(item.localId);
      inbound++;
    } catch (e: any) {
      errors.push(`入库 #${item.localId}: ${e.message}`);
    }
  }

  return { outbound, inbound, errors };
}

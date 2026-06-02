import { showToast } from '../utils/toast';

// API 基础地址：优先环境变量，其次当前域名（代理模式兼容）
const API_BASE = (window as any).__WMS_API_BASE__ || window.location.origin;

// ─── 通用认证下载（fetch+blob 替代 window.open）───
async function authDownload(url: string, filename?: string) {
  const token = localStorage.getItem("wms_token") || localStorage.getItem("auth_token");
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `下载失败 HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename || url.split("/").pop() || "download";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

// ─── 认证文件上传（FormData + token）───
async function authUpload(url: string, file: File): Promise<any> {
  const token = localStorage.getItem("wms_token") || localStorage.getItem("auth_token");
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `上传失败 HTTP ${res.status}`);
  }
  return res.json();
}

async function req<T = any>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem("wms_token") || localStorage.getItem("auth_token");
  const res = await fetch(`${API_BASE}/api${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `HTTP ${res.status}`);
  }
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("image") || ct.includes("zip")) return res as any;
  return res.json();
}

export const api = {
  // ─── 商品 ───
  getProducts: (p = 1, s = "", pg = 20, warehouseId = "") => req(`/products?page=${p}&size=${pg}&search=${encodeURIComponent(s)}${warehouseId ? `&warehouse_id=${warehouseId}` : ""}`),
  getProduct: (id: string) => req(`/products/${id}`),
  getNextSku: (category: string, name: string = "") => req(`/products/next-sku?category=${encodeURIComponent(category)}&name=${encodeURIComponent(name)}`),
  getProductInvoice: (id: string) => req(`/products/${id}/invoice`),
  createProduct: (d: any) => req("/products", { method: "POST", body: JSON.stringify(d) }),
  updateProduct: (id: string, d: any) => req(`/products/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteProduct: (id: string) => req(`/products/${id}`, { method: "DELETE" }),

  // ─── 库位 ───
  getLocations: () => req("/locations"),
  getLocationHistory: () => req("/locations"),
  createLocation: (d: any) => req("/locations", { method: "POST", body: JSON.stringify(d) }),
  updateLocation: (id: string, d: any) => req(`/locations/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteLocation: (id: string) => req(`/locations/${id}`, { method: "DELETE" }),

  // ─── 供应商 ───
  getSuppliers: (search = "") => req(`/suppliers?search=${encodeURIComponent(search)}`),
  createSupplier: (d: any) => req("/suppliers", { method: "POST", body: JSON.stringify(d) }),
  updateSupplier: (id: string, d: any) => req(`/suppliers/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteSupplier: (id: string) => req(`/suppliers/${id}`, { method: "DELETE" }),

  // ─── 员工 ───
  getEmployees: (search = "") => req(`/employees?search=${encodeURIComponent(search)}`),
  getEmployee: (id: string) => req(`/employees/${id}`),
  getNextEmployeeNo: (position: string, name: string = "") => req(`/employees/next-no?position=${encodeURIComponent(position)}&name=${encodeURIComponent(name)}`),
  createEmployee: (d: any) => req("/employees", { method: "POST", body: JSON.stringify(d) }),
  updateEmployee: (id: string, d: any) => req(`/employees/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteEmployee: (id: string) => req(`/employees/${id}`, { method: "DELETE" }),
  claimItem: (d: any) => req("/employees/claim", { method: "POST", body: JSON.stringify(d) }),
  getEmployeeQR: async (eid: string) => {
    const token = localStorage.getItem("wms_token") || localStorage.getItem("auth_token");
    const res = await fetch(`${API_BASE}/api/employees/${eid}/qrcode`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("二维码生成失败");
    return res.blob();
  },

  // ─── 库存 ───
  getInventory: () => req("/inventory"),
  updateInventory: (id: string, d: any) => req(`/inventory/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  getAlerts: () => req("/inventory/alerts"),
  adjustInventory: (d: any) => req("/inventory/adjust", { method: "POST", body: JSON.stringify(d) }),

  // ─── 入库 ───
  getInbound: () => req("/inbound"),
  createInbound: (d: any) => req("/inbound", { method: "POST", body: JSON.stringify(d) }),
  completeInbound: (id: string) => req(`/inbound/${id}/complete`, { method: "PUT" }),

  // ─── 出库 ───
  getOutbound: () => req("/outbound"),
  createOutbound: (d: any) => req("/outbound", { method: "POST", body: JSON.stringify(d) }),
  completeOutbound: (id: string) => req(`/outbound/${id}/complete`, { method: "PUT" }),

  // ─── 发票（增强版）───
  getInvoices: (page = 1, size = 20, search = "") =>
    req(`/invoices?page=${page}&size=${size}&search=${encodeURIComponent(search)}`),
  createInvoice: (d: any) => req("/invoices", { method: "POST", body: JSON.stringify(d) }),
  updateInvoice: (id: string, d: any) => req(`/invoices/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteInvoice: (id: string) => req(`/invoices/${id}`, { method: "DELETE" }),

  // 发票上传
  uploadFile: async (file: File) => {
    const form = new FormData(); form.append('file', file);
    const res = await fetch(`${API_BASE}/api/invoices/upload`, { method: 'POST', body: form });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  // 发票解析（暂为占位，后续接入解析引擎后启用）
  parseInvoiceFile: (filePath: string, filename: string, source = 'upload') =>
    req('/invoices/parse', { method: 'POST', body: JSON.stringify({ file_path: filePath, filename, source }) }),
  // 分类
  // TODO: /invoice-classifier/process 路由需在 invoice_classifier 模块中注册后方可使用
  classifyInvoice: (invoice: any) =>
    req('/invoice-classifier/process', { method: 'POST', body: JSON.stringify({ invoice }) }),
  // 自动对账
  autoMatchInvoice: (invoice: any) =>
    req('/invoice-bridge/auto-match', { method: 'POST', body: JSON.stringify({ invoice }) }),
  // 稽核纠错
  auditInvoices: () => req('/invoice-bridge/audit', { method: 'POST' }),
  applyAuditFix: (fixes: any[]) => req('/invoice-bridge/audit/fix', { method: 'POST', body: JSON.stringify({ fixes }) }),
  // 关联入库单
  reconcileInvoice: (invoiceNumber: string, inboundId: string) =>
    req('/invoice-bridge/reconcile', { method: 'POST', body: JSON.stringify({ invoice_number: invoiceNumber, inbound_id: inboundId }) }),
  // 邮箱配置
  getEmailConfig: () => req('/invoice-collector/email/config'),
  setEmailConfig: (cfg: any) => req('/invoice-collector/email/config', { method: 'POST', body: JSON.stringify(cfg) }),

  // ─── 导出（认证下载 + Toast提示）───
  exportProducts: async () => {
    await authDownload(`${API_BASE}/api/import/export/products`, "商品列表.xlsx");
    showToast("导出成功");
  },
  exportSuppliers: async () => {
    await authDownload(`${API_BASE}/api/import/export/suppliers`, "供应商列表.xlsx");
    showToast("导出成功");
  },
  exportEmployees: async () => {
    await authDownload(`${API_BASE}/api/import/export/employees`, "员工列表.xlsx");
    showToast("导出成功");
  },
  exportInventory: async () => {
    await authDownload(`${API_BASE}/api/import/export/inventory`, "库存列表.xlsx");
    showToast("导出成功");
  },

  // ─── 模板下载 ───
  downloadTemplate: async (type: 'main-data' | 'employees' | 'orders' | 'master-products' | 'master-suppliers' | 'master-employees') => {
    const filenameMap: Record<string, string> = {
      'main-data': '主数据导入模板.xlsx',
      'employees': '员工导入模板.xlsx',
      'orders': '订单导入模板.xlsx',
      'master-products': '基础商品模板.xlsx',
      'master-suppliers': '基础供应商模板.xlsx',
      'master-employees': '基础员工模板.xlsx',
    };
    await authDownload(`${API_BASE}/api/import/template/${type}`, filenameMap[type] || '导入模板.xlsx');
  },

  // ─── 通用导入（带认证）───
  importMainData: (file: File) => authUpload(`${API_BASE}/api/import/main-data`, file),
  importEmployees: (file: File) => authUpload(`${API_BASE}/api/import/employees`, file),
  importOrders: (file: File) => authUpload(`${API_BASE}/api/import/orders`, file),
  // 别名：供页面直接调用
  uploadEmployees: (file: File) => authUpload(`${API_BASE}/api/import/employees`, file),
  downloadEmployeeTemplate: () => (api as any).downloadTemplate('employees'),
  uploadOrders: (file: File) => authUpload(`${API_BASE}/api/import/orders`, file),
  downloadOrderTemplate: () => (api as any).downloadTemplate('orders'),

  // ─── 面板 ───
  getDashboard: () => req("/dashboard/summary"),
  getTrends: () => req("/dashboard/trends"),

  // ─── 仓库 ───
  getWarehouses: () => req("/warehouses/all"),
  createWarehouse: (d: any) => req("/warehouses", { method: "POST", body: JSON.stringify(d) }),
  updateWarehouse: (id: string, d: any) => req(`/warehouses/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteWarehouse: (id: string) => req(`/warehouses/${id}`, { method: "DELETE" }),

  // ─── 二维码 ───
  getProductQR: async (pid: string) => {
    const token = localStorage.getItem("wms_token") || localStorage.getItem("auth_token");
    const res = await fetch(`${API_BASE}/api/barcode/qrcode/product/${pid}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ size: 300, format: "png" }),
    });
    if (!res.ok) throw new Error("二维码生成失败");
    return res.blob();
  },
  getProductByQr: async (qrText: string) => {
    // PDA扫码查商品：提取ID后调getProduct
    const id = qrText.replace("QR-PROD-", "").replace("QR-", "");
    return req(`/products/${id}`);
  },
  getEmployeeByQr: async (qrText: string) => {
    // PDA扫码查员工：按qr_code搜索
    return req(`/employees?search=${encodeURIComponent(qrText)}`).then((r: any) => {
      const items = r.items || [];
      return items.find((e: any) => e.qr_code === qrText) || items[0] || null;
    });
  },
  batchQR: async (items: { qr_text: string; filename: string }[]) => {
    const token = localStorage.getItem("wms_token") || localStorage.getItem("auth_token");
    const res = await fetch(`${API_BASE}/api/barcode/qrcode/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) throw new Error("二维码生成失败");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "qrcodes.zip";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  pdaLogin: (qr: string) => req("/auth/pda-login", { method: "POST", body: JSON.stringify({ qr_code: qr }) }),
  pdaLogout: (token: string) => req("/auth/pda-logout", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }),
  pdaVerify: (token: string) => req("/auth/pda-verify", { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }),

  // ─── 基础数据（master_data schema）───
  masterProducts: (search = "") => req(`/master/products?search=${encodeURIComponent(search)}`),
  createMasterProduct: (d: any) => req("/master/products", { method: "POST", body: JSON.stringify(d) }),
  updateMasterProduct: (id: string, d: any) => req(`/master/products/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteMasterProduct: (id: string) => req(`/master/products/${id}`, { method: "DELETE" }),
  masterSuppliers: (search = "") => req(`/master/suppliers?search=${encodeURIComponent(search)}`),
  createMasterSupplier: (d: any) => req("/master/suppliers", { method: "POST", body: JSON.stringify(d) }),
  updateMasterSupplier: (id: string, d: any) => req(`/master/suppliers/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteMasterSupplier: (id: string) => req(`/master/suppliers/${id}`, { method: "DELETE" }),
  masterEmployees: (search = "") => req(`/master/employees?search=${encodeURIComponent(search)}`),
  createMasterEmployee: (d: any) => req("/master/employees", { method: "POST", body: JSON.stringify(d) }),
  updateMasterEmployee: (id: string, d: any) => req(`/master/employees/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteMasterEmployee: (id: string) => req(`/master/employees/${id}`, { method: "DELETE" }),

  // ─── 基础数据导入导出（认证修复）───
  exportMasterProducts: async () => {
    await authDownload(`${API_BASE}/api/import/export/master-products`, "基础商品列表.xlsx");
    showToast("导出成功");
  },
  exportMasterSuppliers: async () => {
    await authDownload(`${API_BASE}/api/import/export/master-suppliers`, "基础供应商列表.xlsx");
    showToast("导出成功");
  },
  exportMasterEmployees: async () => {
    await authDownload(`${API_BASE}/api/import/export/master-employees`, "基础员工列表.xlsx");
    showToast("导出成功");
  },
  uploadMasterProducts: (file: File) => authUpload(`${API_BASE}/api/import/import/master-products`, file),
  uploadMasterSuppliers: (file: File) => authUpload(`${API_BASE}/api/import/import/master-suppliers`, file),
  uploadMasterEmployees: (file: File) => authUpload(`${API_BASE}/api/import/import/master-employees`, file),

  // ─── 数据备份 ───
  backupCreate: () => req("/backup/create", { method: "POST" }),
  backupList: () => req("/backup/list"),
  backupDownload: async (filename: string) => {
    await authDownload(`${API_BASE}/api/backup/download/${filename}`, filename);
  },
  backupDelete: (filename: string) => req(`/backup/${filename}`, { method: "DELETE" }),
  backupRestore: async (file: File) => {
    const form = new FormData(); form.append("file", file);
    const token = localStorage.getItem("wms_token") || localStorage.getItem("auth_token");
    const res = await fetch(`${API_BASE}/api/backup/restore`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  backupStats: () => req("/backup/stats"),

  // ─── 劳保用品 ───
  // 用品目录
  laborSupplies: (p = 1, s = 20, q = "") => req(`/labor/supplies?page=${p}&size=${s}&search=${q}`),
  laborSuppliesAll: () => req("/labor/supplies/all"),
  laborSupplyGet: (id: string) => req(`/labor/supplies/${id}`),
  laborSupplyCreate: (d: any) => req("/labor/supplies", { method: "POST", body: JSON.stringify(d) }),
  laborSupplyUpdate: (id: string, d: any) => req(`/labor/supplies/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  laborSupplyDelete: (id: string) => req(`/labor/supplies/${id}`, { method: "DELETE" }),
  laborLowStock: () => req("/labor/supplies/low-stock"),
  laborInitGB: () => req("/labor/supplies/init-gb", { method: "POST" }),
  // 岗位配置
  laborConfigs: (p = 1, s = 20, q = "") => req(`/labor/configs?page=${p}&size=${s}&search=${q}`),
  laborConfigsAll: () => req("/labor/configs/all"),
  laborConfigsByPosition: (pos: string) => req(`/labor/configs/position/${pos}`),
  laborConfigGet: (id: string) => req(`/labor/configs/${id}`),
  laborConfigCreate: (d: any) => req("/labor/configs", { method: "POST", body: JSON.stringify(d) }),
  laborConfigUpdate: (id: string, d: any) => req(`/labor/configs/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  laborConfigDelete: (id: string) => req(`/labor/configs/${id}`, { method: "DELETE" }),
  // 领取
  laborDistributions: (p = 1, s = 20, q = "") => req(`/labor/distributions?page=${p}&size=${s}&search=${q}`),
  laborDistribute: (d: any) => req("/labor/distribute", { method: "POST", body: JSON.stringify(d) }),
  laborPending: (pos = "") => req(`/labor/pending?position=${pos}`),

  // ─── 通知 ───
  getNotifications: (p = 1, s = 20, unread = false) => req(`/notifications?page=${p}&size=${s}&unread_only=${unread}`),
  getUnreadCount: () => req("/notifications/unread-count"),
  markNotificationRead: (id: string) => req(`/notifications/${id}/read`, { method: "PUT" }),
  markAllNotificationsRead: () => req("/notifications/mark-all-read", { method: "POST" }),

  // ─── 基础数据配置 ───
  getMasterConfig: (type: string) => req(`/master-config/${type}`),
  addMasterConfig: (type: string, name: string) => req(`/master-config/${type}`, { method: "POST", body: JSON.stringify({ name }) }),
  deleteMasterConfig: (type: string, name: string) => req(`/master-config/${type}/${encodeURIComponent(name)}`, { method: "DELETE" }),
};

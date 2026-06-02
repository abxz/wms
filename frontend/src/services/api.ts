// API 基础地址：优先环境变量，其次当前域名（代理模式兼容）
const API_BASE = (window as any).__WMS_API_BASE__ || window.location.origin;

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
  getProductInvoice: (id: string) => req(`/products/${id}/invoice`),
  createProduct: (d: any) => req("/products", { method: "POST", body: JSON.stringify(d) }),
  updateProduct: (id: string, d: any) => req(`/products/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteProduct: (id: string) => req(`/products/${id}`, { method: "DELETE" }),

  // ─── 库位 ───
  getLocations: () => req("/locations"),
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
  createEmployee: (d: any) => req("/employees", { method: "POST", body: JSON.stringify(d) }),
  updateEmployee: (id: string, d: any) => req(`/employees/${id}`, { method: "PUT", body: JSON.stringify(d) }),
  deleteEmployee: (id: string) => req(`/employees/${id}`, { method: "DELETE" }),
  claimItem: (d: any) => req("/employees/claim", { method: "POST", body: JSON.stringify(d) }),

  // ─── 库存 ───
  getInventory: () => req("/inventory"),
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

  // ─── 导出 ───
  exportProducts: () => window.open(`${API_BASE}/api/import/export/products`, "_blank"),
  exportSuppliers: () => window.open(`${API_BASE}/api/import/export/suppliers`, "_blank"),
  exportEmployees: () => window.open(`${API_BASE}/api/import/export/employees`, "_blank"),
  exportInventory: () => window.open(`${API_BASE}/api/import/export/inventory`, "_blank"),

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
    a.click();
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

  // ─── 基础数据导入导出 ───
  exportMasterProducts: () => window.open(`${API_BASE}/api/import/export/master-products`, "_blank"),
  exportMasterSuppliers: () => window.open(`${API_BASE}/api/import/export/master-suppliers`, "_blank"),
  exportMasterEmployees: () => window.open(`${API_BASE}/api/import/export/master-employees`, "_blank"),
  uploadMasterProducts: async (file: File) => {
    const form = new FormData(); form.append("file", file);
    const res = await fetch(`${API_BASE}/api/import/import/master-products`, { method: "POST", body: form });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  uploadMasterSuppliers: async (file: File) => {
    const form = new FormData(); form.append("file", file);
    const res = await fetch(`${API_BASE}/api/import/import/master-suppliers`, { method: "POST", body: form });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  uploadMasterEmployees: async (file: File) => {
    const form = new FormData(); form.append("file", file);
    const res = await fetch(`${API_BASE}/api/import/import/master-employees`, { method: "POST", body: form });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // ─── 数据备份 ───
  backupCreate: () => req("/backup/create", { method: "POST" }),
  backupList: () => req("/backup/list"),
  backupDownload: (filename: string) => window.open(`${API_BASE}/api/backup/download/${filename}`, "_blank"),
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
};

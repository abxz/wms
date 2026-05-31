// ─── 数据模型 ──────────────────────────────
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  unit: string;
  price: number;
  barcode: string;
  supplier_id: string;
  location_id: string;
  min_stock: number;
  max_stock: number;
  remark: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  quantity: number;
  location_id: string;
  updated_at?: string;
}

export interface InventoryAlert {
  product_id: string;
  product_name: string;
  quantity: number;
  min_stock: number;
  max_stock: number;
  level: 'low' | 'high' | 'normal';
}

export interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
  product_name?: string;
}

export interface InboundOrder {
  id: string;
  order_no: string;
  items: OrderItem[];
  supplier_id: string;
  invoice_id: string;
  total_amount: number;
  status: 'pending' | 'completed' | 'cancelled';
  remark: string;
  created_at?: string;
}

export interface OutboundOrder {
  id: string;
  order_no: string;
  items: OrderItem[];
  type: 'normal' | 'employee_claim';
  employee_id: string;
  status: 'pending' | 'completed' | 'cancelled';
  remark: string;
  created_at?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  remark: string;
  active: boolean;
  created_at?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;       // 发票号码（后端字段）
  invoice_code: string;         // 发票代码
  invoice_type: string;         // 数电票/专票/普票
  issue_date: string;           // 开票日期
  total_amount: number;         // 价税合计
  tax_amount: number;           // 税额
  seller_name: string;          // 销售方名称
  seller_tax_no: string;        // 销方税号
  buyer_name: string;           // 购买方名称
  buyer_tax_no: string;         // 购方税号
  file_path: string;            // 原文件路径
  file_hash: string;            // SHA256
  source: string;               // upload/email/feishu/batch
  status: string;               // pending/reconciled/duplicate
  confidence: number;           // 解析置信度 0-100
  wms_inbound_id: string;       // 关联WMS入库单ID
  supplier_id: string;          // 关联供应商ID
  remark: string;
  created_at?: string;
  updated_at?: string;
  // 兼容旧字段（过渡期保留）
  invoice_no?: string;
  amount?: number;
  inbound_order_id?: string;
  date?: string;
  image_path?: string;
}

export interface Employee {
  id: string;
  name: string;
  employee_no: string;
  department: string;
  monthly_quota: number;
  monthly_used: number;
  active: boolean;
  created_at?: string;
}

export interface Location {
  id: string;
  code: string;
  area: string;
  description: string;
  created_at?: string;
}

export interface DashboardSummary {
  total_products: number;
  total_stock: number;
  alert_count: number;
  inbound_today: number;
  outbound_today: number;
  pending_inbound: number;
  pending_outbound: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

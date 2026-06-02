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
  warehouse_id: string;
  min_stock: number;
  max_stock: number;
  remark: string;
  active: boolean;
  spec?: string;
  qr_uuid?: string;
  invoice_number?: string;
  created_at?: string;
  updated_at?: string;
  // 聚合字段（商品列表页显示）
  stock_quantity?: number;    // 剩余库存
  warehouse_name?: string;    // 存仓仓库名称
  location_code?: string;     // 库位编码
  status?: string;            // 状态：上架/下架/缺货
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
  supplier_name?: string;
  purchase_type?: string;
  contract_no?: string;
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
  claimer_id?: string;
  claimer_name?: string;
  total_amount?: number;
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
  invoice_number: string;
  invoice_code: string;
  invoice_type: string;
  issue_date: string;
  total_amount: number;
  tax_amount: number;
  seller_name: string;
  seller_tax_no: string;
  buyer_name: string;
  buyer_tax_no: string;
  file_path: string;
  file_hash: string;
  source: string;
  status: string;
  confidence: number;
  wms_inbound_id: string;
  supplier_id: string;
  remark: string;
  created_at?: string;
  updated_at?: string;
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

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  contact: string;
  phone: string;
  capacity: number;
  status: string;
  active: boolean;
  remark: string;
  created_at?: string;
  updated_at?: string;
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

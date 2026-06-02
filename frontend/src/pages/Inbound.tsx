import { useEffect, useState } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import ScanInput from "../components/ScanInput";
import { Plus, Eye, CheckCircle, Trash2 } from "lucide-react";
import ImportModal from "../components/ImportModal";
import { InboundOrder, Product, Supplier } from "../types";

export default function Inbound() {
  /* ─── 列表状态 ─── */
  const [items, setItems] = useState<InboundOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [importModal, setImportModal] = useState(false);

  /* ─── 新建弹窗 ─── */
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    items: [{ product_id: "", quantity: 1, price: 0 }],
    supplier_id: "",
    invoice_id: "",
    remark: "",
    purchase_type: "",
    contract_no: "",
  });

  /* ─── 明细弹窗 ─── */
  const [detailOrder, setDetailOrder] = useState<InboundOrder | null>(null);
  const [productCache, setProductCache] = useState<Record<string, Product>>({});

  /* ─── 加载函数 ─── */
  const load = () => api.getInbound().then((r: any) => setItems(r.items || r));
  const loadProducts = () =>
    api.getProducts(1, "", 100).then((r: any) => {
      const list: Product[] = r.items || r;
      setProducts(list);
      const cache: Record<string, Product> = {};
      list.forEach((p) => (cache[p.id] = p));
      setProductCache((prev) => ({ ...prev, ...cache }));
    });
  const loadSuppliers = () =>
    api.getSuppliers().then((r: any) => setSuppliers(r.items || r));

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (modal) { loadProducts(); loadSuppliers(); }
  }, [modal]);

  /* ─── 扫码处理 ─── */
  const handleScan = async (code: string) => {
    try {
      if (code.startsWith("QR-PROD") || code.startsWith("QR-") || code.length > 4) {
        try {
          const prod = await api.getProductByQr(code);
          if (prod && prod.id) {
            setProductCache((prev) => ({ ...prev, [prod.id]: prod }));
            setForm((prev) => ({
              ...prev,
              items: [...prev.items, { product_id: prod.id, quantity: 1, price: prod.price || 0 }],
            }));
            return;
          }
        } catch { /* not a product code */ }
      }
    } catch { /* scan failed silently */ }
  };

  /* ─── 创建入库单 ─── */
  const createAsync = async () => {
    try {
      const supplier = suppliers.find((s) => s.id === form.supplier_id);
      await api.createInbound({
        ...form,
        supplier_name: supplier?.name || "",
      });
      setModal(false);
      setForm({
        items: [{ product_id: "", quantity: 1, price: 0 }],
        supplier_id: "", invoice_id: "", remark: "",
        purchase_type: "", contract_no: "",
      });
      load();
    } catch (e: any) { setErrorMsg(e.message); }
  };

  const complete = async (id: string) => {
    try { await api.completeInbound(id); load(); }
    catch (e: any) { setErrorMsg(e.message); }
  };

  /* ─── 明细反查商品名 ─── */
  const ensureProductsLoaded = async () => {
    if (Object.keys(productCache).length === 0) await loadProducts();
  };
  const resolveProductName = (pid: string) => productCache[pid]?.name || pid;
  const resolveProductSpec = (pid: string) => productCache[pid]?.spec || "";

  const supplierName = (order: InboundOrder) => {
    if (order.supplier_name) return order.supplier_name;
    if (order.supplier_id) {
      const s = suppliers.find((s) => s.id === order.supplier_id);
      return s?.name || order.supplier_id;
    }
    return "—";
  };

  const purchaseTypeLabel = (t?: string) =>
    t === "零星采购" ? "零星采购" : t === "合同采购" ? "合同采购" : "—";

  const statusLabel = (s: string) =>
    s === "completed" ? "已完成" : s === "cancelled" ? "已取消" : "待入库";
  const statusClass = (s: string) =>
    s === "completed" ? "bg-green-100 text-green-600" :
    s === "cancelled" ? "bg-red-100 text-red-600" :
    "bg-yellow-100 text-yellow-600";

  return (
    <div>
      {/* ─── 顶部标题 + 扫码 + 新建按钮 ─── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">📥 入库管理</h1>
        <div className="flex items-center gap-3">
          <ScanInput onScan={handleScan} placeholder="扫描商品码..." />
          <button
            onClick={() => setImportModal(true)}
            className="border px-3 py-2.5 rounded-lg text-base font-medium flex items-center gap-1 text-green-600 hover:bg-green-50 whitespace-nowrap"
          >
            导入
          </button>
          <button
            onClick={() => setModal(true)}
            className="bg-blue-500 text-white px-4 py-2.5 rounded-lg text-base font-medium flex items-center gap-1 min-w-[110px] whitespace-nowrap"
          >
            <Plus size={16} /> 新建入库
          </button>
        </div>
      </div>

      {/* ─── 表格 ─── */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-left">
              <th className="px-4 py-3 font-medium">单号</th>
              <th className="px-4 py-3 font-medium">商品数</th>
              <th className="px-4 py-3 font-medium">供应商</th>
              <th className="px-4 py-3 font-medium">采购类型</th>
              <th className="px-4 py-3 font-medium">金额</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50 cursor-pointer"
                onClick={async () => { await ensureProductsLoaded(); setDetailOrder(item); }}>
                <td className="px-4 py-3 font-medium">{item.order_no}</td>
                <td className="px-4 py-3">{item.items?.length || 0} 项</td>
                <td className="px-4 py-3">{supplierName(item)}</td>
                <td className="px-4 py-3">{purchaseTypeLabel(item.purchase_type)}</td>
                <td className="px-4 py-3">¥{item.total_amount || 0}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass(item.status)}`}>
                    {statusLabel(item.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={async (e) => { e.stopPropagation(); await ensureProductsLoaded(); setDetailOrder(item); }}
                    className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-700 text-xs"
                  >
                    <Eye size={14} /> 详情
                  </button>
                  {item.status === "pending" && (
                    <button
                      onClick={(e) => { e.stopPropagation(); complete(item.id); }}
                      className="inline-flex items-center gap-1 text-green-500 hover:text-green-700 text-xs"
                    >
                      <CheckCircle size={14} /> 完成
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-8">暂无入库单</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 新建入库单弹窗 ─── */}
      <Modal open={modal} onClose={() => setModal(false)} title="新建入库单">
        <div className="space-y-3">
          {/* 供应商 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
            <select
              className="w-full border rounded-lg p-2 text-sm"
              value={form.supplier_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  supplier_id: e.target.value,
                  items: [{ product_id: "", quantity: 1, price: 0 }],
                })
              }
            >
              <option value="">选择供应商（可选）</option>
              {suppliers.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}{s.contract_no ? ` (合同编号: ${s.contract_no})` : ""}</option>
              ))}
            </select>
          </div>

          {/* 采购类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">采购类型</label>
            <select
              className="w-full border rounded-lg p-2 text-sm"
              value={form.purchase_type}
              onChange={(e) => setForm({ ...form, purchase_type: e.target.value })}
            >
              <option value="">选择采购类型</option>
              <option value="零星采购">零星采购</option>
              <option value="合同采购">合同采购</option>
            </select>
          </div>

          {/* 采购编号 */}
          {form.purchase_type && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">采购编号</label>
              <input
                className="w-full border rounded-lg p-2 text-sm"
                placeholder={form.purchase_type === "零星采购" ? "请输入零星采购编号" : "请输入合同编号"}
                value={form.contract_no}
                onChange={(e) => setForm({ ...form, contract_no: e.target.value })}
              />
            </div>
          )}

          {/* 明细项 */}
          {form.items.map((it, i) => {
            const filteredProducts = form.supplier_id
              ? products.filter((p: any) => p.supplier_id === form.supplier_id)
              : products;
            return (
              <div key={i} className="border rounded-lg p-3 space-y-2 relative">
                {form.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const ni = form.items.filter((_, idx) => idx !== i);
                      setForm({ ...form, items: ni.length ? ni : [{ product_id: "", quantity: 1, price: 0 }] });
                    }}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择商品</label>
                  <select
                    className="w-full border rounded-lg p-2 text-sm"
                    value={it.product_id}
                    onChange={(e) => {
                      const ni = [...form.items];
                      const selected = filteredProducts.find((p: any) => p.id === e.target.value);
                      ni[i] = { ...ni[i], product_id: e.target.value, price: selected?.price || 0 };
                      setForm({ ...form, items: ni });
                    }}
                  >
                    <option value="">选择商品</option>
                    {filteredProducts.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku || p.id})</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                    <input
                      className="w-full border rounded-lg p-2 text-sm"
                      type="number"
                      min={0}
                      value={it.quantity}
                      onChange={(e) => {
                        const ni = [...form.items];
                        ni[i] = { ...ni[i], quantity: +e.target.value };
                        setForm({ ...form, items: ni });
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">单价</label>
                    <input
                      className="w-full border rounded-lg p-2 text-sm"
                      type="number"
                      min={0}
                      value={it.price}
                      onChange={(e) => {
                        const ni = [...form.items];
                        ni[i] = { ...ni[i], price: +e.target.value };
                        setForm({ ...form, items: ni });
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* 添加商品 */}
          <button
            type="button"
            onClick={() => setForm({ ...form, items: [...form.items, { product_id: "", quantity: 1, price: 0 }] })}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-1"
          >
            <Plus size={16} /> 添加商品
          </button>

          {/* 合计 */}
          <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">合计</span>
            <span className="text-lg font-bold text-blue-600">
              ¥{form.items.reduce((sum: number, it: any) => sum + (it.quantity || 0) * (it.price || 0), 0).toFixed(2)}
            </span>
          </div>
          <button onClick={createAsync} className="w-full bg-blue-500 text-white py-2.5 rounded-lg text-base font-medium">
            创建入库单
          </button>
        </div>
      </Modal>

      {/* ─── 详情弹窗 ─── */}
      <Modal open={detailOrder !== null} onClose={() => setDetailOrder(null)} title={`入库明细 - ${detailOrder?.order_no || ""}`}>
        {detailOrder && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>供应商: {supplierName(detailOrder)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass(detailOrder.status)}`}>
                {statusLabel(detailOrder.status)}
              </span>
            </div>
            {detailOrder.purchase_type && (
              <div className="text-sm text-gray-600">
                采购类型: {detailOrder.purchase_type}
                {detailOrder.contract_no ? ` · 编号: ${detailOrder.contract_no}` : ""}
              </div>
            )}
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-medium">商品</th>
                  <th className="px-3 py-2 text-left font-medium">规格</th>
                  <th className="px-3 py-2 text-right font-medium">数量</th>
                  <th className="px-3 py-2 text-right font-medium">单价</th>
                  <th className="px-3 py-2 text-right font-medium">小计</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(detailOrder.items || []).map((it, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2">{resolveProductName(it.product_id)}</td>
                    <td className="px-3 py-2">{resolveProductSpec(it.product_id) || "—"}</td>
                    <td className="px-3 py-2 text-right">{it.quantity}</td>
                    <td className="px-3 py-2 text-right">¥{it.price || 0}</td>
                    <td className="px-3 py-2 text-right">¥{((it.price || 0) * it.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-medium">
                  <td colSpan={4} className="px-3 py-2 text-right">合计</td>
                  <td className="px-3 py-2 text-right text-blue-600">¥{detailOrder.total_amount || 0}</td>
                </tr>
              </tfoot>
            </table>
            <div className="flex justify-end">
              <button onClick={() => setDetailOrder(null)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">关闭</button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── 错误提示弹窗 ─── */}
      <Modal open={errorMsg !== null} onClose={() => setErrorMsg(null)} title="提示">
        <p className="mb-4 text-gray-600">{errorMsg}</p>
        <div className="flex justify-end">
          <button onClick={() => setErrorMsg(null)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">确定</button>
        </div>
      </Modal>

      {/* ─── 导入弹窗 ─── */}
      <ImportModal
        open={importModal}
        onClose={() => setImportModal(false)}
        templateType="orders"
        onImport={(file) => api.importOrders(file)}
        onSuccess={() => load()}
        moduleName="入库单"
      />
    </div>
  );
}

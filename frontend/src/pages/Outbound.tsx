import { useEffect, useState, useMemo } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import ScanInput from "../components/ScanInput";
import { Plus, Eye, CheckCircle, Trash2 } from "lucide-react";
import { OutboundOrder, Product, Employee } from "../types";

/* ─── 表单项类型 ─── */
interface FormItem {
  product_id: string;
  spec: string;
  quantity: number;
}

export default function Outbound() {
  /* ─── 列表状态 ─── */
  const [items, setItems] = useState<OutboundOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  /* ─── 新建弹窗 ─── */
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<{ items: FormItem[]; claimer_id: string }>({
    items: [{ product_id: "", spec: "", quantity: 1 }],
    claimer_id: "",
  });

  /* ─── 明细弹窗 ─── */
  const [detailOrder, setDetailOrder] = useState<OutboundOrder | null>(null);

  /* ─── 产品名称缓存 ─── */
  const [productCache, setProductCache] = useState<Record<string, Product>>({});

  /* ─── 加载函数 ─── */
  const load = () => api.getOutbound().then((r: any) => setItems(r.items || r));
  const loadProducts = () =>
    api.getProducts(1, "", 999).then((r: any) => {
      const list: Product[] = r.items || r;
      setProducts(list);
      const cache: Record<string, Product> = {};
      list.forEach((p) => (cache[p.id] = p));
      setProductCache((prev) => ({ ...prev, ...cache }));
    });
  const loadEmployees = () =>
    api.getEmployees("").then((r: any) => setEmployees(r.items || r));

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (modal) { loadProducts(); loadEmployees(); }
  }, [modal]);

  /* ─── 扫码处理 ─── */
  const handleScan = async (code: string) => {
    try {
      // 尝试当员工码（先查员工）
      if (code.startsWith("QR-EMP") || code.includes("EMP")) {
        const emp = await api.getEmployeeByQr(code);
        if (emp) {
          setForm((prev) => ({ ...prev, claimer_id: emp.id }));
          return;
        }
      }
      // 尝试当商品码
      if (code.startsWith("QR-PROD") || code.startsWith("QR-") || code.length > 4) {
        try {
          const prod = await api.getProductByQr(code);
          if (prod && prod.id) {
            setProductCache((prev) => ({ ...prev, [prod.id]: prod }));
            setForm((prev) => ({
              ...prev,
              items: [...prev.items, { product_id: prod.id, spec: prod.spec || "", quantity: 1 }],
            }));
            return;
          }
        } catch { /* not a product code */ }
      }
    } catch { /* scan failed silently */ }
  };

  /* ─── 新建出库单 ─── */
  const create = async () => {
    try {
      const payload = {
        items: form.items
          .filter((it) => it.product_id)
          .map((it) => ({
            product_id: it.product_id,
            spec: it.spec,
            quantity: it.quantity,
          })),
        claimer_id: form.claimer_id,
        claimer_name: employees.find((e) => e.id === form.claimer_id)?.name || "",
        type: "employee_claim",
      };
      await api.createOutbound(payload);
      setModal(false);
      setForm({ items: [{ product_id: "", spec: "", quantity: 1 }], claimer_id: "" });
      load();
    } catch (e: any) { setErrorMsg(e.message); }
  };

  const complete = async (id: string) => {
    try { await api.completeOutbound(id); load(); }
    catch (e: any) { setErrorMsg(e.message); }
  };

  /* ─── 明细反查商品名 ─── */
  const ensureProductsLoaded = async (order: OutboundOrder) => {
    const missingIds = (order.items || [])
      .map((it) => it.product_id)
      .filter((pid) => pid && !productCache[pid]);
    if (missingIds.length === 0) return;
    // 批量加载
    await loadProducts();
  };

  const resolveProductName = (pid: string) => productCache[pid]?.name || pid;
  const resolveProductSpec = (pid: string) => productCache[pid]?.spec || "";

  /* ─── 辅助：获取商品规格选项 ─── */
  const getSpecOptions = (productId: string): string[] => {
    const selected = products.find((p) => p.id === productId);
    if (!selected) return [];
    return products
      .filter((p) => p.name === selected.name)
      .map((p) => p.spec || "")
      .filter((v): v is string => !!v)
      .filter((v, i, a) => a.indexOf(v) === i);
  };

  /* ─── 辅助：获取领用人显示名 ─── */
  const claimerName = (order: OutboundOrder) => {
    if (order.claimer_name) return order.claimer_name;
    if (order.claimer_id) {
      const emp = employees.find((e) => e.id === order.claimer_id);
      return emp ? `${emp.name} (${emp.employee_no})` : order.claimer_id;
    }
    return "—";
  };

  const statusLabel = (s: string) =>
    s === "completed" ? "已完成" : s === "cancelled" ? "已取消" : "待出库";
  const statusClass = (s: string) =>
    s === "completed" ? "bg-green-100 text-green-600" :
    s === "cancelled" ? "bg-red-100 text-red-600" :
    "bg-yellow-100 text-yellow-600";

  return (
    <div>
      {/* ─── 顶部标题 + 扫码 + 新建按钮 ─── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">📤 出库管理</h1>
        <div className="flex items-center gap-3">
          <ScanInput onScan={handleScan} placeholder="扫描商品码或员工码..." />
          <button
            onClick={() => setModal(true)}
            className="bg-blue-500 text-white px-4 py-2.5 rounded-lg text-base font-medium flex items-center gap-1 min-w-[110px] whitespace-nowrap"
          >
            <Plus size={16} /> 新建出库
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
              <th className="px-4 py-3 font-medium">领用人</th>
              <th className="px-4 py-3 font-medium">金额</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item: any) => (
              <tr key={item.id} className="hover:bg-gray-50 cursor-pointer"
                onClick={async () => { await ensureProductsLoaded(item); setDetailOrder(item); }}>
                <td className="px-4 py-3 font-medium">{item.order_no}</td>
                <td className="px-4 py-3">{item.items?.length || 0} 项</td>
                <td className="px-4 py-3">{claimerName(item)}</td>
                <td className="px-4 py-3">¥{item.total_amount || 0}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass(item.status)}`}>
                    {statusLabel(item.status)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button
                    onClick={async (e) => { e.stopPropagation(); await ensureProductsLoaded(item); setDetailOrder(item); }}
                    className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-700 text-xs"
                  >
                    <Eye size={14} /> 详情
                  </button>
                  {item.status !== "completed" && item.status !== "cancelled" && (
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
                <td colSpan={6} className="text-center text-gray-400 py-8">暂无出库单</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 新建出库单弹窗 ─── */}
      <Modal open={modal} onClose={() => setModal(false)} title="新建出库单">
        <div className="space-y-4">
          {/* 领用人 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">领用人</label>
            <select
              className="w-full border rounded-lg p-2 text-sm"
              value={form.claimer_id}
              onChange={(e) => setForm({ ...form, claimer_id: e.target.value })}
            >
              <option value="">选择领用人</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.employee_no})
                </option>
              ))}
            </select>
          </div>

          {/* 商品明细列表 */}
          {form.items.map((it, i) => {
            const specOptions = getSpecOptions(it.product_id);
            const isSpecReadonly = specOptions.length <= 1;
            return (
              <div key={i} className="border rounded-lg p-3 space-y-2 relative">
                {form.items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const ni = form.items.filter((_, idx) => idx !== i);
                      setForm({ ...form, items: ni.length ? ni : [{ product_id: "", spec: "", quantity: 1 }] });
                    }}
                    className="absolute top-2 right-2 text-red-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
                {/* 选择商品 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择商品</label>
                  <select
                    className="w-full border rounded-lg p-2 text-sm"
                    value={it.product_id}
                    onChange={(e) => {
                      const ni = [...form.items];
                      const selected = products.find((p) => p.id === e.target.value);
                      ni[i] = { ...ni[i], product_id: e.target.value, spec: selected?.spec || "" };
                      setForm({ ...form, items: ni });
                    }}
                  >
                    <option value="">选择商品</option>
                    {products.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku || p.id}) · 库存:{p.stock ?? "?"}
                      </option>
                    ))}
                  </select>
                </div>
                {/* 规格 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">规格</label>
                  {specOptions.length > 1 ? (
                    <select
                      className="w-full border rounded-lg p-2 text-sm"
                      value={it.spec}
                      onChange={(e) => {
                        const ni = [...form.items];
                        ni[i] = { ...ni[i], spec: e.target.value };
                        setForm({ ...form, items: ni });
                      }}
                    >
                      <option value="">选择规格</option>
                      {specOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="w-full border rounded-lg p-2 text-sm bg-gray-50"
                      value={it.spec || "—"}
                      readOnly
                      placeholder="选择商品后显示规格"
                    />
                  )}
                </div>
                {/* 数量 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                  <input
                    className="w-full border rounded-lg p-2 text-sm"
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => {
                      const ni = [...form.items];
                      ni[i] = { ...ni[i], quantity: +e.target.value };
                      setForm({ ...form, items: ni });
                    }}
                  />
                </div>
              </div>
            );
          })}

          {/* 添加商品按钮 */}
          <button
            type="button"
            onClick={() => setForm({ ...form, items: [...form.items, { product_id: "", spec: "", quantity: 1 }] })}
            className="w-full border-2 border-dashed border-gray-300 rounded-lg py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center gap-1"
          >
            <Plus size={16} /> 添加商品
          </button>

          <button
            onClick={create}
            className="w-full bg-blue-500 text-white py-2.5 rounded-lg text-base font-medium"
          >
            创建出库单
          </button>
        </div>
      </Modal>

      {/* ─── 详情弹窗 ─── */}
      <Modal open={detailOrder !== null} onClose={() => setDetailOrder(null)} title={`出库明细 - ${detailOrder?.order_no || ""}`}>
        {detailOrder && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>领用人: {claimerName(detailOrder)}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass(detailOrder.status)}`}>
                {statusLabel(detailOrder.status)}
              </span>
            </div>
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
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import { Plus, CheckCircle } from "lucide-react";
import { InboundOrder, Product, Supplier } from "../types";

export default function Inbound() {
  const [items, setItems] = useState<InboundOrder[]>([]);
  const [modal, setModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [form, setForm] = useState({
    items: [{ product_id: "", quantity: 1, price: 0 }],
    supplier_id: "",
    invoice_id: "",
    remark: "",
  });

  const load = () => api.getInbound().then((r: any) => setItems(r.items || r));
  const loadProducts = () => api.getProducts(1, "", 100).then((r: any) => setProducts(r.items || r));
  const loadSuppliers = () => api.getSuppliers().then((r: any) => setSuppliers(r.items || r));

  useEffect(() => { load(); }, []);
  useEffect(() => { if (modal) { loadProducts(); loadSuppliers(); } }, [modal]);

  const createAsync = async () => {
    await api.createInbound(form);
    setModal(false);
    setForm({ items: [{ product_id: "", quantity: 1, price: 0 }], supplier_id: "", invoice_id: "", remark: "" });
    load();
  };

  const complete = async (id: string) => {
    await api.completeInbound(id);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">📥 入库管理</h1>
        <button onClick={() => setModal(true)} className="bg-blue-500 text-white px-4 py-2.5 rounded-lg text-base font-medium flex items-center gap-1 min-w-[110px]"><Plus size={16} /> 新建入库</button>
      </div>

      <div className="space-y-2">
        {items.map((item: any) => (
          <div key={item.id} className="bg-white rounded-xl p-3 border flex items-center justify-between">
            <div>
              <p className="font-medium">{item.order_no}</p>
              <p className="text-xs text-gray-400">金额: ¥{item.total_amount} · {item.items?.length || 0} 项</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === "completed" ? "bg-green-100 text-green-600" : item.status === "cancelled" ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"}`}>
                {item.status === "completed" ? "已完成" : item.status === "cancelled" ? "已取消" : "待入库"}
              </span>
            </div>
            {item.status === "pending" && (
              <button onClick={() => complete(item.id)} className="px-4 py-2 bg-green-500 text-white rounded-lg text-base font-medium min-w-[100px]" title="完成入库">
                完成入库
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-gray-400 py-8">暂无入库单</p>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="新建入库单">
        <div className="space-y-3">
          {/* 供应商 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
            <select className="w-full border rounded-lg p-2 text-sm" value={form.supplier_id}
              onChange={e => setForm({ ...form, supplier_id: e.target.value, items: [{ product_id: "", quantity: 1, price: 0 }] })}>
              <option value="">选择供应商（可选）</option>
              {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* 明细项 */}
          {form.items.map((it, i) => {
            // 根据选择的供应商过滤商品
            const filteredProducts = form.supplier_id
              ? products.filter((p: any) => p.supplier_id === form.supplier_id)
              : products;
            return (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">选择商品</label>
                  <select className="w-full border rounded-lg p-2 text-sm" value={it.product_id}
                    onChange={e => {
                      const ni = [...form.items];
                      const selected = filteredProducts.find((p: any) => p.id === e.target.value);
                      ni[i] = { ...ni[i], product_id: e.target.value, price: selected?.price || 0 };
                      setForm({ ...form, items: ni });
                    }}>
                    <option value="">选择商品</option>
                    {filteredProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku || p.id})</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                    <input className="w-full border rounded-lg p-2 text-sm" type="number" min={0} placeholder="数量" value={it.quantity}
                      onChange={e => { const ni = [...form.items]; ni[i] = { ...ni[i], quantity: +e.target.value }; setForm({ ...form, items: ni }); }} />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">单价</label>
                    <input className="w-full border rounded-lg p-2 text-sm" type="number" min={0} placeholder="单价" value={it.price}
                      onChange={e => { const ni = [...form.items]; ni[i] = { ...ni[i], price: +e.target.value }; setForm({ ...form, items: ni }); }} />
                  </div>
                </div>
              </div>
            );
          })}
          {/* 合计 */}
          <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">合计</span>
            <span className="text-lg font-bold text-blue-600">
              ¥{form.items.reduce((sum: number, it: any) => sum + (it.quantity || 0) * (it.price || 0), 0).toFixed(2)}
            </span>
          </div>
          <button onClick={createAsync} className="w-full bg-blue-500 text-white py-2.5 rounded-lg text-base font-medium min-w-[100px]">创建入库单</button>
        </div>
      </Modal>
    </div>
  );
}

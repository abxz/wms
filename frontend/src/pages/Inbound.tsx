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
  const loadProducts = () => api.getProducts(1, "", 999).then((r: any) => setProducts(r.items || r));
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
        <button onClick={() => setModal(true)} className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"><Plus size={16} /> 新建入库</button>
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
              <button onClick={() => complete(item.id)} className="p-1.5 text-green-500" title="完成入库">
                <CheckCircle size={18} />
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-gray-400 py-8">暂无入库单</p>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="新建入库单">
        <div className="space-y-3">
          {/* 供应商 */}
          <select className="w-full border rounded-lg p-2 text-sm" value={form.supplier_id}
            onChange={e => setForm({ ...form, supplier_id: e.target.value })}>
            <option value="">选择供应商（可选）</option>
            {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {/* 明细项 */}
          {form.items.map((it, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <select className="w-full border rounded-lg p-2 text-sm" value={it.product_id}
                onChange={e => { const ni = [...form.items]; ni[i] = { ...ni[i], product_id: e.target.value }; setForm({ ...form, items: ni }); }}>
                <option value="">选择商品</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku || p.id})</option>)}
              </select>
              <div className="flex gap-2">
                <input className="flex-1 border rounded-lg p-2 text-sm" type="number" min={0} placeholder="数量" value={it.quantity}
                  onChange={e => { const ni = [...form.items]; ni[i] = { ...ni[i], quantity: +e.target.value }; setForm({ ...form, items: ni }); }} />
                <input className="flex-1 border rounded-lg p-2 text-sm" type="number" min={0} placeholder="单价" value={it.price}
                  onChange={e => { const ni = [...form.items]; ni[i] = { ...ni[i], price: +e.target.value }; setForm({ ...form, items: ni }); }} />
              </div>
            </div>
          ))}
          <button onClick={createAsync} className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium">创建入库单</button>
        </div>
      </Modal>
    </div>
  );
}

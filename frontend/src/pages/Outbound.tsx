import { useEffect, useState } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import { Plus, CheckCircle } from "lucide-react";
import { OutboundOrder, Product } from "../types";

export default function Outbound() {
  const [items, setItems] = useState<OutboundOrder[]>([]);
  const [modal, setModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ items: [{ product_id: "", quantity: 1 }] });

  const load = () => api.getOutbound().then((r: any) => setItems(r.items || r));
  const loadProducts = () => api.getProducts(1, "", 999).then((r: any) => setProducts(r.items || r));
  useEffect(() => { load(); }, []);
  useEffect(() => { if (modal) loadProducts(); }, [modal]);

  const create = async () => {
    try {
      await api.createOutbound(form);
      setModal(false);
      setForm({ items: [{ product_id: "", quantity: 1 }] });
      load();
    } catch (e: any) { setErrorMsg(e.message); }
  };

  const complete = async (id: string) => {
    try {
      await api.completeOutbound(id);
      load();
    } catch (e: any) { setErrorMsg(e.message); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">📤 出库管理</h1>
        <button onClick={() => setModal(true)} className="bg-blue-500 text-white px-4 py-2.5 rounded-lg text-base font-medium flex items-center gap-1 min-w-[110px]"><Plus size={16} /> 新建出库</button>
      </div>
      <div className="space-y-2">
        {items.map((item: any) => (
          <div key={item.id} className="bg-white rounded-xl p-3 border flex items-center justify-between">
            <div>
              <p className="font-medium">{item.order_no}</p>
              <p className="text-xs text-gray-400">类型: {item.type} · {item.items?.length || 0} 项 · ¥{item.total_amount || 0}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                item.status === "completed" ? "bg-green-100 text-green-600" :
                item.status === "cancelled" ? "bg-red-100 text-red-600" :
                "bg-yellow-100 text-yellow-600"
              }`}>
                {item.status === "completed" ? "已完成" : item.status === "cancelled" ? "已取消" : "待出库"}
              </span>
            </div>
            {item.status !== "completed" && item.status !== "cancelled" && (
              <button onClick={() => complete(item.id)} className="px-4 py-2 bg-green-500 text-white rounded-lg text-base font-medium min-w-[100px]" title="完成出库">
                完成出库
              </button>
            )}
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-gray-400 py-8">暂无出库单</p>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="新建出库单">
        <div className="space-y-3">
          {form.items.map((it, i) => (
            <div key={i} className="border rounded-lg p-3 space-y-2">
              <select className="w-full border rounded-lg p-2 text-sm" value={it.product_id}
                onChange={e => { const ni = [...form.items]; ni[i] = { ...ni[i], product_id: e.target.value }; setForm({ ...form, items: ni }); }}>
                <option value="">选择商品</option>
                {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku || p.id}) · 库存:{p.stock ?? "?"}</option>)}
              </select>
              <input className="w-full border rounded-lg p-2 text-sm" type="number" min={1} placeholder="数量" value={it.quantity}
                onChange={e => { const ni = [...form.items]; ni[i] = { ...ni[i], quantity: +e.target.value }; setForm({ ...form, items: ni }); }} />
            </div>
          ))}
          <button onClick={create} className="w-full bg-blue-500 text-white py-2.5 rounded-lg text-base font-medium min-w-[100px]">创建出库单</button>
        </div>
      </Modal>

      {/* 错误提示弹窗 */}
      <Modal open={errorMsg !== null} onClose={() => setErrorMsg(null)} title="提示">
        <p className="mb-4 text-gray-600">{errorMsg}</p>
        <div className="flex justify-end">
          <button onClick={() => setErrorMsg(null)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">确定</button>
        </div>
      </Modal>
    </div>
  );
}

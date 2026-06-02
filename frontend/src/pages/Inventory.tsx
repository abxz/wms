import { useEffect, useState } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import { AlertTriangle, Download, Edit2 } from "lucide-react";
import { Inventory as InventoryItem, InventoryAlert } from '../types';

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [tab, setTab] = useState<"all" | "alerts">("all");
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [editModal, setEditModal] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [editForm, setEditForm] = useState({ warehouse_id: "", location_id: "" });

  const load = () => {
    api.getInventory().then((r: any) => {
      const list: InventoryItem[] = Array.isArray(r) ? r : [];
      setItems(list);
      list.forEach((item: InventoryItem) => {
        if (!productNames[item.product_id]) {
          api.getProduct(item.product_id).then((p: any) => {
            if (p && p.name) setProductNames(prev => ({ ...prev, [item.product_id]: p.name }));
          }).catch(() => {});
        }
      });
    });
    api.getAlerts().then(setAlerts);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (item: any) => {
    setEditModal(item);
    setEditForm({ warehouse_id: item.warehouse_id || "", location_id: item.location_id || "" });
    if (warehouses.length === 0) api.getWarehouses().then((r: any) => setWarehouses(r.items || r)).catch(() => {});
    if (locations.length === 0) api.getLocations().then((r: any) => setLocations(r.items || r)).catch(() => {});
  };

  const saveEdit = async () => {
    if (!editModal) return;
    await api.updateInventory(editModal.id, editForm);
    setEditModal(null);
    load();
  };

  const data = tab === "alerts" ? alerts : items;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">🏭 库存管理</h1>
        <button onClick={() => api.exportInventory()} className="border px-3 py-2 rounded-lg text-sm flex items-center gap-1 text-gray-600"><Download size={16} /> 导出</button>
      </div>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab("all")} className={`px-4 py-2 rounded-lg text-sm ${tab === "all" ? "bg-blue-500 text-white" : "bg-gray-100"}`}>全部 ({items.length})</button>
        <button onClick={() => setTab("alerts")} className={`px-4 py-2 rounded-lg text-sm flex items-center gap-1 ${tab === "alerts" ? "bg-red-500 text-white" : "bg-gray-100"}`}><AlertTriangle size={14} /> 预警 ({alerts.length})</button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-600">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">商品名称</th>
                <th className="px-3 py-2.5 text-left font-semibold">库位</th>
                <th className="px-3 py-2.5 text-right font-semibold">数量</th>
                {tab === "all" && <th className="px-3 py-2.5 text-center font-semibold">操作</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((item: any, i: number) => (
                <tr key={item.id || i} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 font-medium">{productNames[item.product_id] || item.product_id}</td>
                  <td className="px-3 py-2.5 text-gray-500">{item.location_id || "未指定"}</td>
                  <td className={`px-3 py-2.5 text-right font-bold ${item.quantity <= 10 ? "text-red-500" : "text-green-600"}`}>{item.quantity}</td>
                  {tab === "all" && (
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-500" title="编辑"><Edit2 size={14} /></button>
                    </td>
                  )}
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={4} className="text-center text-gray-400 py-8">暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="编辑库存">
        <div className="space-y-3">
          <div className="text-sm text-gray-500">商品：{productNames[editModal?.product_id] || editModal?.product_id}</div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">仓库</label>
            <select className="w-full border rounded-lg p-2 text-sm" value={editForm.warehouse_id} onChange={e => setEditForm({ ...editForm, warehouse_id: e.target.value })}>
              <option value="">选择仓库</option>
              {warehouses.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">库位</label>
            <select className="w-full border rounded-lg p-2 text-sm" value={editForm.location_id} onChange={e => setEditForm({ ...editForm, location_id: e.target.value })}>
              <option value="">选择库位</option>
              {locations.map((l: any) => <option key={l.id} value={l.id}>{l.code}</option>)}
            </select>
          </div>
          <button onClick={saveEdit} className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium">保存</button>
        </div>
      </Modal>
    </div>
  );
}

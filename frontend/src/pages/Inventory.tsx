import { useEffect, useState } from "react";
import { api } from "../services/api";
import { AlertTriangle, Download } from "lucide-react";
import { Inventory as InventoryItem, InventoryAlert } from '../types';

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<InventoryAlert[]>([]);
  const [tab, setTab] = useState<"all" | "alerts">("all");
  const [productNames, setProductNames] = useState<Record<string, string>>({});

  useEffect(() => {
    api.getInventory().then((r: any) => {
      const list: InventoryItem[] = Array.isArray(r) ? r : [];
      setItems(list);
      // 获取所有商品名称
      list.forEach((item: InventoryItem) => {
        if (!productNames[item.product_id]) {
          api.getProduct(item.product_id).then((p: any) => {
            if (p && p.name) {
              setProductNames(prev => ({ ...prev, [item.product_id]: p.name }));
            }
          }).catch(() => {});
        }
      });
    });
    api.getAlerts().then(setAlerts);
  }, []);

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

      <div className="space-y-2">
        {data.map((item: any, i: number) => (
          <div key={item.id || i} className="bg-white rounded-xl p-3 border flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">{productNames[item.product_id] || item.product_id}</p>
              <p className="text-xs text-gray-400">库位: {item.location_id || "未指定"}</p>
            </div>
            <span className={`text-lg font-bold ${item.quantity <= 10 ? "text-red-500" : "text-green-600"}`}>{item.quantity}</span>
          </div>
        ))}
        {data.length === 0 && <p className="text-center text-gray-400 py-8">暂无数据</p>}
      </div>
    </div>
  );
}

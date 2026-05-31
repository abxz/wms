import { useEffect, useState } from "react";
import { api } from "../services/api";
import { Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, DollarSign, Warehouse, TrendingUp } from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getTrends()]).then(([s, t]) => {
      setData({ ...s, trends: t });
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-center py-8 text-gray-400">加载中...</p>;

  const cards = [
    { label: "商品总数", value: data.total_products, icon: Package, color: "blue" },
    { label: "总库存", value: data.total_stock, icon: Warehouse, color: "green" },
    { label: "今日入库", value: data.inbound_today, icon: ArrowDownToLine, color: "indigo" },
    { label: "今日出库", value: data.outbound_today, icon: ArrowUpFromLine, color: "orange" },
    { label: "库存预警", value: data.alert_count, icon: AlertTriangle, color: "red" },
    { label: "发票", value: data.total_invoices, icon: DollarSign, color: "purple" },
    { label: "待入库", value: data.pending_inbound, icon: ArrowDownToLine, color: "yellow" },
    { label: "待出库", value: data.pending_outbound, icon: ArrowUpFromLine, color: "yellow" },
  ];

  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
    red: "bg-red-50 text-red-600 border-red-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">📊 数据面板</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${colors[c.color] || colors.blue}`}>
            <div className="flex items-center gap-2 mb-1">
              <c.icon size={18} />
              <span className="text-xs opacity-75">{c.label}</span>
            </div>
            <p className="text-2xl font-bold">{c.value ?? "-"}</p>
          </div>
        ))}
      </div>

      {data.trends && (
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-blue-500" />
            <h2 className="font-semibold">月度趋势（{data.trends.days || 30}天）</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400">入库单数</p>
              <p className="text-lg font-bold">{data.trends.inbound_count}</p>
            </div>
            <div>
              <p className="text-gray-400">出库单数</p>
              <p className="text-lg font-bold">{data.trends.outbound_count}</p>
            </div>
            <div>
              <p className="text-gray-400">入库金额</p>
              <p className="text-lg font-bold">¥{data.trends.inbound_amount?.toFixed(0) || 0}</p>
            </div>
            <div>
              <p className="text-gray-400">出库金额</p>
              <p className="text-lg font-bold">¥{data.trends.outbound_amount?.toFixed(0) || 0}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 bg-white rounded-xl border p-4">
        <h2 className="font-semibold mb-2">快速信息</h2>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
          <p>供应商: {data.total_suppliers || 0}</p>
          <p>库位: {data.total_locations || 0}</p>
          <p>员工: {data.total_employees || 0}</p>
          <p>商品: {data.total_products || 0}</p>
        </div>
      </div>
    </div>
  );
}

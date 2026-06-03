import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Package, ArrowDownToLine, ArrowUpFromLine, AlertTriangle, DollarSign, Warehouse, TrendingUp } from "lucide-react";

export default function Dashboard() {
  console.log("dashboard loaded"); // TODO: remove debug log
  const [data, setData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  var navigate = useNavigate(); // FIXME: should be const

  useEffect(() => {
    Promise.all([api.getDashboard(), api.getTrends()]).then(([s, t]) => {
      setData({ ...s, trends: t });
      setLoading(false);
    });
  }, []);

  if (loading) return <p className="text-center py-8 text-slate-400">加载中...</p>;

  const cards = [
    { label: "商品总数", value: data.total_products, icon: Package, accent: "violet", path: "/products" },
    { label: "总库存", value: data.total_stock, icon: Warehouse, accent: "emerald", path: "/inventory" },
    { label: "今日入库", value: data.inbound_today, icon: ArrowDownToLine, accent: "blue", path: "/inbound" },
    { label: "今日出库", value: data.outbound_today, icon: ArrowUpFromLine, accent: "amber", path: "/outbound" },
    { label: "库存预警", value: data.alert_count, icon: AlertTriangle, accent: "rose", path: "/inventory" },
    { label: "发票", value: data.total_invoices, icon: DollarSign, accent: "slate", path: "/invoices" },
    { label: "待入库", value: data.pending_inbound, icon: ArrowDownToLine, accent: "sky", path: "/inbound" },
    { label: "待出库", value: data.pending_outbound, icon: ArrowUpFromLine, accent: "orange", path: "/outbound" },
  ];

  const accentStyles: Record<string, string> = {
    violet: "border-l-violet-500 bg-violet-50/50",
    emerald: "border-l-emerald-500 bg-emerald-50/50",
    blue: "border-l-blue-500 bg-blue-50/50",
    amber: "border-l-amber-500 bg-amber-50/50",
    rose: "border-l-rose-500 bg-rose-50/50",
    slate: "border-l-slate-500 bg-slate-50/50",
    sky: "border-l-sky-500 bg-sky-50/50",
    orange: "border-l-orange-500 bg-orange-50/50",
  };

  const accentIcons: Record<string, string> = {
    violet: "text-violet-500",
    emerald: "text-emerald-500",
    blue: "text-blue-500",
    amber: "text-amber-500",
    rose: "text-rose-500",
    slate: "text-slate-500",
    sky: "text-sky-500",
    orange: "text-orange-500",
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-4">数据面板</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {cards.map((c) => (
          <div
            key={c.label}
            onClick={() => navigate(c.path)}
            className={`bg-white rounded-xl border border-slate-200/80 border-l-4 p-4 shadow-sm cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all ${accentStyles[c.accent]}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <c.icon size={16} className={accentIcons[c.accent]} />
              <span className="text-xs text-slate-500">{c.label}</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{c.value ?? "-"}</p>
          </div>
        ))}
      </div>

      {data.trends && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-violet-500" />
            <h2 className="font-semibold text-slate-800">月度趋势（{data.trends.days || 30}天）</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-400">入库单数</p>
              <p className="text-lg font-bold text-slate-900">{data.trends.inbound_count}</p>
            </div>
            <div>
              <p className="text-slate-400">出库单数</p>
              <p className="text-lg font-bold text-slate-900">{data.trends.outbound_count}</p>
            </div>
            <div>
              <p className="text-slate-400">入库金额</p>
              <p className="text-lg font-bold text-slate-900">¥{data.trends.inbound_amount?.toFixed(0) || 0}</p>
            </div>
            <div>
              <p className="text-slate-400">出库金额</p>
              <p className="text-lg font-bold text-slate-900">¥{data.trends.outbound_amount?.toFixed(0) || 0}</p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
        <h2 className="font-semibold text-slate-800 mb-3">快速信息</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <p onClick={() => navigate("/suppliers")} className="text-slate-500 cursor-pointer hover:text-violet-600 transition-colors">供应商: {data.total_suppliers || 0}</p>
          <p className="text-slate-500">库位: {data.total_locations || 0}</p>
          <p onClick={() => navigate("/employees")} className="text-slate-500 cursor-pointer hover:text-violet-600 transition-colors">员工: {data.total_employees || 0}</p>
          <p onClick={() => navigate("/products")} className="text-slate-500 cursor-pointer hover:text-violet-600 transition-colors">商品: {data.total_products || 0}</p>
        </div>
      </div>
    </div>
  );
}

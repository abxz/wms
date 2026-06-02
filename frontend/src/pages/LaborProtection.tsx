import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import {
  Plus, Search, Edit2, Trash2, ShieldCheck, Settings, ClipboardList,
  AlertTriangle, CheckCircle, Download
} from "lucide-react";

type TabKey = "supplies" | "configs" | "distributions" | "pending";

const TABS: { key: TabKey; label: string; icon: any }[] = [
  { key: "supplies", label: "用品目录", icon: ShieldCheck },
  { key: "configs", label: "岗位配置", icon: Settings },
  { key: "pending", label: "待领取", icon: AlertTriangle },
  { key: "distributions", label: "领取记录", icon: ClipboardList },
];

const CATEGORIES = ["头部防护", "眼面防护", "呼吸防护", "手部防护", "足部防护", "躯体防护", "防坠落", "听力防护"];
const POSITIONS = ["爆破工", "电工", "仓管员", "主管", "安全员", "司机", "搬运工", "维修工", "化验员", "管理员"];

export default function LaborProtection() {
  const [tab, setTab] = useState<TabKey>("supplies");
  const [lowStock, setLowStock] = useState<any[]>([]);

  useEffect(() => {
    loadLowStock();
    const interval = setInterval(loadLowStock, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadLowStock = async () => {
    try {
      const res = await api.laborLowStock();
      setLowStock(res || []);
    } catch {}
  };

  return (
    <div className="space-y-4">
      {lowStock.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={18} className="text-red-600 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-red-800 text-sm">库存警告</div>
              <div className="text-xs text-red-600 mt-1">
                以下用品库存不足：{lowStock.map(s => `${s.name}(${s.current_stock})`).join('、')}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === t.key ? "bg-white shadow text-violet-700" : "text-slate-500 hover:text-slate-700"
            }`}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>
      {tab === "supplies" && <SuppliesTab onStockUpdate={loadLowStock} />}
      {tab === "configs" && <ConfigsTab />}
      {tab === "pending" && <PendingTab />}
      {tab === "distributions" && <DistributionsTab />}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════════
   用品目录 Tab
   ═══════════════════════════════════════════════════════════════════════════════ */

function SuppliesTab({ onStockUpdate }: any) {
  const [data, setData] = useState<any>({ items: [], total: 0, page: 1 });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ name: "", category: "头部防护", spec: "", unit: "个", default_cycle_months: 12, gb_ref: "GB 39800.1-2020", current_stock: 0, warning_threshold: 10, remark: "" });

  const load = useCallback(async () => {
    const res = await api.laborSupplies(page, 20, search);
    setData(res);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditId(null);
    setForm({ name: "", category: "头部防护", spec: "", unit: "个", default_cycle_months: 12, gb_ref: "GB 39800.1-2020", current_stock: 0, warning_threshold: 10, remark: "" });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({ name: item.name, category: item.category, spec: item.spec, unit: item.unit, default_cycle_months: item.default_cycle_months, gb_ref: item.gb_ref, current_stock: item.current_stock || 0, warning_threshold: item.warning_threshold || 10, remark: item.remark });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name) return alert("名称必填");
    if (editId) await api.laborSupplyUpdate(editId, form);
    else await api.laborSupplyCreate(form);
    setShowModal(false);
    load();
    onStockUpdate?.();
  };

  const del = async (id: string) => {
    if (!confirm("确认删除？")) return;
    await api.laborSupplyDelete(id);
    load();
  };

  const initGB = async () => {
    const res = await api.laborInitGB();
    alert(`已初始化国标数据，新增 ${res.added} 条`);
    load();
  };

  return (
    <div className="space-y-3">
      {/* 工具栏 */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" placeholder="搜索用品..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <button onClick={initGB} className="px-3 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm hover:bg-green-100">
          <ShieldCheck size={14} className="inline mr-1" />初始化国标
        </button>
        <button onClick={openNew} className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 flex items-center gap-1">
          <Plus size={14} />新增
        </button>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2.5">名称</th>
              <th className="text-left px-3 py-2.5">分类</th>
              <th className="text-left px-3 py-2.5">规格</th>
              <th className="text-left px-3 py-2.5">单位</th>
              <th className="text-left px-3 py-2.5">库存</th>
              <th className="text-left px-3 py-2.5">预警</th>
              <th className="text-left px-3 py-2.5">周期(月)</th>
              <th className="text-right px-3 py-2.5">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((s: any) => (
              <tr key={s.id} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{s.name}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">{s.category}</span>
                </td>
                <td className="px-3 py-2 text-slate-500">{s.spec || "-"}</td>
                <td className="px-3 py-2">{s.unit}</td>
                <td className="px-3 py-2">
                  <span className={s.current_stock < s.warning_threshold ? "text-red-600 font-semibold" : ""}>
                    {s.current_stock || 0}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-500">{s.warning_threshold || 10}</td>
                <td className="px-3 py-2">{s.default_cycle_months}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => openEdit(s)} className="text-slate-400 hover:text-blue-600 p-1"><Edit2 size={15} /></button>
                  <button onClick={() => del(s.id)} className="text-slate-400 hover:text-red-600 p-1 ml-1"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {!data.items?.length && (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">暂无数据，点击"初始化国标"导入默认劳保用品</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {data.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1 border rounded text-sm disabled:opacity-40">上一页</button>
          <span className="px-3 py-1 text-sm text-slate-500">{page}/{data.pages}</span>
          <button onClick={() => setPage(Math.min(data.pages, page + 1))} disabled={page >= data.pages} className="px-3 py-1 border rounded text-sm disabled:opacity-40">下一页</button>
        </div>
      )}

      {/* 弹窗 */}
      {showModal && (
        <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? "编辑劳保用品" : "新增劳保用品"}>
          <div className="space-y-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
              <input className="w-full border rounded-lg p-2 text-sm" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="如：安全帽" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
                <select className="w-full border rounded-lg p-2 text-sm" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
                <input className="w-full border rounded-lg p-2 text-sm" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">规格</label>
                <input className="w-full border rounded-lg p-2 text-sm" value={form.spec} onChange={e => setForm({ ...form, spec: e.target.value })} placeholder="如：V型" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">周期(月)</label>
                <input className="w-full border rounded-lg p-2 text-sm" type="number" min={1} value={form.default_cycle_months} onChange={e => setForm({ ...form, default_cycle_months: +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">当前库存</label>
                <input className="w-full border rounded-lg p-2 text-sm" type="number" min={0} value={form.current_stock} onChange={e => setForm({ ...form, current_stock: +e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">预警阈值</label>
                <input className="w-full border rounded-lg p-2 text-sm" type="number" min={0} value={form.warning_threshold} onChange={e => setForm({ ...form, warning_threshold: +e.target.value })} /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">国标参考</label>
              <input className="w-full border rounded-lg p-2 text-sm" value={form.gb_ref} onChange={e => setForm({ ...form, gb_ref: e.target.value })} placeholder="GB 39800.1-2020" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <input className="w-full border rounded-lg p-2 text-sm" value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">取消</button>
              <button onClick={save} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700">保存</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════════
   岗位配置 Tab
   ═══════════════════════════════════════════════════════════════════════════════ */

function ConfigsTab() {
  const [data, setData] = useState<any>({ items: [], total: 0, page: 1 });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [supplies, setSupplies] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ position: "爆破工", supply_id: "", cycle_months: 12, qty_per_cycle: 1 });

  const load = useCallback(async () => {
    const [res, sups] = await Promise.all([
      api.laborConfigs(page, 20, search),
      api.laborSuppliesAll(),
    ]);
    setData(res);
    setSupplies(sups);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditId(null);
    setForm({ position: "爆破工", supply_id: "", cycle_months: 12, qty_per_cycle: 1 });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditId(item.id);
    setForm({ position: item.position, supply_id: item.supply_id, cycle_months: item.cycle_months, qty_per_cycle: item.qty_per_cycle });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.supply_id) return alert("请选择劳保用品");
    // 附加用品名称
    const supply = supplies.find((s: any) => s.id === form.supply_id);
    const payload = { ...form, supply_name: supply?.name || "" };
    if (editId) await api.laborConfigUpdate(editId, payload);
    else await api.laborConfigCreate(payload);
    setShowModal(false);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("确认删除？")) return;
    await api.laborConfigDelete(id);
    load();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" placeholder="搜索岗位..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <button onClick={openNew} className="px-3 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 flex items-center gap-1">
          <Plus size={14} />新增配置
        </button>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2.5">岗位</th>
              <th className="text-left px-3 py-2.5">劳保用品</th>
              <th className="text-left px-3 py-2.5">周期(月)</th>
              <th className="text-left px-3 py-2.5">每次数量</th>
              <th className="text-right px-3 py-2.5">操作</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((c: any) => (
              <tr key={c.id} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs font-medium">{c.position}</span>
                </td>
                <td className="px-3 py-2 font-medium">{c.supply_name}</td>
                <td className="px-3 py-2">{c.cycle_months}</td>
                <td className="px-3 py-2">{c.qty_per_cycle}</td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => openEdit(c)} className="text-slate-400 hover:text-blue-600 p-1"><Edit2 size={15} /></button>
                  <button onClick={() => del(c.id)} className="text-slate-400 hover:text-red-600 p-1 ml-1"><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
            {!data.items?.length && (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400">暂无配置</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <Modal open={showModal} onClose={() => setShowModal(false)} title={editId ? "编辑岗位配置" : "新增岗位配置"}>
          <div className="space-y-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">岗位 *</label>
              <select className="w-full border rounded-lg p-2 text-sm" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}>
                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">劳保用品 *</label>
              <select className="w-full border rounded-lg p-2 text-sm" value={form.supply_id} onChange={e => setForm({ ...form, supply_id: e.target.value })}>
                <option value="">请选择</option>
                {supplies.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.category})</option>)}
              </select></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">周期(月)</label>
                <input className="w-full border rounded-lg p-2 text-sm" type="number" min={1} value={form.cycle_months} onChange={e => setForm({ ...form, cycle_months: +e.target.value })} /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">每次数量</label>
                <input className="w-full border rounded-lg p-2 text-sm" type="number" min={0.5} step={0.5} value={form.qty_per_cycle} onChange={e => setForm({ ...form, qty_per_cycle: +e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">取消</button>
              <button onClick={save} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700">保存</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════════
   待领取 Tab
   ═══════════════════════════════════════════════════════════════════════════════ */

function PendingTab() {
  const [items, setItems] = useState<any[]>([]);
  const [positionFilter, setPositionFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [supplies, setSupplies] = useState<any[]>([]);

  const load = async () => {
    const [res, sups] = await Promise.all([api.laborPending(positionFilter), api.laborSuppliesAll()]);
    setItems(res);
    setSupplies(sups);
  };

  useEffect(() => { load(); }, [positionFilter]);

  const distribute = async () => {
    if (!selected) return;
    const supply = supplies.find(s => s.id === selected.supply_id);
    if (supply?.current_stock <= 0) {
      alert("库存不足，无法发放");
      return;
    }
    try {
      await api.laborDistribute({
        employee_id: selected.employee_id,
        supply_id: selected.supply_id,
        quantity: selected.qty_per_cycle,
      });
      setShowModal(false);
      load();
    } catch (e: any) {
      alert(e.message || "发放失败");
    }
  };

  const getDaysEarly = (planned: string) => {
    if (!planned) return 0;
    try {
      const today = new Date().toISOString().split('T')[0];
      const p = new Date(planned);
      const t = new Date(today);
      return Math.floor((p.getTime() - t.getTime()) / 86400000);
    } catch { return 0; }
  };

  const statusColor = (days: number) => {
    if (days < 0) return "text-red-600 bg-red-50";
    if (days <= 30) return "text-amber-600 bg-amber-50";
    return "text-green-600 bg-green-50";
  };

  const statusText = (days: number) => {
    if (days < -365) return "从未领取";
    if (days < 0) return `过期${Math.abs(days)}天`;
    if (days === 0) return "今日到期";
    return `${days}天后到期`;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <select className="border rounded-lg px-3 py-2 text-sm" value={positionFilter} onChange={e => setPositionFilter(e.target.value)}>
          <option value="">全部岗位</option>
          {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button onClick={load} className="px-3 py-2 border rounded-lg text-sm hover:bg-slate-50">刷新</button>
        <span className="text-sm text-slate-400 ml-auto">{items.length} 条记录</span>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2.5">员工</th>
              <th className="text-left px-3 py-2.5">编号</th>
              <th className="text-left px-3 py-2.5">岗位</th>
              <th className="text-left px-3 py-2.5">劳保用品</th>
              <th className="text-left px-3 py-2.5">周期(月)</th>
              <th className="text-left px-3 py-2.5">下次应领</th>
              <th className="text-left px-3 py-2.5">状态</th>
              <th className="text-right px-3 py-2.5">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-t hover:bg-slate-50">
                <td className="px-3 py-2 font-medium">{item.employee_name}</td>
                <td className="px-3 py-2 text-slate-500">{item.employee_no}</td>
                <td className="px-3 py-2">
                  <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs">{item.position}</span>
                </td>
                <td className="px-3 py-2">{item.supply_name}</td>
                <td className="px-3 py-2">{item.cycle_months}</td>
                <td className="px-3 py-2">{item.next_date || "-"}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(item.days_remaining)}`}>
                    {statusText(item.days_remaining)}
                  </span>
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => { setSelected(item); setShowModal(true); }}
                    className="px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs hover:bg-violet-700">
                    发放
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">暂无待领取记录</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && selected && (
        <Modal open={showModal} onClose={() => setShowModal(false)} title="确认发放">
          <div className="space-y-3">
            {(() => {
              const daysEarly = getDaysEarly(selected.next_date);
              const supply = supplies.find(s => s.id === selected.supply_id);
              return (
                <>
                  {daysEarly > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle size={16} className="text-amber-600 mt-0.5" />
                      <div className="text-sm text-amber-800">
                        <div className="font-semibold">提前领取警告</div>
                        <div className="mt-1">此员工将提前 {daysEarly} 天领取，确认继续？</div>
                      </div>
                    </div>
                  )}
                  {supply && supply.current_stock <= 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                      <AlertTriangle size={16} className="text-red-600 mt-0.5" />
                      <div className="text-sm text-red-800 font-semibold">库存为0，无法发放</div>
                    </div>
                  )}
                  <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                    <p><span className="text-slate-500">员工：</span>{selected.employee_name} ({selected.employee_no})</p>
                    <p><span className="text-slate-500">岗位：</span>{selected.position}</p>
                    <p><span className="text-slate-500">用品：</span>{selected.supply_name}</p>
                    <p><span className="text-slate-500">数量：</span>{selected.qty_per_cycle}</p>
                    {supply && <p><span className="text-slate-500">当前库存：</span>{supply.current_stock}</p>}
                  </div>
                </>
              );
            })()}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded-lg text-sm">取消</button>
              <button onClick={distribute} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700">确认发放</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════════
   领取记录 Tab
   ═══════════════════════════════════════════════════════════════════════════════ */

function DistributionsTab() {
  const [data, setData] = useState<any>({ items: [], total: 0, page: 1 });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    const res = await api.laborDistributions(page, 20, search);
    setData(res);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" placeholder="搜索员工/用品..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <span className="text-sm text-slate-400 ml-auto">共 {data.total} 条</span>
      </div>

      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2.5">员工</th>
              <th className="text-left px-3 py-2.5">编号</th>
              <th className="text-left px-3 py-2.5">岗位</th>
              <th className="text-left px-3 py-2.5">用品</th>
              <th className="text-left px-3 py-2.5">数量</th>
              <th className="text-left px-3 py-2.5">应领日期</th>
              <th className="text-left px-3 py-2.5">实领日期</th>
              <th className="text-left px-3 py-2.5">下次应领</th>
            </tr>
          </thead>
          <tbody>
            {data.items?.map((d: any) => {
              const overdue = d.planned_date && d.actual_date && d.actual_date > d.planned_date;
              return (
                <tr key={d.id} className="border-t hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium">{d.employee_name}</td>
                  <td className="px-3 py-2 text-slate-500">{d.employee_no}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full text-xs">{d.position}</span>
                  </td>
                  <td className="px-3 py-2">{d.supply_name}</td>
                  <td className="px-3 py-2">{d.quantity}</td>
                  <td className="px-3 py-2">
                    <span className={overdue ? "text-red-500" : ""}>{d.planned_date || "-"}</span>
                  </td>
                  <td className="px-3 py-2">{d.actual_date}</td>
                  <td className="px-3 py-2 text-blue-600">{d.next_date}</td>
                </tr>
              );
            })}
            {!data.items?.length && (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">暂无领取记录</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data.pages > 1 && (
        <div className="flex justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-3 py-1 border rounded text-sm disabled:opacity-40">上一页</button>
          <span className="px-3 py-1 text-sm text-slate-500">{page}/{data.pages}</span>
          <button onClick={() => setPage(Math.min(data.pages, page + 1))} disabled={page >= data.pages} className="px-3 py-1 border rounded text-sm disabled:opacity-40">下一页</button>
        </div>
      )}
    </div>
  );
}

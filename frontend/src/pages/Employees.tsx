import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import { Plus, Edit2, Trash2, ShoppingCart, Search, Download, QrCode, Upload, Building2, Briefcase, Users, Wrench } from "lucide-react";
import ImportModal from "../components/ImportModal";
import { Employee } from '../types';

const ROLE_LABELS: Record<string, string> = {
  super_admin: "超级管理员",
  admin: "仓库管理员",
  claimer: "领料人",
  normal: "普通员工",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  claimer: "bg-green-100 text-green-700",
  normal: "bg-gray-100 text-gray-600",
};

const POSITION_OPTIONS = [
  "班组长", "代班长", "队长", "车间主任", "安全主管",
];

const JOB_TYPE_OPTIONS = [
  "爆破工", "电工", "焊工", "钳工", "起重工", "信号工", "凿岩工", "装载机司机",
];

// ─── HR顶级Tab定义 ───
type HRTab = "employees" | "departments" | "positions" | "job_types" | "roles";
const HR_TABS: { key: HRTab; label: string; icon: any }[] = [
  { key: "employees", label: "员工档案", icon: Users },
  { key: "departments", label: "部门管理", icon: Building2 },
  { key: "positions", label: "岗位管理", icon: Briefcase },
  { key: "job_types", label: "工种管理", icon: Wrench },
  { key: "roles", label: "角色管理", icon: Users },
];

// ─── 配置列表子组件（部门/岗位/工种/角色共用）───
function ConfigListTab({ configType }: { configType: string }) {
  const [items, setItems] = useState<string[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmModal, setConfirmModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const load = async () => {
    try {
      const res = await api.getMasterConfig(configType);
      setItems(res.items || []);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => { load(); }, [configType]);

  const handleAdd = async () => {
    try {
      await api.addMasterConfig(configType, newName);
      setAddModal(false);
      setNewName("");
      load();
    } catch (e: any) {
      setErrorMessage(e.message || "添加失败");
      setErrorModal(true);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await api.deleteMasterConfig(configType, pendingDelete);
      setConfirmModal(false);
      setPendingDelete(null);
      load();
    } catch (e: any) {
      setErrorMessage(e.message || "删除失败");
      setErrorModal(true);
      setConfirmModal(false);
    }
  };

  const tabLabel = HR_TABS.find(t => t.key === configType)?.label?.replace("管理", "") || configType;

  return (
    <div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-sm font-medium text-gray-700">
            {tabLabel}列表（{items.length}项）
          </span>
          <button onClick={() => { setNewName(""); setAddModal(true); }}
            className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
            <Plus size={14} /> 新增
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-gray-600">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold">名称</th>
              <th className="px-4 py-2.5 text-center font-semibold w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((name, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5">{name}</td>
                <td className="px-4 py-2.5 text-center">
                  <button onClick={() => { setPendingDelete(name); setConfirmModal(true); }}
                    className="p-1.5 text-gray-400 hover:text-red-500">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={2} className="text-center text-gray-400 py-8">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 新增弹窗 */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title={`新增${tabLabel}`}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
            <input className="w-full border rounded-lg p-2 text-sm" placeholder="请输入名称"
              value={newName} onChange={e => setNewName(e.target.value)} />
          </div>
          <button onClick={handleAdd} className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium">确认添加</button>
        </div>
      </Modal>

      {/* 删除确认 */}
      <Modal open={confirmModal} onClose={() => setConfirmModal(false)} title="确认删除">
        <p>确认删除 "{pendingDelete}"？此操作不可恢复。</p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setConfirmModal(false)} className="flex-1 border rounded-lg py-2 text-sm">取消</button>
          <button onClick={handleDelete} className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm">删除</button>
        </div>
      </Modal>

      {/* 错误弹窗 */}
      <Modal open={errorModal} onClose={() => setErrorModal(false)} title="操作失败">
        <p>{errorMessage}</p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setErrorModal(false)} className="w-full border rounded-lg py-2 text-sm">确定</button>
        </div>
      </Modal>
    </div>
  );
}

// ─── 主组件：人力资源管理 ───
export default function Employees() {
  const [hrTab, setHrTab] = useState<HRTab>("employees");

  // ─── 员工档案相关状态 ───
  const [items, setItems] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [claimModal, setClaimModal] = useState(false);
  const [form, setForm] = useState({ name: "", department: "", position: "", job_type: "", education: "", id_card: "", address: "", monthly_quota: 1000, role: "claimer" });
  const [surname, setSurname] = useState("");
  const [givenName, setGivenName] = useState("");
  const [previewNo, setPreviewNo] = useState("");
  const [claim, setClaim] = useState({ employee_id: "", product_id: "", quantity: 1 });
  const [claimEmployees, setClaimEmployees] = useState<any[]>([]);
  const [claimProducts, setClaimProducts] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirmModal, setBulkConfirmModal] = useState(false);
  const [importModal, setImportModal] = useState(false);

  const load = () => api.getEmployees(search).then((r: any) => setItems(r.items || r));
  useEffect(() => { if (hrTab === "employees") load(); }, [search, hrTab]);

  // 前端筛选
  const filteredItems = useMemo(() => {
    return items.filter((item: any) => {
      if (filterDept && item.department !== filterDept) return false;
      if (filterRole && item.role !== filterRole) return false;
      if (filterPosition && (item as any).position !== filterPosition) return false;
      return true;
    });
  }, [items, filterDept, filterRole, filterPosition]);

  // 提取去重的部门/角色/岗位列表
  const deptOptions = useMemo(() => [...new Set(items.map((e: any) => e.department).filter(Boolean))].sort(), [items]);
  const roleOptions = useMemo(() => [...new Set(items.map((e: any) => e.role).filter(Boolean))].sort(), [items]);
  const positionOptions = useMemo(() => [...new Set(items.map((e: any) => (e as any).position).filter(Boolean))].sort(), [items]);

  // 工号预览：position或姓名变化时调用API
  const fetchPreviewNo = useCallback(async (position: string, name: string) => {
    if (position && name) {
      try {
        const res = await api.getNextEmployeeNo(position, name);
        setPreviewNo(res.employee_no || "");
      } catch {
        setPreviewNo("");
      }
    } else {
      setPreviewNo("");
    }
  }, []);

  useEffect(() => {
    const fullName = surname + givenName;
    if (!editing) {
      fetchPreviewNo(form.position, fullName);
    }
  }, [form.position, surname, givenName, editing, fetchPreviewNo]);

  const openNew = () => {
    setEditing(null);
    setSurname("");
    setGivenName("");
    setPreviewNo("");
    setForm({ name: "", department: "", position: "", job_type: "", education: "", id_card: "", address: "", monthly_quota: 1000, role: "claimer" });
    setModal(true);
  };
  const openEdit = (item: Employee) => {
    setEditing(item);
    const fullName = item.name || "";
    setSurname(fullName ? fullName[0] : "");
    setGivenName(fullName.length > 1 ? fullName.slice(1) : "");
    setPreviewNo(item.employee_no || "");
    setForm({
      name: item.name || "",
      department: item.department || "",
      position: (item as any).position || "",
      job_type: (item as any).job_type || "",
      education: (item as any).education || "",
      id_card: (item as any).id_card || "",
      address: (item as any).address || "",
      monthly_quota: item.monthly_quota || 1000,
      role: (item as any).role || "claimer",
    });
    setModal(true);
  };
  const save = async () => {
    try {
      const fullName = surname + givenName;
      const saveData = { ...form, name: fullName, employee_no: previewNo };
      if (editing) await api.updateEmployee(editing.id, saveData);
      else await api.createEmployee(saveData);
      setModal(false);
      setEditing(null);
      setSurname("");
      setGivenName("");
      setPreviewNo("");
      setForm({ name: "", department: "", position: "", job_type: "", education: "", id_card: "", address: "", monthly_quota: 1000, role: "claimer" });
      load();
    } catch (e: any) {
      setErrorMessage(e.message || "保存失败");
      setErrorModal(true);
    }
  };
  const confirmDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmModal(true);
  };
  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    await api.deleteEmployee(pendingDeleteId);
    setConfirmModal(false);
    setPendingDeleteId(null);
    load();
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === filteredItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredItems.map((i: any) => i.id)));
    }
  };
  const handleBulkDelete = async () => {
    for (const id of selected) {
      await api.deleteEmployee(id);
    }
    setBulkConfirmModal(false);
    setSelected(new Set());
    load();
  };

  const downloadQR = async (item: any) => {
    try {
      const blob = await api.getEmployeeQR(item.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.name}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErrorMessage(e?.message || "二维码下载失败");
      setErrorModal(true);
    }
  };

  const openClaim = () => {
    api.getEmployees().then((r: any) => setClaimEmployees(r.items || r));
    api.getProducts(1, "", 100).then((r: any) => setClaimProducts(r.items || r));
    setClaim({ employee_id: "", product_id: "", quantity: 1 });
    setClaimModal(true);
  };

  const doClaim = async () => {
    try { await api.claimItem(claim); setClaimModal(false); } catch (e: any) {
      setErrorMessage(e.message);
      setErrorModal(true);
    }
  };

  return (
    <div>
      {/* ─── 页面标题 ─── */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">👥 人力资源管理</h1>
      </div>

      {/* ─── HR顶级Tab导航 ─── */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 overflow-x-auto">
        {HR_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setHrTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              hrTab === tab.key
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── 配置Tab内容（部门/岗位/工种/角色）─── */}
      {hrTab !== "employees" && <ConfigListTab configType={hrTab} />}

      {/* ─── 员工档案Tab内容 ─── */}
      {hrTab === "employees" && (
      <>
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          {selected.size > 0 && (
            <span className="text-sm text-gray-600 flex items-center gap-1">
              已选{selected.size}人
              <button onClick={() => setBulkConfirmModal(true)} className="bg-red-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"><Trash2 size={16} /> 批量删除</button>
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => api.exportEmployees()} className="border px-3 py-2 rounded-lg text-sm flex items-center gap-1 text-gray-600"><Download size={16} /> 导出</button>
          <button onClick={() => setImportModal(true)} className="border px-3 py-2 rounded-lg text-sm flex items-center gap-1 text-green-600 hover:bg-green-50"><Upload size={16} /> 导入</button>
          <button onClick={openClaim} className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"><ShoppingCart size={16} /> 领用</button>
          <button onClick={openNew} className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"><Plus size={16} /> 新增</button>
        </div>
      </div>

      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            placeholder="搜索姓名/工号/部门/角色..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">部门</label>
            <select className="border rounded-lg px-2 py-1.5 text-sm" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
              <option value="">全部部门</option>
              {deptOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">角色</label>
            <select className="border rounded-lg px-2 py-1.5 text-sm" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
              <option value="">全部角色</option>
              {roleOptions.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-0.5">岗位</label>
            <select className="border rounded-lg px-2 py-1.5 text-sm" value={filterPosition} onChange={e => setFilterPosition(e.target.value)}>
              <option value="">全部岗位</option>
              {positionOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-600">
              <tr>
                <th className="px-3 py-2.5 text-center font-semibold w-12">序号</th>
                <th className="px-3 py-2.5 text-left font-semibold">工号</th>
                <th className="px-3 py-2.5 text-left font-semibold">姓名</th>
                <th className="px-3 py-2.5 text-left font-semibold">角色</th>
                <th className="px-3 py-2.5 text-left font-semibold">部门</th>
                <th className="px-3 py-2.5 text-left font-semibold">岗位</th>
                <th className="px-3 py-2.5 text-left font-semibold">工种</th>
                <th className="px-3 py-2.5 text-left font-semibold">月额度</th>
                <th className="px-3 py-2.5 text-left font-semibold">已用</th>
                <th className="px-3 py-2.5 text-center font-semibold w-12">
                  <input type="checkbox" className="rounded" checked={filteredItems.length > 0 && selected.size === filteredItems.length} onChange={toggleSelectAll} />
                </th>
                <th className="px-3 py-2.5 text-center font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item: any, index: number) => (
                <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 text-center text-gray-400">{index + 1}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{item.employee_no}</td>
                  <td className="px-3 py-2.5 font-medium">{item.name}</td>
                  <td className="px-3 py-2.5">
                    {item.role && (
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[item.role] || "bg-gray-100 text-gray-600"}`}>
                        {ROLE_LABELS[item.role] || item.role}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{item.department || "未分配"}</td>
                  <td className="px-3 py-2.5 text-gray-500">{(item as any).position || "-"}</td>
                  <td className="px-3 py-2.5 text-gray-500">{(item as any).job_type || "-"}</td>
                  <td className="px-3 py-2.5 text-gray-500">{item.monthly_quota && item.monthly_quota > 0 ? `¥${item.monthly_quota}` : "—"}</td>
                  <td className="px-3 py-2.5 text-gray-500">{item.monthly_used && item.monthly_used > 0 ? `¥${item.monthly_used}` : "—"}</td>
                  <td className="px-3 py-2.5 text-center">
                    <input type="checkbox" className="rounded" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} />
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <button onClick={() => downloadQR(item)} className="p-1.5 text-gray-400 hover:text-green-500" title="二维码"><QrCode size={15} /></button>
                      <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-500"><Edit2 size={15} /></button>
                      <button onClick={() => confirmDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={11} className="text-center text-gray-400 py-8">暂无员工</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      {/* ─── 员工编辑/新增弹窗 ─── */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "编辑员工" : "新增员工"}>
        <div className="space-y-3">
          {/* 姓名：姓+名 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">姓 *</label>
              <input className="w-full border rounded-lg p-2 text-sm" placeholder="姓" value={surname} onChange={e => setSurname(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名 *</label>
              <input className="w-full border rounded-lg p-2 text-sm" placeholder="名" value={givenName} onChange={e => setGivenName(e.target.value)} />
            </div>
          </div>
          {/* 部门 + 岗位 */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">部门</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="所属部门" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">岗位</label>
              <select className="w-full border rounded-lg p-2 text-sm" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}>
                <option value="">选择岗位</option>
                {POSITION_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          {/* 工种 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">工种</label>
            <select className="w-full border rounded-lg p-2 text-sm" value={form.job_type} onChange={e => setForm({ ...form, job_type: e.target.value })}>
              <option value="">选择工种</option>
              {JOB_TYPE_OPTIONS.map(j => <option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          {/* 工号（只读预览） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">工号</label>
            <input className="w-full border rounded-lg p-2 text-sm bg-gray-100" placeholder="选择岗位并填写姓名后自动生成" value={previewNo} readOnly />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">学历</label>
              <select className="w-full border rounded-lg p-2 text-sm" value={form.education} onChange={e => setForm({ ...form, education: e.target.value })}>
                <option value="">选择学历</option>
                <option value="初中">初中</option>
                <option value="高中">高中</option>
                <option value="大专">大专</option>
                <option value="本科">本科</option>
                <option value="硕士">硕士</option>
                <option value="博士">博士</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">身份证号</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="18位身份证号" value={form.id_card} onChange={e => setForm({ ...form, id_card: e.target.value })} /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">地址</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="家庭住址" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
            <select className="w-full border rounded-lg p-2 text-sm" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              <option value="claimer">领料人</option>
              <option value="admin">仓库管理员</option>
              <option value="super_admin">超级管理员</option>
              <option value="normal">普通员工</option>
            </select>
          </div>
          <button onClick={save} className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium">{editing ? "保存修改" : "创建"}</button>
        </div>
      </Modal>

      {/* ─── 领用弹窗 ─── */}
      <Modal open={claimModal} onClose={() => setClaimModal(false)} title="员工领用">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">员工</label>
            <select className="w-full border rounded-lg p-2 text-sm" value={claim.employee_id}
              onChange={e => setClaim({ ...claim, employee_id: e.target.value })}>
              <option value="">选择员工</option>
              {claimEmployees.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({e.employee_no})</option>)}
            </select>
            {claim.employee_id && (() => {
              const emp = claimEmployees.find((e: any) => e.id === claim.employee_id);
              return emp ? (
                <div className="text-xs text-gray-500 mt-1">
                  部门: {emp.department || '未分配'} · 岗位: {emp.position || '-'} · 工种: {emp.job_type || '-'}
                </div>
              ) : null;
            })()}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">商品</label>
            <select className="w-full border rounded-lg p-2 text-sm" value={claim.product_id}
              onChange={e => setClaim({ ...claim, product_id: e.target.value })}>
              <option value="">选择商品</option>
              {claimProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku || p.id})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
            <input className="w-full border rounded-lg p-2 text-sm" type="number" min={1} placeholder="数量" value={claim.quantity}
              onChange={e => setClaim({ ...claim, quantity: +e.target.value })} />
          </div>
          <button onClick={doClaim} className="w-full bg-green-500 text-white py-2 rounded-lg font-medium">确认领用</button>
        </div>
      </Modal>

      {/* ─── 通用弹窗 ─── */}
      <Modal open={confirmModal} onClose={() => setConfirmModal(false)} title="确认删除">
        <p>确认删除该员工？此操作不可恢复。</p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setConfirmModal(false)} className="flex-1 border rounded-lg py-2 text-sm">取消</button>
          <button onClick={handleDelete} className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm">删除</button>
        </div>
      </Modal>

      <Modal open={bulkConfirmModal} onClose={() => setBulkConfirmModal(false)} title="确认批量删除">
        <p>确认删除选中的 {selected.size} 名员工？此操作不可恢复。</p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setBulkConfirmModal(false)} className="flex-1 border rounded-lg py-2 text-sm">取消</button>
          <button onClick={handleBulkDelete} className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm">删除</button>
        </div>
      </Modal>

      <Modal open={errorModal} onClose={() => setErrorModal(false)} title="操作失败">
        <p>{errorMessage}</p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setErrorModal(false)} className="w-full border rounded-lg py-2 text-sm">确定</button>
        </div>
      </Modal>

      {/* 导入弹窗 */}
      <ImportModal
        open={importModal}
        onClose={() => setImportModal(false)}
        templateType="employees"
        onImport={(file) => api.uploadEmployees(file)}
        onSuccess={() => load()}
        moduleName="员工"
      />
    </div>
  );
}

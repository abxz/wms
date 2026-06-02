import { useEffect, useState } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import { Plus, Edit2, Trash2, ShoppingCart, Search, Download, QrCode } from "lucide-react";
import { Employee } from '../types';

const ROLE_LABELS: Record<string, string> = {
  super_admin: "超级管理员",
  admin: "管理员",
  claimer: "领料员",
};

const ROLE_COLORS: Record<string, string> = {
  super_admin: "bg-purple-100 text-purple-700",
  admin: "bg-blue-100 text-blue-700",
  claimer: "bg-green-100 text-green-700",
};

export default function Employees() {
  const [items, setItems] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [claimModal, setClaimModal] = useState(false);
  const [form, setForm] = useState({ name: "", department: "", monthly_quota: 1000, role: "claimer" });
  const [claim, setClaim] = useState({ employee_id: "", product_id: "", quantity: 1 });
  const [claimEmployees, setClaimEmployees] = useState<any[]>([]);
  const [claimProducts, setClaimProducts] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const load = () => api.getEmployees(search).then((r: any) => setItems(r.items || r));
  useEffect(() => { load(); }, [search]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", department: "", monthly_quota: 1000, role: "claimer" });
    setModal(true);
  };
  const openEdit = (item: Employee) => {
    setEditing(item);
    setForm({
      name: item.name || "",
      department: item.department || "",
      monthly_quota: item.monthly_quota || 1000,
      role: (item as any).role || "claimer",
    });
    setModal(true);
  };
  const save = async () => {
    try {
      if (editing) await api.updateEmployee(editing.id, form);
      else await api.createEmployee(form);
      setModal(false);
      setEditing(null);
      setForm({ name: "", department: "", monthly_quota: 1000, role: "claimer" });
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
    api.getProducts(1, "", 999).then((r: any) => setClaimProducts(r.items || r));
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
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">👤 员工管理</h1>
        <div className="flex gap-2">
          <button onClick={() => api.exportEmployees()} className="border px-3 py-2 rounded-lg text-sm flex items-center gap-1 text-gray-600"><Download size={16} /> 导出</button>
          <button onClick={openClaim} className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"><ShoppingCart size={16} /> 领用</button>
          <button onClick={openNew} className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"><Plus size={16} /> 新增</button>
        </div>
      </div>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
          placeholder="搜索姓名/工号/部门/角色..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {items.map((item: any) => (
          <div key={item.id} className="bg-white rounded-xl p-3 border flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{item.name} <span className="text-xs text-gray-400">{item.employee_no}</span></p>
                {item.role && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[item.role] || "bg-gray-100 text-gray-600"}`}>
                    {ROLE_LABELS[item.role] || item.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400">{item.department || "未分配"} · 额度: ¥{item.monthly_used}/{item.monthly_quota}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => downloadQR(item)} className="p-1.5 text-gray-400 hover:text-green-500" title="二维码"><QrCode size={15} /></button>
              <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-500"><Edit2 size={15} /></button>
              <button onClick={() => confirmDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-gray-400 py-8">暂无员工</p>}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "编辑员工" : "新增员工"}>
        <div className="space-y-3">
          <input className="w-full border rounded-lg p-2 text-sm" placeholder="姓名 *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="w-full border rounded-lg p-2 text-sm" placeholder="部门" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
          <input className="w-full border rounded-lg p-2 text-sm" type="number" placeholder="月度配额" value={form.monthly_quota} onChange={e => setForm({ ...form, monthly_quota: +e.target.value })} />
          <select className="w-full border rounded-lg p-2 text-sm" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            <option value="claimer">领料员</option>
            <option value="admin">管理员</option>
            <option value="super_admin">超级管理员</option>
          </select>
          <button onClick={save} className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium">{editing ? "保存修改" : "创建"}</button>
        </div>
      </Modal>

      <Modal open={claimModal} onClose={() => setClaimModal(false)} title="员工领用">
        <div className="space-y-3">
          <select className="w-full border rounded-lg p-2 text-sm" value={claim.employee_id}
            onChange={e => setClaim({ ...claim, employee_id: e.target.value })}>
            <option value="">选择员工</option>
            {claimEmployees.map((e: any) => <option key={e.id} value={e.id}>{e.name} ({e.employee_no})</option>)}
          </select>
          <select className="w-full border rounded-lg p-2 text-sm" value={claim.product_id}
            onChange={e => setClaim({ ...claim, product_id: e.target.value })}>
            <option value="">选择商品</option>
            {claimProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku || p.id})</option>)}
          </select>
          <input className="w-full border rounded-lg p-2 text-sm" type="number" min={1} placeholder="数量" value={claim.quantity}
            onChange={e => setClaim({ ...claim, quantity: +e.target.value })} />
          <button onClick={doClaim} className="w-full bg-green-500 text-white py-2 rounded-lg font-medium">确认领用</button>
        </div>
      </Modal>

      <Modal open={confirmModal} onClose={() => setConfirmModal(false)} title="确认删除">
        <p>确认删除该员工？此操作不可恢复。</p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setConfirmModal(false)} className="flex-1 border rounded-lg py-2 text-sm">取消</button>
          <button onClick={handleDelete} className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm">删除</button>
        </div>
      </Modal>

      <Modal open={errorModal} onClose={() => setErrorModal(false)} title="操作失败">
        <p>{errorMessage}</p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setErrorModal(false)} className="w-full border rounded-lg py-2 text-sm">确定</button>
        </div>
      </Modal>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Supplier } from '../types';

export default function Suppliers() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", contact: "", phone: "", address: "", remark: "" });
  const [confirmModal, setConfirmModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = () => api.getSuppliers().then((r: any) => setItems(r.items || r));
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", contact: "", phone: "", address: "", remark: "" });
    setModal(true);
  };
  const openEdit = (item: Supplier) => {
    setEditing(item);
    setForm({
      name: item.name || "",
      contact: item.contact || "",
      phone: item.phone || "",
      address: item.address || "",
      remark: item.remark || "",
    });
    setModal(true);
  };
  const save = async () => {
    if (editing) await api.updateSupplier(editing.id, form);
    else await api.createSupplier(form);
    setModal(false);
    setEditing(null);
    setForm({ name: "", contact: "", phone: "", address: "", remark: "" });
    load();
  };
  const confirmDelete = (id: string) => {
    setPendingDeleteId(id);
    setConfirmModal(true);
  };
  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    await api.deleteSupplier(pendingDeleteId);
    setConfirmModal(false);
    setPendingDeleteId(null);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">👥 供应商</h1>
        <button onClick={openNew} className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"><Plus size={16} /> 新增</button>
      </div>
      <div className="space-y-2">
        {items.map((item: any) => (
          <div key={item.id} className="bg-white rounded-xl p-3 border flex items-center justify-between">
            <div>
              <p className="font-medium">{item.name}</p>
              <p className="text-xs text-gray-400">{item.contact} · {item.phone} {item.address ? `· ${item.address}` : ""}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-500"><Edit2 size={15} /></button>
              <button onClick={() => confirmDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-gray-400 py-8">暂无供应商</p>}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "编辑供应商" : "新增供应商"}>
        <div className="space-y-3">
          <input className="w-full border rounded-lg p-2 text-sm" placeholder="名称 *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <input className="w-full border rounded-lg p-2 text-sm" placeholder="联系人" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
            <input className="w-full border rounded-lg p-2 text-sm" placeholder="电话" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
          </div>
          <input className="w-full border rounded-lg p-2 text-sm" placeholder="地址" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
          <textarea className="w-full border rounded-lg p-2 text-sm resize-none" placeholder="备注" rows={2} value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} />
          <button onClick={save} className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium">{editing ? "保存修改" : "创建"}</button>
        </div>
      </Modal>
      <Modal open={confirmModal} onClose={() => setConfirmModal(false)} title="确认删除">
        <p>确认删除该供应商？此操作不可恢复。</p>
        <div className="flex gap-2 mt-4">
          <button onClick={() => setConfirmModal(false)} className="flex-1 border rounded-lg py-2 text-sm">取消</button>
          <button onClick={handleDelete} className="flex-1 bg-red-500 text-white rounded-lg py-2 text-sm">删除</button>
        </div>
      </Modal>
    </div>
  );
}

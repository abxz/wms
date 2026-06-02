import { useEffect, useState } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import ImportModal from "../components/ImportModal";
import { Plus, Edit2, Trash2, Download, Upload } from "lucide-react";
import { Supplier } from '../types';

export default function Suppliers() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", contact: "", phone: "", address: "", remark: "" });
  const [confirmModal, setConfirmModal] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [importModal, setImportModal] = useState(false);

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
    try {
      if (editing) await api.updateSupplier(editing.id, form);
      else await api.createSupplier(form);
      setModal(false);
      setEditing(null);
      setForm({ name: "", contact: "", phone: "", address: "", remark: "" });
      load();
    } catch (e: any) {
      alert(e.message || "保存失败");
    }
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
        <div className="flex gap-2">
          <button onClick={() => setImportModal(true)} className="border px-3 py-2 rounded-lg text-sm flex items-center gap-1 text-green-600 hover:bg-green-50"><Upload size={16} /> 导入</button>
          <button onClick={() => api.exportSuppliers()} className="border px-3 py-2 rounded-lg text-sm flex items-center gap-1 text-gray-600"><Download size={16} /> 导出</button>
          <button onClick={openNew} className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"><Plus size={16} /> 新增</button>
        </div>
      </div>
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-600">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">名称</th>
                <th className="px-3 py-2.5 text-left font-semibold">联系人</th>
                <th className="px-3 py-2.5 text-left font-semibold">电话</th>
                <th className="px-3 py-2.5 text-left font-semibold">地址</th>
                <th className="px-3 py-2.5 text-left font-semibold">备注</th>
                <th className="px-3 py-2.5 text-center font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => (
                <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 font-medium">{item.name}</td>
                  <td className="px-3 py-2.5 text-gray-500">{item.contact || "-"}</td>
                  <td className="px-3 py-2.5 text-gray-500">{item.phone || "-"}</td>
                  <td className="px-3 py-2.5 text-gray-500">{item.address || "-"}</td>
                  <td className="px-3 py-2.5 text-gray-400">{item.remark || "-"}</td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-500"><Edit2 size={15} /></button>
                      <button onClick={() => confirmDelete(item.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-8">暂无供应商</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? "编辑供应商" : "新增供应商"}>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="请输入供应商名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">联系人</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="联系人姓名" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">电话</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="联系电话" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">地址</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="供应商地址" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">备注</label><textarea className="w-full border rounded-lg p-2 text-sm resize-none" placeholder="备注信息" rows={2} value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} /></div>
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

      {/* 导入弹窗 */}
      <ImportModal
        open={importModal}
        onClose={() => setImportModal(false)}
        templateType="main-data"
        onImport={(file) => api.importMainData(file)}
        onSuccess={() => load()}
        moduleName="供应商"
      />
    </div>
  );
}

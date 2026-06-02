import { useEffect, useState } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";

const defaultForm = { name: "", code: "", address: "", contact: "", phone: "", remark: "" };

export default function Warehouses() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [deleting, setDeleting] = useState<any | null>(null);

  const load = () =>
    api.getWarehouses().then((r: any) => setItems(r.items || r));

  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter(
    (item) =>
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.code?.toLowerCase().includes(search.toLowerCase()) ||
      item.contact?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditing(null);
    setForm({ ...defaultForm });
    setModal(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      name: item.name || "",
      code: item.code || "",
      address: item.address || "",
      contact: item.contact || "",
      phone: item.phone || "",
      remark: item.remark || "",
    });
    setModal(true);
  };

  const save = async () => {
    try {
      if (editing) {
        await api.updateWarehouse(editing.id, form);
      } else {
        await api.createWarehouse(form);
      }
      setModal(false);
      setEditing(null);
      setForm({ ...defaultForm });
      load();
    } catch (e: any) {
      alert(e.message || "保存失败");
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    await api.deleteWarehouse(deleting.id);
    setDeleting(null);
    load();
  };

  return (
    <div>
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">🏭 仓库管理</h1>
        <button
          onClick={openAdd}
          className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"
        >
          <Plus size={16} /> 新增
        </button>
      </div>

      {/* 搜索 */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm bg-white"
          placeholder="搜索仓库名称、编码或联系人..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-600">
              <tr>
                <th className="px-3 py-2.5 text-left font-semibold">名称</th>
                <th className="px-3 py-2.5 text-left font-semibold">编码</th>
                <th className="px-3 py-2.5 text-left font-semibold">地址</th>
                <th className="px-3 py-2.5 text-left font-semibold">联系人</th>
                <th className="px-3 py-2.5 text-left font-semibold">电话</th>
                <th className="px-3 py-2.5 text-left font-semibold">备注</th>
                <th className="px-3 py-2.5 text-center font-semibold">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item: any) => (
                <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 font-medium">{item.name}</td>
                  <td className="px-3 py-2.5 font-mono text-xs">{item.code}</td>
                  <td className="px-3 py-2.5 text-gray-500">{item.address || "-"}</td>
                  <td className="px-3 py-2.5 text-gray-500">{item.contact || "-"}</td>
                  <td className="px-3 py-2.5 text-gray-500">{item.phone || "-"}</td>
                  <td className="px-3 py-2.5 text-gray-400">{item.remark || "-"}</td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <button onClick={() => openEdit(item)} className="p-1.5 text-gray-400 hover:text-blue-500"><Edit2 size={15} /></button>
                      <button onClick={() => setDeleting(item)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-8">{search ? "未找到匹配的仓库" : "暂无仓库，点击右上角新增"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 新增/编辑弹窗 */}
      <Modal
        open={modal}
        onClose={() => {
          setModal(false);
          setEditing(null);
          setForm(defaultForm);
        }}
        title={editing ? "编辑仓库" : "新增仓库"}
      >
        <div className="space-y-3">
          <input
            className="w-full border rounded-lg p-2 text-sm"
            placeholder="仓库名称 *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="w-full border rounded-lg p-2 text-sm"
            placeholder="仓库编码 *"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <input
            className="w-full border rounded-lg p-2 text-sm"
            placeholder="地址"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="联系人"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
            />
            <input
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="电话"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <textarea
            className="w-full border rounded-lg p-2 text-sm resize-none"
            placeholder="备注"
            rows={2}
            value={form.remark}
            onChange={(e) => setForm({ ...form, remark: e.target.value })}
          />
          <button
            onClick={save}
            className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium"
          >
            {editing ? "保存修改" : "创建"}
          </button>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="确认删除"
      >
        <p className="text-sm text-gray-600 mb-4">
          确定要删除仓库 <strong>{deleting?.name}</strong>（{deleting?.code}）吗？此操作不可恢复。
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleting(null)}
            className="flex-1 border rounded-lg py-2 text-sm font-medium"
          >
            取消
          </button>
          <button
            onClick={confirmDelete}
            className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium"
          >
            确认删除
          </button>
        </div>
      </Modal>
    </div>
  );
}

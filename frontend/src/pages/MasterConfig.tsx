import { useEffect, useState } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import { Plus, Trash2, Building2, Briefcase, Users } from "lucide-react";

const TABS = [
  { key: "departments", label: "部门管理", icon: Building2 },
  { key: "positions", label: "岗位管理", icon: Briefcase },
  { key: "roles", label: "角色管理", icon: Users },
];

export default function MasterConfig() {
  const [activeTab, setActiveTab] = useState("departments");
  const [items, setItems] = useState<string[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [confirmModal, setConfirmModal] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const load = async () => {
    try {
      const res = await api.getMasterConfig(activeTab);
      setItems(res.items || []);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => { load(); }, [activeTab]);

  const handleAdd = async () => {
    try {
      await api.addMasterConfig(activeTab, newName);
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
      await api.deleteMasterConfig(activeTab, pendingDelete);
      setConfirmModal(false);
      setPendingDelete(null);
      load();
    } catch (e: any) {
      setErrorMessage(e.message || "删除失败");
      setErrorModal(true);
      setConfirmModal(false);
    }
  };

  const openAdd = () => {
    setNewName("");
    setAddModal(true);
  };

  const confirmDeleteItem = (name: string) => {
    setPendingDelete(name);
    setConfirmModal(true);
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">⚙️ 基础数据管理</h1>

      {/* Tab切换 */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-1 justify-center ${
              activeTab === tab.key
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="text-sm font-medium text-gray-700">
            {TABS.find(t => t.key === activeTab)?.label}（{items.length}项）
          </span>
          <button onClick={openAdd} className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-1">
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
                  <button onClick={() => confirmDeleteItem(name)} className="p-1.5 text-gray-400 hover:text-red-500">
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
      <Modal open={addModal} onClose={() => setAddModal(false)} title={`新增${TABS.find(t => t.key === activeTab)?.label.replace("管理", "")}`}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
            <input
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="请输入名称"
              value={newName}
              onChange={e => setNewName(e.target.value)}
            />
          </div>
          <button onClick={handleAdd} className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium">确认添加</button>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
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

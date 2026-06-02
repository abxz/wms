import { useEffect, useState, useRef } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import { Download, Upload, Trash2, Database, HardDrive, RefreshCw } from "lucide-react";

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function BackupPage() {
  const [backups, setBackups] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [restoreModal, setRestoreModal] = useState(false);
  const [result, setResult] = useState<{ type: string; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    api.backupList().then((r: any) => setBackups(r.backups || [])).catch(() => {});
    api.backupStats().then(setStats).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const createBackup = async () => {
    setLoading(true);
    try {
      const r = await api.backupCreate();
      setResult({ type: "success", msg: `备份成功：${r.filename}（${formatSize(r.size)}）` });
      load();
    } catch (e: any) {
      setResult({ type: "error", msg: e?.message || "备份失败" });
    }
    setLoading(false);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.backupDelete(deleteTarget);
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      setResult({ type: "error", msg: e?.message || "删除失败" });
    }
  };

  const handleRestore = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    if (!confirm(`确定要恢复数据库吗？\n\n文件：${file.name}\n\n⚠️ 此操作将覆盖当前数据！`)) return;
    setLoading(true);
    try {
      const r = await api.backupRestore(file);
      setResult({ type: "success", msg: r.message || "恢复成功" });
      setRestoreModal(false);
    } catch (e: any) {
      setResult({ type: "error", msg: e?.message || "恢复失败" });
    }
    setLoading(false);
  };

  const tableLabels: Record<string, string> = {
    products: "商品", suppliers: "供应商", employees: "员工",
    inventory: "库存", warehouses: "仓库", locations: "库位",
    inbound_orders: "入库单", outbound_orders: "出库单", invoices: "发票",
    master_products: "基础商品", master_suppliers: "基础供应商", master_employees: "基础员工",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">💾 数据备份</h1>
        <div className="flex gap-2">
          <button onClick={load} className="border px-3 py-2 rounded-lg text-sm flex items-center gap-1 text-gray-600">
            <RefreshCw size={16} /> 刷新
          </button>
          <button onClick={() => setRestoreModal(true)} className="border px-3 py-2 rounded-lg text-sm flex items-center gap-1 text-orange-600">
            <Upload size={16} /> 恢复数据库
          </button>
          <button onClick={createBackup} disabled={loading}
            className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50">
            <Database size={16} /> {loading ? "备份中..." : "立即备份"}
          </button>
        </div>
      </div>

      {/* 数据库统计 */}
      {stats && (
        <div className="bg-white rounded-xl border p-4 mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <HardDrive size={16} /> 数据库概览
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {Object.entries(stats.tables || {}).map(([key, count]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-2 text-center">
                <div className="text-lg font-bold text-blue-600">{count as number}</div>
                <div className="text-xs text-gray-500">{tableLabels[key] || key}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-4 text-sm text-gray-500">
            <span>备份文件：{stats.backup_count} 个</span>
            <span>备份总大小：{formatSize(stats.backup_total_size || 0)}</span>
          </div>
        </div>
      )}

      {/* 备份列表 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50">
          <h3 className="text-sm font-medium text-gray-700">备份历史</h3>
        </div>
        <div className="divide-y">
          {backups.map((b) => (
            <div key={b.filename} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm font-medium">{b.filename}</p>
                <p className="text-xs text-gray-400">{formatSize(b.size)} · {new Date(b.created).toLocaleString("zh-CN")}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => api.backupDownload(b.filename)} className="p-1.5 text-gray-400 hover:text-blue-500" title="下载">
                  <Download size={16} />
                </button>
                <button onClick={() => setDeleteTarget(b.filename)} className="p-1.5 text-gray-400 hover:text-red-500" title="删除">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
          {backups.length === 0 && (
            <div className="text-center text-gray-400 py-8">暂无备份记录</div>
          )}
        </div>
      </div>

      {/* 删除确认 */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="确认删除">
        <p className="mb-4 text-gray-600">确定要删除备份文件 <strong>{deleteTarget}</strong> 吗？</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border rounded-lg text-sm">取消</button>
          <button onClick={confirmDelete} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">删除</button>
        </div>
      </Modal>

      {/* 恢复弹窗 */}
      <Modal open={restoreModal} onClose={() => setRestoreModal(false)} title="恢复数据库">
        <div className="space-y-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-700">
            ⚠️ 恢复操作将覆盖当前数据库中的所有数据，建议先创建备份。
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">选择 .sql 备份文件</label>
            <input ref={fileRef} type="file" accept=".sql"
              className="w-full border rounded-lg p-2 text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700" />
          </div>
          <button onClick={handleRestore} disabled={loading}
            className="w-full bg-orange-500 text-white py-2 rounded-lg font-medium disabled:opacity-50">
            {loading ? "恢复中..." : "确认恢复"}
          </button>
        </div>
      </Modal>

      {/* 结果提示 */}
      <Modal open={result !== null} onClose={() => setResult(null)} title={result?.type === "success" ? "成功" : "错误"}>
        <p className={`mb-4 ${result?.type === "success" ? "text-green-600" : "text-red-600"}`}>{result?.msg}</p>
        <div className="flex justify-end">
          <button onClick={() => setResult(null)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">确定</button>
        </div>
      </Modal>
    </div>
  );
}

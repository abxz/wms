import { useState, useEffect } from "react";
import { api } from "../../services/api";
import { CheckCircle, Clock, AlertCircle, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface SyncItem {
  sync_id: string;
  type: string;
  status: string;
  created_at: string;
  synced_at?: string;
  message?: string;
}

interface SyncStatus {
  total_synced: number;
  today_synced: number;
  last_sync: string | null;
  pending_count?: number;
  failed_count?: number;
}

export default function PdaSyncStatus() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [pending, setPending] = useState<SyncItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/pda/sync/status", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setStatus(await res.json());
    } catch (e) {
      console.error("获取同步状态失败", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const forceSync = async () => {
    // 触发离线队列同步
    const pendingData = localStorage.getItem("pda_sync_queue");
    if (!pendingData) return;
    const items = JSON.parse(pendingData);
    if (items.length === 0) return;

    try {
      const res = await fetch("/api/pda/sync/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token")}`,
        },
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        const result = await res.json();
        // 清除已同步项
        const remaining = items.filter(
          (_: any, i: number) => result.results[i]?.status !== "synced"
        );
        localStorage.setItem("pda_sync_queue", JSON.stringify(remaining));
        loadStatus();
      }
    } catch (e) {
      console.error("同步失败", e);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* 网络状态 */}
      <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
        isOnline ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
      }`}>
        {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
        <span className="font-bold text-lg">
          {isOnline ? "网络在线" : "网络离线 — 数据将本地存储"}
        </span>
      </div>

      {/* 同步统计 */}
      <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
        <h2 className="text-xl font-bold mb-3">同步状态</h2>
        {loading ? (
          <div className="text-gray-400">加载中...</div>
        ) : status ? (
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">{status.total_synced}</div>
              <div className="text-sm text-gray-500">累计同步</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{status.today_synced}</div>
              <div className="text-sm text-gray-500">今日同步</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">{status.pending_count ?? 0}</div>
              <div className="text-sm text-gray-500">待同步</div>
            </div>
          </div>
        ) : (
          <div className="text-gray-400">暂无数据</div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-3 mb-4">
        <button
          onClick={forceSync}
          disabled={!isOnline}
          className="flex-1 h-14 bg-blue-600 text-white text-lg font-bold rounded-xl
                     active:bg-blue-800 disabled:bg-gray-300 flex items-center justify-center gap-2"
        >
          <RefreshCw size={22} />
          立即同步
        </button>
        <button
          onClick={loadStatus}
          className="h-14 bg-gray-200 text-gray-700 text-lg font-bold rounded-xl px-6"
        >
          刷新
        </button>
      </div>

      {/* 离线队列 */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h2 className="text-xl font-bold mb-3">离线队列</h2>
        {(() => {
          const raw = localStorage.getItem("pda_sync_queue");
          const items = raw ? JSON.parse(raw) : [];
          if (items.length === 0) {
            return <div className="text-green-600 text-lg font-bold">✅ 无待同步数据</div>;
          }
          return (
            <div className="space-y-2">
              {items.slice(0, 10).map((item: any, i: number) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                  <Clock size={16} className="text-yellow-500" />
                  <span className="text-sm">{item.type}</span>
                  <span className="text-xs text-gray-400 ml-auto">{item.created_at}</span>
                </div>
              ))}
              {items.length > 10 && (
                <div className="text-center text-gray-400 text-sm">
                  还有 {items.length - 10} 条...
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* 底部导航 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3 max-w-lg mx-auto">
        <a href="/pda/inbound" className="text-center text-gray-500 text-xs">入库</a>
        <a href="/pda/outbound" className="text-center text-gray-500 text-xs">出库</a>
        <a href="/pda/sync-status" className="text-center text-blue-600 text-xs font-bold">同步</a>
        <a href="/pda/inventory" className="text-center text-gray-500 text-xs">盘点</a>
        <a href="/pda/login" className="text-center text-gray-500 text-xs">注销</a>
      </div>
    </div>
  );
}

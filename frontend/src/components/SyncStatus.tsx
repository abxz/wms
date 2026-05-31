import { useEffect, useState, useCallback } from "react";
import { Wifi, WifiOff, RefreshCw, AlertTriangle } from "lucide-react";
import { getOutboundQueueCount, getInboundQueueCount, syncQueues } from "../offline-db";
import { api } from "../services/api";

export default function SyncStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  const [outCount, setOutCount] = useState(0);
  const [inCount, setInCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  const total = outCount + inCount;

  const refreshCounts = useCallback(async () => {
    setOutCount(await getOutboundQueueCount());
    setInCount(await getInboundQueueCount());
  }, []);

  useEffect(() => {
    refreshCounts();
    const interval = setInterval(refreshCounts, 10000);
    return () => clearInterval(interval);
  }, [refreshCounts]);

  useEffect(() => {
    const onOnline = () => { setOnline(true); doSync(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const doSync = useCallback(async () => {
    if (syncing || !navigator.onLine) return;
    setSyncing(true);
    try {
      const result = await syncQueues(
        (order) => api.createOutbound(order),
        (order) => api.createInbound(order)
      );
      if (result.errors.length > 0) {
        console.warn("Sync errors:", result.errors);
      }
      setLastSync(new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }));
      await refreshCounts();
    } finally {
      setSyncing(false);
    }
  }, [syncing, refreshCounts]);

  if (online && total === 0) return null;

  const isWarning = total >= 400;
  const isBlocked = total >= 500;

  const bgColor = isBlocked
    ? "bg-red-500"
    : isWarning
    ? "bg-orange-400"
    : online
    ? "bg-green-500"
    : "bg-yellow-400";

  return (
    <div className={`${bgColor} text-white px-3 py-1.5 flex items-center justify-between text-xs`}>
      <div className="flex items-center gap-1.5">
        {online ? <Wifi size={13} /> : <WifiOff size={13} />}
        <span>{online ? "在线" : "离线"}</span>
        {total > 0 && (
          <>
            <span className="opacity-70">·</span>
            {isWarning && <AlertTriangle size={12} />}
            <span>待同步 {total} 条</span>
          </>
        )}
        {isBlocked && <span className="font-bold">（已阻断，请立即同步）</span>}
        {lastSync && !isBlocked && (
          <span className="opacity-70 ml-1">上次同步 {lastSync}</span>
        )}
      </div>
      {online && total > 0 && (
        <button
          onClick={doSync}
          disabled={syncing}
          className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-xs disabled:opacity-50"
        >
          <RefreshCw size={11} className={syncing ? "animate-spin" : ""} />
          {syncing ? "同步中" : "同步"}
        </button>
      )}
    </div>
  );
}

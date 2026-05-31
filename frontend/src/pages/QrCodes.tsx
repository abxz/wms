import { useEffect, useState, useRef } from "react";
import { api } from "../services/api";
import { Search, Download, RefreshCw, QrCode, AlertTriangle } from "lucide-react";
import Modal from "../components/Modal";
import { Product } from "../types";

const API_BASE = (window as any).__WMS_API_BASE__ || window.location.origin;

function QrImage({ qrUuid }: { qrUuid: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!qrUuid) { setLoading(false); return; }
    fetch(`${API_BASE}/api/barcode/qrcode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: qrUuid }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        const ct = r.headers.get("content-type") || "";
        if (ct.includes("image")) return r.blob().then((b) => URL.createObjectURL(b));
        return r.json().then((j) => j.url || j.path || null);
      })
      .then((url) => { setSrc(url); setLoading(false); })
      .catch(() => setLoading(false));
  }, [qrUuid]);

  if (loading) return <div className="w-12 h-12 bg-gray-100 rounded animate-pulse" />;
  if (!src) return <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-300"><QrCode size={20} /></div>;
  return <img src={src} alt={qrUuid} className="w-12 h-12 rounded border object-contain" />;
}

export default function QrCodes() {
  const [items, setItems] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [errorModal, setErrorModal] = useState("");

  const load = (p = page, s = search) => {
    setLoading(true);
    api.getProducts(p, s, 20)
      .then((r: any) => { setItems(r.items || []); setTotal(r.total || 0); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(page, search); }, [page, search]);

  const handleSearch = (v: string) => { setSearch(v); setPage(1); };

  const batchDownload = async () => {
    if (items.length === 0) return;
    setBatchLoading(true);
    try {
      const payload = items
        .filter((item) => item.qr_uuid)
        .map((item) => ({
          qr_text: item.qr_uuid,
          filename: `${item.name}-${item.sku || item.id}`,
        }));
      if (payload.length === 0) { setErrorModal("没有可生成的二维码"); setBatchLoading(false); return; }
      const res = await fetch(`${API_BASE}/api/barcode/qrcode/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payload }),
      });
      if (!res.ok) throw new Error("批量生成失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qrcodes.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setErrorModal(e.message || "批量下载失败");
    } finally {
      setBatchLoading(false);
    }
  };

  const pages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">🔲 二维码管理</h1>
        <button
          onClick={batchDownload}
          disabled={batchLoading || items.length === 0}
          className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1 disabled:opacity-50"
        >
          {batchLoading ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />}
          批量下载ZIP
        </button>
      </div>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
          placeholder="搜索产品名称或QR编码..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="bg-white rounded-xl p-3 border flex items-center gap-3">
                <QrImage qrUuid={item.qr_uuid} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {item.spec ? `${item.spec} · ` : ""}{item.qr_uuid || "无QR编码"}
                  </p>
                  <p className="text-xs text-gray-300">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString("zh-CN") : ""}
                  </p>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-center text-gray-400 py-8">暂无数据</p>}
          </div>

          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 border rounded text-sm disabled:opacity-40"
              >
                上一页
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-500">{page} / {pages}</span>
              <button
                disabled={page >= pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 border rounded text-sm disabled:opacity-40"
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>

    {/* 错误弹窗 */}
    <Modal open={!!errorModal} onClose={() => setErrorModal("")} title="提示">
      <div className="text-center py-2">
        <p className="text-gray-700">{errorModal}</p>
        <button onClick={() => setErrorModal("")} className="mt-4 w-full bg-gray-800 text-white py-3 rounded-xl font-medium">确定</button>
      </div>
    </Modal>
  </div>
);
}

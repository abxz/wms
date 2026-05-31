import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, Send, LogOut, User, AlertTriangle } from "lucide-react";
import { api } from "../services/api";
import OrderScanner from "../components/OrderScanner";
import LocationCombo from "../components/LocationCombo";
import SyncStatus from "../components/SyncStatus";
import Modal from "../components/Modal";
import { enqueueOutbound } from "../offline-db";

const MAX_ITEMS = 7;

interface LineItem {
  product_id: string;
  name: string;
  spec: string;
  quantity: number;
  stock: number;
  qr_uuid: string;
}

export default function PdaOutbound() {
  const navigate = useNavigate();
  const [claimer, setClaimer] = useState<{ id: string; name: string } | null>(null);
  const [lines, setLines] = useState<LineItem[]>([]);
  const [location, setLocation] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [splitModal, setSplitModal] = useState(false);
  const [errorModal, setErrorModal] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const adminName = localStorage.getItem("admin_name") || "管理员";

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) navigate("/pda-login", { replace: true });
  }, [navigate]);

  const logout = async () => {
    const token = localStorage.getItem("admin_token");
    if (token) {
      try { await api.pdaLogout(token); } catch {}
    }
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_name");
    localStorage.removeItem("admin_role");
    navigate("/pda-login", { replace: true });
  };

  const handleScan = useCallback(async (code: string) => {
    // First scan: identify claimer
    if (!claimer) {
      if (!code.startsWith("QR-EMP-")) {
        setErrorModal("请先扫领料人工牌二维码（QR-EMP-xxx）");
        return null;
      }
      try {
        const res: any = await api.getEmployeeByQr(code);
        setClaimer({ id: res.id, name: res.name });
        return { code, data: res };
      } catch {
        setErrorModal("未找到该员工，请确认工牌");
        return null;
      }
    }

    // Subsequent scans: product QR
    if (!code.startsWith("QR-PROD-") && !code.startsWith("QR-")) {
      setErrorModal("请扫商品二维码");
      return null;
    }

    try {
      const res: any = await api.getProductByQr(code);
      const existing = lines.findIndex((l) => l.product_id === res.id);

      if (existing >= 0) {
        // Same product: increment quantity
        setLines((prev) =>
          prev.map((l, i) => (i === existing ? { ...l, quantity: l.quantity + 1 } : l))
        );
      } else {
        // New product
        if (lines.length >= MAX_ITEMS) {
          setSplitModal(true);
          return null;
        }
        setLines((prev) => [
          ...prev,
          {
            product_id: res.id,
            name: res.name,
            spec: res.spec || res.category || "",
            quantity: 1,
            stock: res.stock ?? res.quantity ?? 0,
            qr_uuid: code,
          },
        ]);
      }
      return { code, data: res };
    } catch {
      setErrorModal("未找到该商品，请确认二维码");
      return null;
    }
  }, [claimer, lines]);

  const updateQty = (idx: number, delta: number) => {
    setLines((prev) =>
      prev
        .map((l, i) => (i === idx ? { ...l, quantity: Math.max(0, l.quantity + delta) } : l))
        .filter((l) => l.quantity > 0)
    );
  };

  const setQty = (idx: number, v: number) => {
    if (v <= 0) {
      setLines((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, quantity: v } : l)));
    }
  };

  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const buildOrders = (): any[][] => {
    const chunks: any[][] = [];
    for (let i = 0; i < lines.length; i += MAX_ITEMS) {
      chunks.push(lines.slice(i, i + MAX_ITEMS));
    }
    return chunks;
  };

  const submit = async () => {
    if (!claimer) { setErrorModal("请先扫领料人二维码"); return; }
    if (lines.length === 0) { setErrorModal("请先扫商品"); return; }
    if (!location.trim()) { setErrorModal("请填写使用地点"); return; }

    setSubmitting(true);
    const chunks = buildOrders();
    const errors: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const order = {
        items: chunks[i].map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
        claimer_name: claimer.name,
        admin_name: adminName,
        usage_location: location,
        invoice_no: invoiceNo || undefined,
      };
      try {
        if (navigator.onLine) {
          const res: any = await api.createOutbound(order);
          await api.completeOutbound(res.id);
        } else {
          await enqueueOutbound(order);
        }
      } catch (e: any) {
        errors.push(`子单${i + 1}: ${e.message}`);
      }
    }

    setSubmitting(false);
    if (errors.length > 0) {
      setErrorModal(`部分提交失败:\n${errors.join("\n")}`);
    } else {
      setSuccessMsg(`出库成功！共 ${chunks.length} 单`);
      setLines([]);
      setClaimer(null);
      setLocation("");
      setInvoiceNo("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SyncStatus />

      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">📤 PDA 出库</h1>
          <p className="text-blue-200 text-xs">{adminName}</p>
        </div>
        <button onClick={logout} className="p-2 rounded-lg bg-blue-700 active:bg-blue-800">
          <LogOut size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-32">
        {/* Claimer section */}
        <div className="bg-white rounded-xl p-3 border">
          <p className="text-xs text-gray-400 mb-2 font-medium">领料人</p>
          {claimer ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User size={18} className="text-blue-500" />
                <span className="font-semibold text-lg">{claimer.name}</span>
              </div>
              <button
                onClick={() => { setClaimer(null); setLines([]); }}
                className="text-xs text-gray-400 underline"
              >
                重扫
              </button>
            </div>
          ) : (
            <OrderScanner
              onScan={handleScan}
              placeholder="扫领料人工牌二维码..."
            />
          )}
        </div>

        {/* Product scan */}
        {claimer && (
          <div className="bg-white rounded-xl p-3 border">
            <p className="text-xs text-gray-400 mb-2 font-medium">扫商品</p>
            <OrderScanner
              onScan={handleScan}
              placeholder="扫商品二维码..."
            />
          </div>
        )}

        {/* Line items */}
        {lines.length > 0 && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">商品明细</span>
              <span className="text-xs text-gray-400">{lines.length}/{MAX_ITEMS}</span>
            </div>
            {lines.map((line, idx) => (
              <div key={line.product_id} className="px-3 py-3 border-b last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-medium text-sm truncate">{line.name}</p>
                    {line.spec && <p className="text-xs text-gray-400">{line.spec}</p>}
                    <p className="text-xs text-gray-300">库存: {line.stock}</p>
                  </div>
                  <button onClick={() => removeLine(idx)} className="p-1 text-gray-300 hover:text-red-400">
                    <Trash2 size={15} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(idx, -1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 active:bg-gray-200 flex items-center justify-center"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={line.quantity}
                    onChange={(e) => setQty(idx, parseInt(e.target.value) || 0)}
                    className="w-16 text-center border rounded-lg py-2 text-base font-semibold"
                  />
                  <button
                    onClick={() => updateQty(idx, 1)}
                    className="w-10 h-10 rounded-lg bg-gray-100 active:bg-gray-200 flex items-center justify-center"
                  >
                    <Plus size={16} />
                  </button>
                  {line.quantity > line.stock && (
                    <span className="text-xs text-orange-500 flex items-center gap-0.5">
                      <AlertTriangle size={12} /> 超库存
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Location and invoice */}
        {lines.length > 0 && (
          <div className="bg-white rounded-xl p-3 border space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-1.5 font-medium">使用地点 *</p>
              <LocationCombo value={location} onChange={setLocation} />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1.5 font-medium">发票号（可选）</p>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="发票号码"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit button */}
      {lines.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3">
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={20} />
            )}
            {submitting ? "提交中..." : `提交出库（${lines.length}项）`}
          </button>
        </div>
      )}

      {/* Split order modal */}
      <Modal open={splitModal} onClose={() => setSplitModal(false)} title="已满7个商品">
        <div className="text-center py-2">
          <AlertTriangle size={40} className="text-orange-400 mx-auto mb-3" />
          <p className="text-gray-700 mb-4">已达到单次出库上限（7个商品），将自动拆单提交。</p>
          <p className="text-sm text-gray-400">请先提交当前单据，再继续扫码。</p>
          <button
            onClick={() => setSplitModal(false)}
            className="mt-4 w-full bg-blue-500 text-white py-3 rounded-xl font-medium"
          >
            知道了
          </button>
        </div>
      </Modal>

      {/* Error modal */}
      <Modal open={!!errorModal} onClose={() => setErrorModal("")} title="提示">
        <div className="text-center py-2">
          <p className="text-gray-700 whitespace-pre-line">{errorModal}</p>
          <button
            onClick={() => setErrorModal("")}
            className="mt-4 w-full bg-gray-800 text-white py-3 rounded-xl font-medium"
          >
            确定
          </button>
        </div>
      </Modal>

      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-16 left-4 right-4 bg-green-500 text-white px-4 py-3 rounded-xl text-center font-medium shadow-lg z-50">
          {successMsg}
          <button onClick={() => setSuccessMsg("")} className="ml-2 underline text-sm">关闭</button>
        </div>
      )}
    </div>
  );
}

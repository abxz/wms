import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Minus, Plus, Trash2, Send, LogOut, AlertTriangle } from "lucide-react";
import { api } from "../services/api";
import OrderScanner from "../components/OrderScanner";
import SyncStatus from "../components/SyncStatus";
import Modal from "../components/Modal";
import { enqueueInbound } from "../offline-db";

const MAX_ITEMS = 7;

interface LineItem {
  product_id: string | null;
  name: string;
  spec: string;
  quantity: number;
  qr_uuid: string;
  isNew?: boolean;
}

interface NewProductForm {
  qr_uuid: string;
  name: string;
  spec: string;
  category: string;
}

export default function PdaInbound() {
  const navigate = useNavigate();
  const [lines, setLines] = useState<LineItem[]>([]);
  const [supplier, setSupplier] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [splitModal, setSplitModal] = useState(false);
  const [errorModal, setErrorModal] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [newProductModal, setNewProductModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState<NewProductForm>({ qr_uuid: "", name: "", spec: "", category: "" });
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
    try {
      const res: any = await api.getProductByQr(code);
      const existing = lines.findIndex((l) => l.product_id === res.id);

      if (existing >= 0) {
        setLines((prev) =>
          prev.map((l, i) => (i === existing ? { ...l, quantity: l.quantity + 1 } : l))
        );
      } else {
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
            qr_uuid: code,
          },
        ]);
      }
      return { code, data: res };
    } catch {
      // Product not found — prompt to create
      setNewProductForm({ qr_uuid: code, name: "", spec: "", category: "" });
      setNewProductModal(true);
      return null;
    }
  }, [lines]);

  const createAndAddProduct = async () => {
    if (!newProductForm.name.trim()) { setErrorModal("请填写商品名称"); return; }
    try {
      const res: any = await api.createProduct({
        name: newProductForm.name,
        spec: newProductForm.spec,
        category: newProductForm.category,
        sku: "",
        price: 0,
        unit: "个",
      });
      if (lines.length < MAX_ITEMS) {
        setLines((prev) => [
          ...prev,
          {
            product_id: res.id,
            name: newProductForm.name,
            spec: newProductForm.spec,
            quantity: 1,
            qr_uuid: newProductForm.qr_uuid,
            isNew: true,
          },
        ]);
      }
      setNewProductModal(false);
    } catch (e: any) {
      setErrorModal(e.message || "创建商品失败");
    }
  };

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
    if (lines.length === 0) { setErrorModal("请先扫商品"); return; }

    setSubmitting(true);
    const chunks = buildOrders();
    const errors: string[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const order = {
        items: chunks[i].map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
        supplier_name: supplier || "未知供应商",
        admin_name: adminName,
        invoice_no: invoiceNo || undefined,
      };
      try {
        if (navigator.onLine) {
          const res: any = await api.createInbound(order);
          await api.completeInbound(res.id);
        } else {
          await enqueueInbound(order);
        }
      } catch (e: any) {
        errors.push(`子单${i + 1}: ${e.message}`);
      }
    }

    setSubmitting(false);
    if (errors.length > 0) {
      setErrorModal(`部分提交失败:\n${errors.join("\n")}`);
    } else {
      setSuccessMsg(`入库成功！共 ${chunks.length} 单`);
      setLines([]);
      setSupplier("");
      setInvoiceNo("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SyncStatus />

      {/* Header */}
      <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">📥 PDA 入库</h1>
          <p className="text-green-200 text-xs">{adminName}</p>
        </div>
        <button onClick={logout} className="p-2 rounded-lg bg-green-700 active:bg-green-800">
          <LogOut size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 pb-32">
        {/* Scan */}
        <div className="bg-white rounded-xl p-3 border">
          <p className="text-xs text-gray-400 mb-2 font-medium">扫商品二维码</p>
          <OrderScanner onScan={handleScan} placeholder="扫商品二维码..." />
        </div>

        {/* Line items */}
        {lines.length > 0 && (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-3 py-2 border-b bg-gray-50 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">入库明细</span>
              <span className="text-xs text-gray-400">{lines.length}/{MAX_ITEMS}</span>
            </div>
            {lines.map((line, idx) => (
              <div key={`${line.product_id}-${idx}`} className="px-3 py-3 border-b last:border-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-medium text-sm truncate">
                      {line.name}
                      {line.isNew && <span className="ml-1 text-xs bg-green-100 text-green-600 px-1 rounded">新品</span>}
                    </p>
                    {line.spec && <p className="text-xs text-gray-400">{line.spec}</p>}
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
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Supplier and invoice */}
        {lines.length > 0 && (
          <div className="bg-white rounded-xl p-3 border space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-1.5 font-medium">供应商</p>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="供应商名称"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
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
            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 active:bg-green-700 disabled:opacity-50"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send size={20} />
            )}
            {submitting ? "提交中..." : `提交入库（${lines.length}项）`}
          </button>
        </div>
      )}

      {/* New product modal */}
      <Modal open={newProductModal} onClose={() => setNewProductModal(false)} title="新商品录入">
        <div className="space-y-3">
          <p className="text-xs text-gray-400">未找到该二维码对应商品，请录入商品信息</p>
          <p className="text-xs font-mono bg-gray-50 px-2 py-1 rounded text-gray-500">{newProductForm.qr_uuid}</p>
          <input
            className="w-full border rounded-lg p-3 text-base"
            placeholder="商品名称 *"
            value={newProductForm.name}
            onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
            autoFocus
          />
          <input
            className="w-full border rounded-lg p-3 text-base"
            placeholder="规格（如：500ml/箱）"
            value={newProductForm.spec}
            onChange={(e) => setNewProductForm({ ...newProductForm, spec: e.target.value })}
          />
          <input
            className="w-full border rounded-lg p-3 text-base"
            placeholder="分类"
            value={newProductForm.category}
            onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
          />
          <button
            onClick={createAndAddProduct}
            className="w-full bg-green-500 text-white py-3 rounded-xl font-bold text-base"
          >
            创建并加入入库单
          </button>
          <button
            onClick={() => setNewProductModal(false)}
            className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-medium text-base"
          >
            取消
          </button>
        </div>
      </Modal>

      {/* Split order modal */}
      <Modal open={splitModal} onClose={() => setSplitModal(false)} title="已满7个商品">
        <div className="text-center py-2">
          <AlertTriangle size={40} className="text-orange-400 mx-auto mb-3" />
          <p className="text-gray-700 mb-4">已达到单次入库上限（7个商品），将自动拆单提交。</p>
          <button
            onClick={() => setSplitModal(false)}
            className="mt-2 w-full bg-blue-500 text-white py-3 rounded-xl font-medium"
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

import { useEffect, useState } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import { Plus, Search, Edit2, Trash2, QrCode, Download } from "lucide-react";
import { Product, PaginatedResult } from "../types";

export default function Products() {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", sku: "", price: 0, category: "", barcode: "", unit: "个", warehouse_id: "", invoice_number: "" });

  const load = () => {
    api.getProducts(page, search).then((r: any) => {
      setItems(r.items);
      setTotal(r.total);
    });
  };
  useEffect(() => { load(); }, [page, search]);

  const loadWarehouses = () => {
    api.getWarehouses().then(setWarehouses).catch(() => {});
  };

  const save = async () => {
    if (edit) await api.updateProduct(edit.id, form);
    else await api.createProduct(form);
    setModal(false);
    setEdit(null);
    setForm({ name: "", sku: "", price: 0, category: "", barcode: "", unit: "个", warehouse_id: "", invoice_number: "" });
    load();
  };

  const del = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteProduct(deleteTarget);
    setDeleteTarget(null);
    load();
  };

  const openEdit = (item: any) => {
    loadWarehouses();
    setEdit(item);
    setForm({
      name: item.name,
      sku: item.sku,
      price: item.price,
      category: item.category || "",
      barcode: item.barcode || "",
      unit: item.unit || "个",
      warehouse_id: item.warehouse_id || "",
      invoice_number: item.invoice_number || "",
    });
    setModal(true);
  };

  const openNew = () => {
    loadWarehouses();
    setEdit(null);
    setForm({ name: "", sku: "", price: 0, category: "", barcode: "", unit: "个", warehouse_id: "", invoice_number: "" });
    setModal(true);
  };

  const downloadQR = async (id: string) => {
    try {
      const res: any = await api.getProductQR(id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qrcode-${id}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setErrorMsg("二维码下载失败");
    }
  };

  const batchQR = async () => {
    if (items.length === 0) return setErrorMsg("列表为空");
    try {
      await api.batchQR(
        items.map((item) => ({
          qr_text: item.barcode || item.id,
          filename: `${item.name}-${item.sku || item.id}`,
        }))
      );
    } catch {
      setErrorMsg("批量二维码生成失败");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">📦 商品管理</h1>
        <div className="flex gap-2">
          <button
            onClick={batchQR}
            className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"
          >
            <Download size={16} /> 批量二维码
          </button>
          <button
            onClick={openNew}
            className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1"
          >
            <Plus size={16} /> 新增
          </button>
        </div>
      </div>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
          placeholder="搜索商品名/SKU/条码..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl p-3 border flex items-center justify-between"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{item.name}</p>
              <p className="text-xs text-gray-400">
                {item.sku} · ¥{item.price} · {item.category || "未分类"}
                {item.invoice_number && <span className="ml-1 text-gray-300">· 发票: {item.invoice_number}</span>}
              </p>
            </div>
            <div className="flex gap-2 ml-2">
              <button
                onClick={() => downloadQR(item.id)}
                className="p-1.5 text-gray-400 hover:text-green-500"
                title="下载二维码"
              >
                <QrCode size={16} />
              </button>
              <button
                onClick={() => openEdit(item)}
                className="p-1.5 text-gray-400 hover:text-blue-500"
              >
                <Edit2 size={16} />
              </button>
              <button
                onClick={() => del(item.id)}
                className="p-1.5 text-gray-400 hover:text-red-500"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {items.length === 0 && <p className="text-center text-gray-400 py-8">暂无数据</p>}
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={edit ? "编辑商品" : "新增商品"}
      >
        <div className="space-y-3">
          <input
            className="w-full border rounded-lg p-2 text-sm"
            placeholder="商品名称 *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="w-full border rounded-lg p-2 text-sm"
            placeholder="SKU"
            value={form.sku}
            onChange={(e) => setForm({ ...form, sku: e.target.value })}
          />
          <input
            className="w-full border rounded-lg p-2 text-sm"
            type="number"
            placeholder="价格"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: +e.target.value })}
          />
          <input
            className="w-full border rounded-lg p-2 text-sm"
            placeholder="分类"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            className="w-full border rounded-lg p-2 text-sm"
            placeholder="条码"
            value={form.barcode}
            onChange={(e) => setForm({ ...form, barcode: e.target.value })}
          />
          <select
            className="w-full border rounded-lg p-2 text-sm"
            value={form.warehouse_id}
            onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
          >
            <option value="">选择仓库</option>
            {warehouses.map((w: any) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <input
            className="w-full border rounded-lg p-2 text-sm"
            placeholder="发票号码"
            value={form.invoice_number}
            onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
          />
          <button
            onClick={save}
            className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium"
          >
            {edit ? "保存" : "创建"}
          </button>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="确认删除">
        <p className="mb-4 text-gray-600">确定要删除该商品吗？此操作不可撤销。</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border rounded-lg text-sm">取消</button>
          <button onClick={confirmDelete} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">删除</button>
        </div>
      </Modal>

      {/* 错误提示弹窗 */}
      <Modal open={errorMsg !== null} onClose={() => setErrorMsg(null)} title="提示">
        <p className="mb-4 text-gray-600">{errorMsg}</p>
        <div className="flex justify-end">
          <button onClick={() => setErrorMsg(null)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">确定</button>
        </div>
      </Modal>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import { Plus, Search, Edit2, Trash2, QrCode, Download, FileText, Package, PackageMinus, ClipboardList } from "lucide-react";
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
  const [invoiceDetail, setInvoiceDetail] = useState<any>(null);
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [form, setForm] = useState({ name: "", sku: "", price: 0, category: "", barcode: "", unit: "个", warehouse_id: "", invoice_number: "", spec: "", min_stock: 0, max_stock: 999999 });

  const load = () => {
    api.getProducts(page, search, 20, warehouseFilter).then((r: any) => {
      setItems(r.items);
      setTotal(r.total);
    });
  };
  useEffect(() => { load(); }, [page, search, warehouseFilter]);

  const loadWarehouses = () => {
    api.getWarehouses().then(setWarehouses).catch(() => {});
  };

  const save = async () => {
    if (edit) await api.updateProduct(edit.id, form);
    else await api.createProduct(form);
    setModal(false);
    setEdit(null);
    setForm({ name: "", sku: "", price: 0, category: "", barcode: "", unit: "个", warehouse_id: "", invoice_number: "", spec: "", min_stock: 0, max_stock: 999999 });
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
      name: item.name || "",
      sku: item.sku || "",
      price: item.price || 0,
      category: item.category || "",
      barcode: item.barcode || "",
      unit: item.unit || "个",
      warehouse_id: item.warehouse_id || "",
      invoice_number: item.invoice_number || "",
      spec: item.spec || "",
      min_stock: item.min_stock || 0,
      max_stock: item.max_stock || 999999,
    });
    setModal(true);
  };

  const openNew = () => {
    loadWarehouses();
    setEdit(null);
    setForm({ name: "", sku: "", price: 0, category: "", barcode: "", unit: "个", warehouse_id: "", invoice_number: "", spec: "", min_stock: 0, max_stock: 999999 });
    setModal(true);
  };

  const downloadQR = async (id: string, name: string) => {
    try {
      const token = localStorage.getItem("wms_token") || localStorage.getItem("auth_token");
      const API_BASE = (window as any).__WMS_API_BASE__ || window.location.origin;
      const res = await fetch(`${API_BASE}/api/barcode/qrcode/product/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ size: 300, format: "png" }),
      });
      if (!res.ok) {
        // 降级：前端生成二维码
        throw new Error("后端接口不可用");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `qrcode-${name || id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setErrorMsg("二维码下载失败，请检查后端 barcode 模块是否已注册");
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

  // 入库
  const handleInbound = async (item: any) => {
    const qtyStr = prompt(`请输入【${item.name}】入库数量：`, "10");
    if (!qtyStr || isNaN(Number(qtyStr))) return;
    try {
      await api.createInbound({
        product_id: item.id,
        quantity: Number(qtyStr),
        warehouse_id: item.warehouse_id,
      });
      setErrorMsg(null);
      alert(`✅ 入库成功：${item.name} +${qtyStr}`);
      load();
    } catch {
      setErrorMsg("入库失败");
    }
  };

  // 出库
  const handleOutbound = async (item: any) => {
    const maxQty = item.stock_quantity || 0;
    if (maxQty <= 0) return setErrorMsg(`【${item.name}】库存为0，无法出库`);
    const qtyStr = prompt(`请输入【${item.name}】出库数量（最大 ${maxQty}）：`, "1");
    if (!qtyStr || isNaN(Number(qtyStr))) return;
    const qty = Number(qtyStr);
    if (qty <= 0 || qty > maxQty) return setErrorMsg(`出库数量必须在 1~${maxQty} 之间`);
    try {
      await api.createOutbound({
        product_id: item.id,
        quantity: qty,
        warehouse_id: item.warehouse_id,
      });
      setErrorMsg(null);
      alert(`✅ 出库成功：${item.name} -${qty}`);
      load();
    } catch {
      setErrorMsg("出库失败");
    }
  };

  // 盘点
  const handleStockCheck = async (item: any) => {
    const currentQty = item.stock_quantity || 0;
    const qtyStr = prompt(`【${item.name}】当前系统库存：${currentQty}\n请输入实际盘点数量：`, String(currentQty));
    if (!qtyStr || isNaN(Number(qtyStr))) return;
    const actualQty = Number(qtyStr);
    try {
      await api.adjustInventory({
        product_id: item.id,
        location_id: item.location_id || "",
        quantity: actualQty,
      });
      setErrorMsg(null);
      const diff = actualQty - currentQty;
      alert(`✅ 盘点完成：${item.name} 系统=${currentQty} 实际=${actualQty} 差异=${diff >= 0 ? "+" : ""}${diff}`);
      load();
    } catch {
      setErrorMsg("盘点调整失败");
    }
  };

  // 生成随机库存
  const generateRandomStock = async () => {
    if (items.length === 0) return setErrorMsg("列表为空");
    const count = Math.min(items.length, 5);
    let done = 0;
    for (let i = 0; i < count; i++) {
      const item = items[i];
      const qty = Math.floor(Math.random() * 200) + 10;
      try {
        await api.createInbound({
          product_id: item.id,
          quantity: qty,
          warehouse_id: item.warehouse_id,
        });
        done++;
      } catch { /* skip */ }
    }
    alert(`✅ 已为 ${done} 个商品生成随机库存（10~200）`);
    load();
  };

  const statusColor = (s: string) => {
    if (s === "上架") return "text-green-600 bg-green-50";
    if (s === "缺货") return "text-red-600 bg-red-50";
    return "text-gray-500 bg-gray-100";
  };

  const pages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">📦 商品管理</h1>
        <div className="flex gap-2">
          <button
            onClick={generateRandomStock}
            className="border px-3 py-2 rounded-lg text-sm flex items-center gap-1 text-orange-600 border-orange-300 hover:bg-orange-50"
            title="为前5个商品生成随机库存"
          >
            <Package size={16} /> 随机库存
          </button>
          <button
            onClick={() => api.exportProducts()}
            className="border px-3 py-2 rounded-lg text-sm flex items-center gap-1 text-gray-600"
          >
            <Download size={16} /> 导出
          </button>
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

      {/* 搜索 + 仓库筛选 */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            placeholder="搜索商品名/SKU/条码..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <select
          className="border rounded-lg px-3 py-2 text-sm min-w-[140px]"
          value={warehouseFilter}
          onChange={(e) => { setWarehouseFilter(e.target.value); setPage(1); }}
        >
          <option value="">全部仓库</option>
          {warehouses.map((w: any) => (
            <option key={w.id} value={w.id}>{w.name}</option>
          ))}
        </select>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-left">
              <th className="px-3 py-2 font-medium w-12">#</th>
              <th className="px-3 py-2 font-medium">商品编号</th>
              <th className="px-3 py-2 font-medium">商品名称</th>
              <th className="px-3 py-2 font-medium">规格</th>
              <th className="px-3 py-2 font-medium">单位</th>
              <th className="px-3 py-2 font-medium text-right">单价</th>
              <th className="px-3 py-2 font-medium text-right">剩余库存</th>
              <th className="px-3 py-2 font-medium text-right">警戒库存</th>
              <th className="px-3 py-2 font-medium">存仓仓库</th>
              <th className="px-3 py-2 font-medium">库位</th>
              <th className="px-3 py-2 font-medium">分类</th>
              <th className="px-3 py-2 font-medium">状态</th>
              <th className="px-3 py-2 font-medium text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-400">{(page - 1) * 20 + idx + 1}</td>
                <td className="px-3 py-2 font-mono text-xs">{item.sku || "-"}</td>
                <td className="px-3 py-2 font-medium">{item.name}</td>
                <td className="px-3 py-2 text-gray-500">{item.spec || "-"}</td>
                <td className="px-3 py-2">{item.unit || "-"}</td>
                <td className="px-3 py-2 text-right">¥{item.price?.toFixed(2)}</td>
                <td className={`px-3 py-2 text-right font-medium ${(item.stock_quantity || 0) <= (item.min_stock || 0) ? "text-red-600" : "text-green-600"}`}>
                  {item.stock_quantity || 0}
                </td>
                <td className="px-3 py-2 text-right text-gray-500">{item.min_stock || 0}</td>
                <td className="px-3 py-2">{item.warehouse_name || "-"}</td>
                <td className="px-3 py-2 font-mono text-xs">{item.location_code || "-"}</td>
                <td className="px-3 py-2">{item.category || "-"}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColor(item.status)}`}>
                    {item.status || "-"}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(item)} className="p-1 text-gray-400 hover:text-blue-500" title="编辑">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleInbound(item)} className="p-1 text-gray-400 hover:text-green-500" title="入库">
                      <Package size={14} />
                    </button>
                    <button onClick={() => handleOutbound(item)} className="p-1 text-gray-400 hover:text-orange-500" title="出库">
                      <PackageMinus size={14} />
                    </button>
                    <button onClick={() => handleStockCheck(item)} className="p-1 text-gray-400 hover:text-purple-500" title="盘点">
                      <ClipboardList size={14} />
                    </button>
                    <button onClick={() => downloadQR(item.id, item.name)} className="p-1 text-gray-400 hover:text-teal-500" title="下载二维码">
                      <QrCode size={14} />
                    </button>
                    <button onClick={() => api.getProductInvoice(item.id).then(setInvoiceDetail).catch((e: any) => setErrorMsg(e?.message || "发票查询失败"))} className="p-1 text-gray-400 hover:text-indigo-500" title="发票">
                      <FileText size={14} />
                    </button>
                    <button onClick={() => del(item.id)} className="p-1 text-gray-400 hover:text-red-500" title="删除">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={13} className="text-center text-gray-400 py-8">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-40"
          >
            上一页
          </button>
          <span className="text-sm text-gray-500">{page} / {pages}</span>
          <button
            disabled={page >= pages}
            onClick={() => setPage(page + 1)}
            className="px-3 py-1 border rounded text-sm disabled:opacity-40"
          >
            下一页
          </button>
        </div>
      )}

      {/* 编辑/新增弹窗 */}
      <Modal
        open={modal}
        onClose={() => { setModal(false); setEdit(null); }}
        title={edit ? "编辑商品" : "新增商品"}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">商品名称 *</label>
            <input
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="请输入商品名称"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU / 商品编号</label>
            <input
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="SKU"
              value={form.sku}
              onChange={(e) => setForm({ ...form, sku: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">规格</label>
            <input
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="如：P.O 42.5"
              value={form.spec}
              onChange={(e) => setForm({ ...form, spec: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">单位</label>
              <input
                className="w-full border rounded-lg p-2 text-sm"
                placeholder="个"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">单价 (¥)</label>
              <input
                className="w-full border rounded-lg p-2 text-sm"
                type="number"
                placeholder="0.00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: +e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">商品分类</label>
            <input
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="如：水泥、钢材"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">条形码</label>
            <input
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="条形码"
              value={form.barcode}
              onChange={(e) => setForm({ ...form, barcode: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">存仓仓库</label>
            <select
              className="w-full border rounded-lg p-2 text-sm"
              value={form.warehouse_id}
              onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}
            >
              <option value="">选择仓库</option>
              {warehouses.map((w: any) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">警戒库存</label>
              <input
                className="w-full border rounded-lg p-2 text-sm"
                type="number"
                placeholder="0"
                value={form.min_stock}
                onChange={(e) => setForm({ ...form, min_stock: +e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">最大库存</label>
              <input
                className="w-full border rounded-lg p-2 text-sm"
                type="number"
                placeholder="999999"
                value={form.max_stock}
                onChange={(e) => setForm({ ...form, max_stock: +e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">发票号码</label>
            <input
              className="w-full border rounded-lg p-2 text-sm"
              placeholder="发票号码（可选）"
              value={form.invoice_number}
              onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
            />
          </div>
          <button
            onClick={save}
            className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium mt-2"
          >
            {edit ? "保存修改" : "创建商品"}
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

      {/* 发票联动详情弹窗 */}
      <Modal open={!!invoiceDetail} onClose={() => setInvoiceDetail(null)} title="发票联动详情">
        {invoiceDetail?.invoice ? (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b pb-1"><span className="text-gray-500">发票号码</span><span className="font-medium">{invoiceDetail.invoice.invoice_number}</span></div>
            <div className="flex justify-between border-b pb-1"><span className="text-gray-500">开票日期</span><span className="font-medium">{invoiceDetail.invoice.issue_date}</span></div>
            <div className="flex justify-between border-b pb-1"><span className="text-gray-500">价税合计</span><span className="font-medium text-blue-600">¥{invoiceDetail.invoice.total_amount}</span></div>
            <div className="flex justify-between border-b pb-1"><span className="text-gray-500">销售方</span><span className="font-medium">{invoiceDetail.invoice.seller_name}</span></div>
            {invoiceDetail.siblings?.length > 0 && (
              <>
                <p className="font-medium pt-2">同票商品（{invoiceDetail.siblings.length}）</p>
                {invoiceDetail.siblings.map((s: any) => (
                  <p key={s.id} className="text-gray-500 pl-2">{s.name}{s.sku ? ` · ${s.sku}` : ""} · ¥{s.price}</p>
                ))}
              </>
            )}
          </div>
        ) : (
          <p className="text-gray-400 py-4 text-center">该商品未关联发票</p>
        )}
        <div className="flex justify-end mt-4">
          <button onClick={() => setInvoiceDetail(null)} className="px-4 py-2 bg-gray-100 rounded-lg text-sm">关闭</button>
        </div>
      </Modal>
    </div>
  );
}


import { useEffect, useState, useCallback } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import ImportModal from "../components/ImportModal";
import { Plus, Search, Edit2, Trash2, QrCode, Download, Upload, FileText, ArrowDownCircle, ArrowUpCircle, ClipboardCheck } from "lucide-react";
import { Product, PaginatedResult, Warehouse } from "../types";

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  "上架": { label: "上架", cls: "bg-green-100 text-green-700" },
  "下架": { label: "下架", cls: "bg-gray-100 text-gray-500" },
  "缺货": { label: "缺货", cls: "bg-red-100 text-red-600" },
};

export default function Products() {
  const [items, setItems] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<any>(null);
  const [inboundModal, setInboundModal] = useState<any>(null);
  const [outboundModal, setOutboundModal] = useState<any>(null);
  const [stockModal, setStockModal] = useState<any>(null);
  const [importModal, setImportModal] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", price: 0, category: "", barcode: "", unit: "个", warehouse_id: "", location_id: "", min_stock: 0, spec: "", supplier_id: "" });

  // 分类或名称变化时自动获取下一个 SKU
  const handleCategoryChange = (cat: string) => {
    const newForm = { ...form, category: cat, sku: "" };
    setForm(newForm);
    if (cat && !edit) {
      api.getNextSku(cat, newForm.name).then((r: any) => {
        setForm(prev => ({ ...prev, sku: r.sku || "" }));
      }).catch(() => {});
    }
  };

  const handleNameChange = (name: string) => {
    const newForm = { ...form, name };
    setForm(newForm);
    if (newForm.category && !edit) {
      api.getNextSku(newForm.category, name).then((r: any) => {
        setForm(prev => ({ ...prev, sku: r.sku || "" }));
      }).catch(() => {});
    }
  };

  const load = useCallback(() => {
    api.getProducts(page, search).then((r: any) => {
      let filtered = r.items || [];
      if (warehouseFilter) {
        filtered = filtered.filter((p: Product) => p.warehouse_id === warehouseFilter);
      }
      setItems(filtered);
      setTotal(r.total);
    });
  }, [page, search, warehouseFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    api.getWarehouses().then((r: any) => setWarehouses(r || [])).catch(() => {});
    api.getSuppliers().then((r: any) => setSuppliers(r.items || r || [])).catch(() => {});
  }, []);

  const save = async () => {
    if (edit) await api.updateProduct(edit.id, form);
    else await api.createProduct(form);
    setModal(false);
    setEdit(null);
    setForm({ name: "", sku: "", price: 0, category: "", barcode: "", unit: "个", warehouse_id: "", location_id: "", min_stock: 0, spec: "", supplier_id: "" });
    load();
  };

  const del = async (id: string) => { setDeleteTarget(id); };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await api.deleteProduct(deleteTarget);
    setDeleteTarget(null);
    load();
  };

  const openEdit = (item: Product) => {
    setEdit(item);
    setForm({
      name: item.name, sku: item.sku, price: item.price, category: item.category || "",
      barcode: item.barcode || "", unit: item.unit || "个", warehouse_id: item.warehouse_id || "",
      location_id: item.location_id || "", min_stock: item.min_stock || 0, spec: item.spec || "",
      supplier_id: item.supplier_id || "",
    });
    setModal(true);
  };

  const openNew = () => {
    setEdit(null);
    setForm({ name: "", sku: "", price: 0, category: "", barcode: "", unit: "个", warehouse_id: "", location_id: "", min_stock: 0, spec: "", supplier_id: "" });
    setModal(true);
  };

  const downloadQR = async (id: string, name: string) => {
    try {
      const blob = await api.getProductQR(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "qrcode-" + id + ".png"; a.click();
      URL.revokeObjectURL(url);
    } catch { setErrorMsg("二维码下载失败"); }
  };

  const batchQR = async () => {
    if (items.length === 0) return setErrorMsg("列表为空");
    try {
      await api.batchQR(items.map((item) => ({ qr_text: item.barcode || item.id, filename: item.name + "-" + (item.sku || item.id) })));
    } catch { setErrorMsg("批量二维码生成失败"); }
  };

  const submitInbound = async () => {
    if (!inboundModal) return;
    try {
      await api.createInbound({
        items: [{ product_id: inboundModal.id, quantity: inboundModal.quantity, price: inboundModal.price }],
        supplier_id: inboundModal.supplier_id || "",
        total_amount: (inboundModal.quantity || 0) * (inboundModal.price || 0),
      });
      setInboundModal(null);
      load();
    } catch (e: any) { setErrorMsg(e?.message || "入库失败"); }
  };

  const submitOutbound = async () => {
    if (!outboundModal) return;
    try {
      await api.createOutbound({
        items: [{ product_id: outboundModal.id, quantity: outboundModal.quantity, price: outboundModal.price }],
        type: "normal",
        total_amount: (outboundModal.quantity || 0) * (outboundModal.price || 0),
      });
      setOutboundModal(null);
      load();
    } catch (e: any) { setErrorMsg(e?.message || "出库失败"); }
  };

  const submitStockAdjust = async () => {
    if (!stockModal) return;
    try {
      await api.adjustInventory({
        product_id: stockModal.id,
        quantity: stockModal.new_quantity,
        remark: stockModal.remark || "盘点调整",
      });
      setStockModal(null);
      load();
    } catch (e: any) { setErrorMsg(e?.message || "盘点调整失败"); }
  };

  const size = 20;
  const pages = Math.ceil(total / size);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">📦 商品管理</h1>
        <div className="flex gap-2">
          <button onClick={() => setImportModal(true)} className="border px-3 py-2 rounded-lg text-sm flex items-center gap-1 text-green-600 hover:bg-green-50">
            <Upload size={16} /> 导入
          </button>
          <button onClick={() => api.exportProducts()} className="border px-3 py-2 rounded-lg text-sm flex items-center gap-1 text-gray-600">
            <Download size={16} /> 导出
          </button>
          <button onClick={batchQR} className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1">
            <Download size={16} /> 批量二维码
          </button>
          <button onClick={openNew} className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1">
            <Plus size={16} /> 新增
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <label htmlFor="product-search" className="sr-only">搜索商品</label>
          <input
            id="product-search"
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
            placeholder="搜索商品名/SKU/条码..."

            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div>
          <label htmlFor="warehouse-filter" className="sr-only">仓库筛选</label>
          <select
            id="warehouse-filter"
            className="border rounded-lg px-3 py-2 text-sm min-w-[160px]"
            value={warehouseFilter}
            onChange={(e) => { setWarehouseFilter(e.target.value); setPage(1); }}
          >
            <option value="">全部仓库</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-600">
              <tr>
                <th className="px-3 py-2.5 text-left w-12">序号</th>
                <th className="px-3 py-2.5 text-left font-semibold">SKU</th>
                <th className="px-3 py-2.5 text-left">商品名称</th>
                <th className="px-3 py-2.5 text-left">规格</th>
                <th className="px-3 py-2.5 text-left">单位</th>
                <th className="px-3 py-2.5 text-right">单价</th>
                <th className="px-3 py-2.5 text-right">剩余库存</th>
                <th className="px-3 py-2.5 text-right">警戒库存</th>
                <th className="px-3 py-2.5 text-left">存仓仓库</th>
                <th className="px-3 py-2.5 text-left">库位</th>
                <th className="px-3 py-2.5 text-left">分类</th>
                <th className="px-3 py-2.5 text-center">状态</th>
                <th className="px-3 py-2.5 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => {
                const statusInfo = STATUS_MAP[item.status || "上架"] || STATUS_MAP["上架"];
                const isLowStock = (item.stock_quantity || 0) <= (item.min_stock || 0);
                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2.5 text-gray-400">{(page - 1) * size + idx + 1}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{item.sku || "-"}</td>
                    <td className="px-3 py-2.5 font-medium">{item.name}</td>
                    <td className="px-3 py-2.5 text-gray-500">{item.spec || "-"}</td>
                    <td className="px-3 py-2.5">{item.unit || "个"}</td>
                    <td className="px-3 py-2.5 text-right">¥{(item.price || 0).toFixed(2)}</td>
                    <td className={"px-3 py-2.5 text-right font-medium " + (isLowStock ? "text-red-600 font-bold" : "")}>
                      {item.stock_quantity ?? 0}
                    </td>
                    <td className="px-3 py-2.5 text-right">{item.min_stock ?? 0}</td>
                    <td className="px-3 py-2.5">{item.warehouse_name || "-"}</td>
                    <td className="px-3 py-2.5 font-mono text-xs">{item.location_code || "-"}</td>
                    <td className="px-3 py-2.5">{item.category || "未分类"}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={"inline-block px-2 py-0.5 rounded-full text-xs font-medium " + statusInfo.cls}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 justify-center">
                        <button onClick={() => openEdit(item)} className="p-1 text-gray-400 hover:text-blue-500" title="编辑"><Edit2 size={14} /></button>
                        <button onClick={() => setInboundModal({ ...item, quantity: 1 })} className="p-1 text-gray-400 hover:text-green-500" title="入库"><ArrowDownCircle size={14} /></button>
                        <button onClick={() => setOutboundModal({ ...item, quantity: 1 })} className="p-1 text-gray-400 hover:text-orange-500" title="出库"><ArrowUpCircle size={14} /></button>
                        <button onClick={() => setStockModal({ ...item, new_quantity: item.stock_quantity || 0, remark: "" })} className="p-1 text-gray-400 hover:text-purple-500" title="盘点"><ClipboardCheck size={14} /></button>
                        <button onClick={() => downloadQR(item.id, item.name)} className="p-1 text-gray-400 hover:text-green-600" title="二维码"><QrCode size={14} /></button>
                        <button onClick={() => api.getProductInvoice(item.id).then(setInvoiceDetail).catch((e: any) => setErrorMsg(e?.message || "发票查询失败"))} className="p-1 text-gray-400 hover:text-purple-500" title="发票"><FileText size={14} /></button>
                        <button onClick={() => del(item.id)} className="p-1 text-gray-400 hover:text-red-500" title="删除"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 && (
                <tr><td colSpan={13} className="text-center text-gray-400 py-8">暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t text-sm">
            <span className="text-gray-500">共 {total} 条</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="px-2 py-1 border rounded text-xs disabled:opacity-50">上一页</button>
              <span className="px-2 py-1 text-xs">{page}/{pages}</span>
              <button onClick={() => setPage(Math.min(pages, page + 1))} disabled={page >= pages} className="px-2 py-1 border rounded text-xs disabled:opacity-50">下一页</button>
            </div>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={edit ? "编辑商品" : "新增商品"}>
        <div className="space-y-3">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">商品名称 *</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="请输入商品名称" value={form.name} onChange={(e) => handleNameChange(e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">规格</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="规格型号" value={form.spec} onChange={(e) => setForm({ ...form, spec: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">单价</label><input className="w-full border rounded-lg p-2 text-sm" type="number" placeholder="0.00" value={form.price} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">单位</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="个" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">警戒库存</label><input className="w-full border rounded-lg p-2 text-sm" type="number" placeholder="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: +e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
              <select className="w-full border rounded-lg p-2 text-sm" value={form.category} onChange={(e) => handleCategoryChange(e.target.value)}>
                <option value="">选择分类</option>
                <option value="水泥">水泥</option>
                <option value="骨料">骨料</option>
                <option value="钢材">钢材</option>
                <option value="砂石">砂石</option>
                <option value="建材">建材</option>
                <option value="外加剂">外加剂</option>
              </select>
            </div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">SKU</label><input className="w-full border rounded-lg p-2 text-sm bg-gray-50" placeholder={edit ? "" : "选择分类后自动生成"} value={form.sku} readOnly /></div>
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">条码</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="条形码" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">供应商</label><select className="w-full border rounded-lg p-2 text-sm" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
            <option value="">选择供应商（可选）</option>
            {suppliers.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
          </select></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">仓库</label><select className="w-full border rounded-lg p-2 text-sm" value={form.warehouse_id} onChange={(e) => setForm({ ...form, warehouse_id: e.target.value })}>
            <option value="">选择仓库</option>
            {warehouses.map((w) => (<option key={w.id} value={w.id}>{w.name}</option>))}
          </select></div>
          <button onClick={save} className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium">{edit ? "保存" : "创建"}</button>
        </div>
      </Modal>

      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="确认删除">
        <p className="mb-4 text-gray-600">确定要删除该商品吗？此操作不可撤销。</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border rounded-lg text-sm">取消</button>
          <button onClick={confirmDelete} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">删除</button>
        </div>
      </Modal>

      <Modal open={!!inboundModal} onClose={() => setInboundModal(null)} title={"入库 - " + (inboundModal?.name || "")}>
        <div className="space-y-3">
          <div className="text-sm text-gray-500">商品：{inboundModal?.name}（SKU: {inboundModal?.sku || "-"}）</div>
          <div className="text-sm text-gray-500">当前库存：{inboundModal?.stock_quantity ?? 0}</div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">入库数量</label><input className="w-full border rounded-lg p-2 text-sm" type="number" value={inboundModal?.quantity || 1} onChange={(e) => setInboundModal({ ...inboundModal, quantity: +e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">入库单价</label><input className="w-full border rounded-lg p-2 text-sm" type="number" value={inboundModal?.price || 0} onChange={(e) => setInboundModal({ ...inboundModal, price: +e.target.value })} /></div>
          <button onClick={submitInbound} className="w-full bg-green-500 text-white py-2 rounded-lg font-medium">确认入库</button>
        </div>
      </Modal>

      <Modal open={!!outboundModal} onClose={() => setOutboundModal(null)} title={"出库 - " + (outboundModal?.name || "")}>
        <div className="space-y-3">
          <div className="text-sm text-gray-500">商品：{outboundModal?.name}（SKU: {outboundModal?.sku || "-"}）</div>
          <div className="text-sm text-gray-500">当前库存：{outboundModal?.stock_quantity ?? 0}</div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">出库数量</label><input className="w-full border rounded-lg p-2 text-sm" type="number" value={outboundModal?.quantity || 1} onChange={(e) => setOutboundModal({ ...outboundModal, quantity: +e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">出库单价</label><input className="w-full border rounded-lg p-2 text-sm" type="number" value={outboundModal?.price || 0} onChange={(e) => setOutboundModal({ ...outboundModal, price: +e.target.value })} /></div>
          <button onClick={submitOutbound} className="w-full bg-orange-500 text-white py-2 rounded-lg font-medium">确认出库</button>
        </div>
      </Modal>

      <Modal open={!!stockModal} onClose={() => setStockModal(null)} title={"盘点 - " + (stockModal?.name || "")}>
        <div className="space-y-3">
          <div className="text-sm text-gray-500">商品：{stockModal?.name}（SKU: {stockModal?.sku || "-"}）</div>
          <div className="text-sm text-gray-500">当前库存：{stockModal?.stock_quantity ?? 0}</div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">盘点后数量</label><input className="w-full border rounded-lg p-2 text-sm" type="number" value={stockModal?.new_quantity ?? 0} onChange={(e) => setStockModal({ ...stockModal, new_quantity: +e.target.value })} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">备注</label><input className="w-full border rounded-lg p-2 text-sm" value={stockModal?.remark || ""} onChange={(e) => setStockModal({ ...stockModal, remark: e.target.value })} /></div>
          <button onClick={submitStockAdjust} className="w-full bg-purple-500 text-white py-2 rounded-lg font-medium">确认调整</button>
        </div>
      </Modal>

      <Modal open={errorMsg !== null} onClose={() => setErrorMsg(null)} title="提示">
        <p className="mb-4 text-gray-600">{errorMsg}</p>
        <div className="flex justify-end">
          <button onClick={() => setErrorMsg(null)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">确定</button>
        </div>
      </Modal>

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
                  <p key={s.id} className="text-gray-500 pl-2">{s.name}{s.sku ? " · " + s.sku : ""} · ¥{s.price}</p>
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

      {/* 导入弹窗 */}
      <ImportModal
        open={importModal}
        onClose={() => setImportModal(false)}
        templateType="main-data"
        onImport={(file) => api.importMainData(file)}
        onSuccess={() => load()}
        moduleName="商品"
      />
    </div>
  );
}

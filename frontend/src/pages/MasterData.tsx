import { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import { Plus, Search, Edit2, Trash2, X, Download, Upload } from "lucide-react";

type TabKey = "products" | "suppliers" | "employees";

const TABS: { key: TabKey; label: string }[] = [
  { key: "products", label: "商品" },
  { key: "suppliers", label: "供应商" },
  { key: "employees", label: "员工" },
];

// ─── 商品表单 ───
function ProductForm({ form, setForm, suppliers }: { form: any; setForm: (f: any) => void; suppliers: any[] }) {
  return (
    <div className="space-y-3">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">商品名称 *</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="请输入商品名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">SKU</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="SKU编码" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">规格</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="规格型号" value={form.spec} onChange={e => setForm({ ...form, spec: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">单价</label><input className="w-full border rounded-lg p-2 text-sm" type="number" placeholder="0.00" value={form.price} onChange={e => setForm({ ...form, price: +e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">单位</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="个" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">分类</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="商品分类" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">条码</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="条形码" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">供应商</label><select className="w-full border rounded-lg p-2 text-sm" value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })}>
        <option value="">选择供应商（可选）</option>
        {suppliers.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
      </select></div>
    </div>
  );
}

// ─── 供应商表单 ───
function SupplierForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <div className="space-y-3">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">供应商名称 *</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="请输入供应商名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">联系人</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="联系人姓名" value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">电话</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="联系电话" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
      </div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">地址</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="供应商地址" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
      <div><label className="block text-sm font-medium text-gray-700 mb-1">备注</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="备注信息" value={form.remark} onChange={e => setForm({ ...form, remark: e.target.value })} /></div>
    </div>
  );
}

// ─── 员工表单 ───
function EmployeeForm({ form, setForm }: { form: any; setForm: (f: any) => void }) {
  return (
    <div className="space-y-3">
      <div><label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="请输入姓名" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">工号</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="员工工号" value={form.employee_no} onChange={e => setForm({ ...form, employee_no: e.target.value })} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">部门</label><input className="w-full border rounded-lg p-2 text-sm" placeholder="所属部门" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></div>
      </div>
    </div>
  );
}

export default function MasterData() {
  const [tab, setTab] = useState<TabKey>("products");
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [masterSuppliers, setMasterSuppliers] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<any>(null);

  const handleExport = () => {
    if (tab === "products") api.exportMasterProducts();
    else if (tab === "suppliers") api.exportMasterSuppliers();
    else api.exportMasterEmployees();
  };

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    try {
      let r: any;
      if (tab === "products") r = await api.uploadMasterProducts(file);
      else if (tab === "suppliers") r = await api.uploadMasterSuppliers(file);
      else r = await api.uploadMasterEmployees(file);
      setImportResult(r);
      load();
    } catch (e: any) {
      setImportResult({ errors: [e?.message || "导入失败"] });
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const emptyForm = {
    products: { name: "", sku: "", spec: "", price: 0, unit: "个", category: "", barcode: "", supplier_id: "" },
    suppliers: { name: "", contact: "", phone: "", address: "", remark: "" },
    employees: { name: "", employee_no: "", department: "" },
  }[tab];

  const [form, setForm] = useState(emptyForm);

  const load = useCallback(() => {
    if (tab === "products") api.masterProducts(search).then((r: any) => setItems(r.items || r));
    else if (tab === "suppliers") api.masterSuppliers(search).then((r: any) => setItems(r.items || r));
    else api.masterEmployees(search).then((r: any) => setItems(r.items || r));
  }, [tab, search]);

  useEffect(() => {
    api.masterSuppliers("").then((r: any) => setMasterSuppliers(r.items || r || [])).catch(() => {});
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEdit(null);
    setForm(emptyForm);
    setModal(true);
  };

  const openEdit = (item: any) => {
    setEdit(item);
    setForm({ ...item });
    setModal(true);
  };

  const save = async () => {
    try {
      if (tab === "products") {
        if (edit) await api.updateMasterProduct(edit.id, form);
        else await api.createMasterProduct(form);
      } else if (tab === "suppliers") {
        if (edit) await api.updateMasterSupplier(edit.id, form);
        else await api.createMasterSupplier(form);
      } else {
        if (edit) await api.updateMasterEmployee(edit.id, form);
        else await api.createMasterEmployee(form);
      }
      setModal(false);
      setEdit(null);
      load();
    } catch (e: any) { setErrorMsg(e?.message || "保存失败"); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (tab === "products") await api.deleteMasterProduct(deleteTarget.id);
      else if (tab === "suppliers") await api.deleteMasterSupplier(deleteTarget.id);
      else await api.deleteMasterEmployee(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (e: any) { setErrorMsg(e?.message || "删除失败"); }
  };

  const columns: Record<TabKey, { key: string; label: string; render?: (v: any) => string }[]> = {
    products: [
      { key: "name", label: "商品名称" },
      { key: "sku", label: "SKU" },
      { key: "spec", label: "规格" },
      { key: "unit", label: "单位" },
      { key: "category", label: "分类" },
      { key: "price", label: "单价", render: (v: any) => `¥${(v || 0).toFixed(2)}` },
      { key: "barcode", label: "条码" },
    ],
    suppliers: [
      { key: "name", label: "供应商名称" },
      { key: "contact", label: "联系人" },
      { key: "phone", label: "电话" },
      { key: "address", label: "地址" },
    ],
    employees: [
      { key: "name", label: "姓名" },
      { key: "employee_no", label: "工号" },
      { key: "department", label: "部门" },
    ],
  };

  const Forms: Record<TabKey, React.FC<any>> = {
    products: ProductForm,
    suppliers: SupplierForm,
    employees: EmployeeForm,
  };
  const FormComponent = Forms[tab];
  const formProps = tab === "products" ? { form, setForm, suppliers: masterSuppliers } : { form, setForm };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">📋 基础数据管理</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="border px-3 py-2 rounded-lg text-sm flex items-center gap-1 text-gray-600">
            <Download size={16} /> 导出
          </button>
          <label className="border px-3 py-2 rounded-lg text-sm flex items-center gap-1 text-green-600 cursor-pointer hover:bg-green-50">
            <Upload size={16} /> 导入
            <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={openNew} className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-1">
            <Plus size={16} /> 新增{TABS.find(t => t.key === tab)?.label}
          </button>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(""); }}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${tab === t.key ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 搜索 */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" placeholder={`搜索${TABS.find(t => t.key === tab)?.label}...`}
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b text-gray-600">
              <tr>
                {columns[tab].map(c => (
                  <th key={c.key} className="px-3 py-2.5 text-left">{c.label}</th>
                ))}
                <th className="px-3 py-2.5 text-center w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id || idx} className="border-b hover:bg-gray-50">
                  {columns[tab].map(c => (
                    <td key={c.key} className="px-3 py-2.5">{c.render ? c.render(item[c.key]) : (item[c.key] || "-")}</td>
                  ))}
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center gap-1 justify-center">
                      <button onClick={() => openEdit(item)} className="p-1 text-gray-400 hover:text-blue-500" title="编辑"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteTarget(item)} className="p-1 text-gray-400 hover:text-red-500" title="删除"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={columns[tab].length + 1} className="text-center text-gray-400 py-8">暂无数据</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 编辑/新增弹窗 */}
      <Modal open={modal} onClose={() => setModal(false)} title={edit ? `编辑${TABS.find(t => t.key === tab)?.label}` : `新增${TABS.find(t => t.key === tab)?.label}`}>
        <FormComponent {...formProps} />
        <button onClick={save} className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium mt-4">
          {edit ? "保存" : "创建"}
        </button>
      </Modal>

      {/* 删除确认 */}
      <Modal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="确认删除">
        <p className="mb-4 text-gray-600">确定要删除该{TABS.find(t => t.key === tab)?.label}吗？此操作不可撤销。</p>
        <div className="flex gap-2 justify-end">
          <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border rounded-lg text-sm">取消</button>
          <button onClick={confirmDelete} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm">删除</button>
        </div>
      </Modal>

      {/* 错误提示 */}
      <Modal open={errorMsg !== null} onClose={() => setErrorMsg(null)} title="提示">
        <p className="mb-4 text-gray-600">{errorMsg}</p>
        <div className="flex justify-end">
          <button onClick={() => setErrorMsg(null)} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm">确定</button>
        </div>
      </Modal>

      {/* 导入结果 */}
      <Modal open={importResult !== null} onClose={() => setImportResult(null)} title="导入结果">
        {importResult && (
          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-gray-500">总计：</span>{importResult.total || 0} 条
              <span className="text-green-600 ml-4">成功：</span>{importResult.success || 0} 条
            </div>
            {importResult.errors?.length > 0 && (
              <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                {importResult.errors.map((e: string, i: number) => (
                  <p key={i} className="text-xs text-red-600">{e}</p>
                ))}
              </div>
            )}
            <button onClick={() => setImportResult(null)} className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm">确定</button>
          </div>
        )}
      </Modal>
    </div>
  );
}

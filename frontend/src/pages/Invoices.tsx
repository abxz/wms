import { useEffect, useState, useRef } from "react";
import { api } from "../services/api";
import Modal from "../components/Modal";
import {
  Plus, Edit2, Trash2, Search, Upload as UploadIcon,
  CheckCircle, AlertCircle, Link2, Loader, FileText, Mail, Save, RefreshCw
} from "lucide-react";
import { Invoice } from '../types';

type Tab = 'list' | 'upload' | 'reconciliation' | 'settings';

export default function Invoices() {
  const [tab, setTab] = useState<Tab>('list');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'list', label: '发票台账' },
    { key: 'upload', label: '上传' },
    { key: 'reconciliation', label: '对账' },
    { key: 'settings', label: '设置' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">🧾 发票管理</h1>
      </div>
      {/* 子标签 */}
      <div className="flex gap-1 mb-4 border-b overflow-x-auto">
        {tabs.map(t => (
          <button key={t.key}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>
      {tab === 'list' && <InvoiceList />}
      {tab === 'upload' && <InvoiceUpload />}
      {tab === 'reconciliation' && <InvoiceReconciliation />}
      {tab === 'settings' && <InvoiceSettings />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   发票台账
   ═══════════════════════════════════════════════════════════ */
function InvoiceList() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<any>(null);

  const load = async (p = page) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getInvoices(p, 50, search);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      setError(e?.message || '加载失败，请重试');
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [page, search]);

  const filtered = search
    ? items.filter(i => (i.invoice_number || '').includes(search) || (i.seller_name || '').includes(search))
    : items;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input className="flex-1 p-3 border rounded-xl text-lg" placeholder="搜索发票号码/供应商..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <button className="px-4 bg-blue-600 text-white rounded-xl" onClick={() => load(1)}>搜索</button>
      </div>
      <div className="text-sm text-gray-500">共 {total} 条</div>
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</div>}
      {loading ? (
        <div className="text-center text-gray-400 py-10">加载中...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-400 py-10">暂无发票数据</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv: any, i: number) => (
            <div key={inv.id || i} className="bg-white rounded-xl p-4 shadow-sm cursor-pointer active:bg-gray-50"
              onClick={() => setDetail(inv)}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold">{inv.invoice_number || inv.invoice_no || '未知号码'}</div>
                  <div className="text-sm text-gray-500">{inv.seller_name || ''}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">{inv.total_amount ? `¥${inv.total_amount}` : inv.amount ? `¥${inv.amount}` : ''}</div>
                  <div className="text-xs text-gray-400">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                      inv.status === 'reconciled' ? 'bg-green-100 text-green-700' :
                      inv.status === 'duplicate' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{inv.status === 'reconciled' ? '已对账' : inv.status === 'duplicate' ? '重复' : inv.status || '待处理'}</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-1">{inv.issue_date || inv.date || ''} · {inv.invoice_type || ''}</div>
            </div>
          ))}
        </div>
      )}
      {/* 详情弹窗 */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setDetail(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-auto"
            onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">发票详情</h2>
            <div className="space-y-2 text-sm">
              {[
                ['发票号码', detail.invoice_number || detail.invoice_no],
                ['发票代码', detail.invoice_code],
                ['发票类型', detail.invoice_type],
                ['开票日期', detail.issue_date || detail.date],
                ['金额', detail.total_amount ? `¥${detail.total_amount}` : detail.amount ? `¥${detail.amount}` : ''],
                ['税额', detail.tax_amount ? `¥${detail.tax_amount}` : ''],
                ['销售方', detail.seller_name],
                ['购买方', detail.buyer_name],
                ['来源', detail.source],
                ['状态', detail.status === 'reconciled' ? '已对账' : detail.status === 'duplicate' ? '重复' : detail.status],
                ['WMS入库单', detail.wms_inbound_id || detail.inbound_order_id || '未关联'],
                ['文件', detail.file_path],
              ].filter(([_, v]) => v).map(([label, value]) => (
                <div key={label as string} className="flex justify-between border-b pb-1">
                  <span className="text-gray-500">{label as string}</span>
                  <span className="font-medium text-right max-w-[60%] break-all">{value as string}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 h-12 bg-gray-100 rounded-xl font-bold"
              onClick={() => setDetail(null)}>关闭</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   上传
   ═══════════════════════════════════════════════════════════ */
function InvoiceUpload() {
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(f =>
      /\.(pdf|ofd|xml|jpg|jpeg|png)$/i.test(f.name));
    setFiles(prev => [...prev, ...dropped]);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    setResults([]);
    for (const file of files) {
      try {
        const uploadRes = await api.uploadFile(file);
        const parseRes = await api.parseInvoiceFile(uploadRes.path, file.name, 'upload');
        if (parseRes.status === 'ok') {
          await api.classifyInvoice(parseRes.invoice);
          // 自动对账
          await api.autoMatchInvoice(parseRes.invoice).catch((e: any) => console.error("Auto-match failed:", e));
          setResults((prev: any) => [...prev, {
            file: file.name, status: 'ok',
            invoice_number: parseRes.invoice?.invoice_number,
          }]);
        } else if (parseRes.status === 'duplicate') {
          setResults((prev: any) => [...prev, { file: file.name, status: 'duplicate' }]);
        } else {
          setResults((prev: any) => [...prev, { file: file.name, status: 'failed', error: parseRes.error }]);
        }
      } catch (e: any) {
        setResults((prev: any) => [...prev, { file: file.name, status: 'error', error: e.message }]);
      }
    }
    setUploading(false);
    setFiles([]);
  };

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center active:border-blue-500 bg-white"
        onDrop={handleDrop} onDragOver={e => e.preventDefault()}
        onClick={() => document.getElementById('invoice-file-input')?.click()}>
        <UploadIcon size={48} className="mx-auto text-gray-300 mb-2" />
        <p className="text-gray-500">拖拽发票文件到这里</p>
        <p className="text-xs text-gray-400 mt-1">支持 PDF / OFD / XML / JPG / PNG</p>
        <input id="invoice-file-input" type="file" multiple className="hidden"
          accept=".pdf,.ofd,.xml,.jpg,.jpeg,.png"
          onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files || [])])} />
      </div>
      {files.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-bold mb-2">待上传 ({files.length})</h3>
          <div className="space-y-1 text-sm max-h-40 overflow-auto">
            {files.map((f, i) => (
              <div key={i} className="flex justify-between"><span>{f.name}</span><span className="text-gray-400">{(f.size / 1024).toFixed(0)}KB</span></div>
            ))}
          </div>
          <button className="w-full mt-3 h-12 bg-blue-600 text-white rounded-xl font-bold text-lg disabled:bg-gray-300 flex items-center justify-center gap-2"
            onClick={handleUpload} disabled={uploading}>
            {uploading && <Loader size={18} className="animate-spin" />}
            {uploading ? '上传解析中...' : `上传并解析 ${files.length} 个文件`}
          </button>
        </div>
      )}
      {results.length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h3 className="font-bold mb-2">处理结果</h3>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className={`p-3 rounded-xl ${r.status === 'ok' ? 'bg-green-50' : r.status === 'duplicate' ? 'bg-yellow-50' : 'bg-red-50'}`}>
                <div className="flex items-center gap-2">
                  {r.status === 'ok' ? <CheckCircle size={16} className="text-green-600" /> :
                   r.status === 'duplicate' ? <AlertCircle size={16} className="text-yellow-600" /> :
                   <AlertCircle size={16} className="text-red-600" />}
                  <span className="text-sm font-medium">{r.file}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1 ml-6">
                  {r.status === 'ok' ? '✅ 已解析' :
                   r.status === 'duplicate' ? '⏭️ 重复发票，已跳过' :
                   `❌ ${r.error || '处理失败'}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   对账
   ═══════════════════════════════════════════════════════════ */
function InvoiceReconciliation() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [inboundId, setInboundId] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getInvoices(1, 100);
      setInvoices((res.items || []).filter((i: any) => i.status !== 'reconciled'));
    } catch (e: any) {
      setError(e?.message || '加载失败，请重试');
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const doAutoMatch = async (inv: any) => {
    setSelected(inv);
    try { setMatches((await api.autoMatchInvoice(inv)).matches || []); } catch (e: any) { console.error(e); setMatches([]); }
  };

  const doManualReconcile = async () => {
    if (!selected || !inboundId) return;
    try {
      await api.reconcileInvoice(selected.invoice_number || selected.invoice_no, inboundId);
      setInvoices(prev => prev.filter((i: any) => (i.invoice_number || i.invoice_no) !== (selected.invoice_number || selected.invoice_no)));
      setSelected(null); setInboundId(''); setMatches([]);
    } catch (e: any) {
      setError(e?.message || '关联失败，请重试');
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-500">待对账发票：{invoices.length} 张</div>
      {error && <div className="text-sm text-red-600 bg-red-50 rounded-xl p-3">{error}</div>}
      {loading ? (
        <div className="text-center text-gray-400 py-10">加载中...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center text-green-600 py-10">
          <CheckCircle size={48} className="mx-auto mb-2" />
          <p className="font-bold">全部已对账</p>
        </div>
      ) : (
        <div className="space-y-2">
          {invoices.map((inv, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-bold">{inv.invoice_number || inv.invoice_no || '未知'}</div>
                  <div className="text-sm text-gray-500">{inv.seller_name || ''} · ¥{inv.total_amount || inv.amount || ''}</div>
                </div>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm"
                  onClick={() => doAutoMatch(inv)}>
                  <Link2 size={16} className="inline mr-1" />自动匹配
                </button>
              </div>
              {selected === inv && (
                <div className="mt-3 border-t pt-3">
                  {matches.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">匹配到 {matches.length} 条WMS入库单：</p>
                      {matches.map((m, j) => (
                        <div key={j} className="flex justify-between items-center p-2 bg-blue-50 rounded-xl">
                          <span className="text-sm">{m.inbound_id}</span>
                          <button className="text-sm text-blue-600 font-bold"
                            onClick={async () => {
                              await api.reconcileInvoice(inv.invoice_number || inv.invoice_no, m.inbound_id);
                              setInvoices(prev => prev.filter((x: any) => x !== inv));
                              setSelected(null);
                            }}>确认关联</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-yellow-600">⚠️ 未找到自动匹配，可手动输入入库单号：</p>
                      <div className="flex gap-2">
                        <input className="flex-1 p-2 border rounded-xl text-sm"
                          placeholder="输入WMS入库单号" value={inboundId}
                          onChange={e => setInboundId(e.target.value)} />
                        <button className="px-4 py-2 bg-gray-200 rounded-xl text-sm font-bold"
                          onClick={doManualReconcile} disabled={!inboundId}>关联</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   设置
   ═══════════════════════════════════════════════════════════ */
function InvoiceSettings() {
  const [emailCfg, setEmailCfg] = useState({
    imap_server: '', imap_port: 993, account: '',
    sender_whitelist: '', interval_minutes: 5,
  });
  const [saved, setSaved] = useState(false);

  const saveEmail = async () => {
    await api.setEmailConfig({
      ...emailCfg,
      sender_whitelist: emailCfg.sender_whitelist.split(',').map(s => s.trim()).filter(Boolean),
      password: '******',
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Mail size={20} />邮箱采集配置</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-gray-500">IMAP服务器</label>
            <input className="w-full p-3 border rounded-xl mt-1"
              value={emailCfg.imap_server}
              onChange={e => setEmailCfg(p => ({ ...p, imap_server: e.target.value }))}
              placeholder="imap.qq.com" />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-sm text-gray-500">端口</label>
              <input className="w-full p-3 border rounded-xl mt-1" type="number"
                value={emailCfg.imap_port}
                onChange={e => setEmailCfg(p => ({ ...p, imap_port: +e.target.value }))} />
            </div>
            <div className="flex-1">
              <label className="text-sm text-gray-500">轮询间隔(分钟)</label>
              <input className="w-full p-3 border rounded-xl mt-1" type="number"
                value={emailCfg.interval_minutes}
                onChange={e => setEmailCfg(p => ({ ...p, interval_minutes: +e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-sm text-gray-500">邮箱账号</label>
            <input className="w-full p-3 border rounded-xl mt-1"
              value={emailCfg.account}
              onChange={e => setEmailCfg(p => ({ ...p, account: e.target.value }))}
              placeholder="invoice@company.com" />
          </div>
          <div>
            <label className="text-sm text-gray-500">发件人白名单（逗号分隔）</label>
            <input className="w-full p-3 border rounded-xl mt-1"
              value={emailCfg.sender_whitelist}
              onChange={e => setEmailCfg(p => ({ ...p, sender_whitelist: e.target.value }))}
              placeholder="supplier@huawei.com, finance@zte.com.cn" />
          </div>
          <button className="w-full h-12 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            onClick={saveEmail}>
            <Save size={18} />{saved ? '已保存' : '保存配置'}
          </button>
        </div>
      </div>
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <h2 className="text-lg font-bold mb-2">分类规则</h2>
        <div className="text-sm text-gray-500 space-y-1">
          <p>📁 命名模板：<code className="bg-gray-100 px-2 rounded">{'{金额}_{开票时间}_{发票号码}_{公司}'}</code></p>
          <p>📁 目录结构：<code className="bg-gray-100 px-2 rounded">archive/{'{发票类型}'}/{'{供应商}'}/{'{YYYY-MM}'}/</code></p>
        </div>
      </div>
    </div>
  );
}

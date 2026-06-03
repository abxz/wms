import { useState, useRef } from "react";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, HelpCircle } from "lucide-react";
import Modal from "./Modal";
import { api } from "../services/api";

interface SuspectItem {
  name: string;
  line: number;
  similar_to: { name: string; rule: string }[];
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  /** 模板类型（支持配置项: config-departments/positions/job_types/roles） */
  templateType: string;
  /** 导入函数 */
  onImport: (file: File) => Promise<any>;
  /** 导入成功后回调 */
  onSuccess?: () => void;
  /** 模块显示名 */
  moduleName: string;
}

export default function ImportModal({ open, onClose, templateType, onImport, onSuccess, moduleName }: ImportModalProps) {
  const [step, setStep] = useState<'ask' | 'upload' | 'result' | 'suspects'>('ask');
  const [result, setResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // suspects 相关状态
  const [suspects, setSuspects] = useState<SuspectItem[]>([]);
  const [selectedSuspects, setSelectedSuspects] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);

  const handleDownloadTemplate = async () => {
    try {
      await api.downloadTemplate(templateType);
      setStep('upload');
    } catch (e: any) {
      setError(e?.message || '模板下载失败');
    }
  };

  const handleDirectImport = () => {
    setStep('upload');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const r = await onImport(file);
      setResult(r);
      // 检查是否有suspects需要用户确认
      if (r.suspects && r.suspects.length > 0) {
        setSuspects(r.suspects);
        setSelectedSuspects(new Set(r.suspects.map((s: SuspectItem) => s.name)));
        setStep('suspects');
      } else {
        setStep('result');
      }
      onSuccess?.();
    } catch (err: any) {
      setResult({ errors: [err?.message || '导入失败'] });
      setStep('result');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const toggleSuspect = (name: string) => {
    setSelectedSuspects(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleConfirmSuspects = async () => {
    setConfirming(true);
    try {
      const confirmed = suspects.filter(s => selectedSuspects.has(s.name)).map(s => s.name);
      const rejected = suspects.filter(s => !selectedSuspects.has(s.name)).map(s => s.name);
      // 调用确认接口（需要从templateType提取configType）
      const configType = templateType.replace('config-', '');
      await api.confirmImportConfig(configType, confirmed, rejected);
      setStep('result');
      onSuccess?.();
    } catch (e: any) {
      setError(e?.message || '确认失败');
    } finally {
      setConfirming(false);
    }
  };

  const handleSkipAll = async () => {
    setConfirming(true);
    try {
      const configType = templateType.replace('config-', '');
      const rejected = suspects.map(s => s.name);
      await api.confirmImportConfig(configType, [], rejected);
      setStep('result');
      onSuccess?.();
    } catch (e: any) {
      setError(e?.message || '操作失败');
    } finally {
      setConfirming(false);
    }
  };

  const handleClose = () => {
    setStep('ask');
    setResult(null);
    setError(null);
    setUploading(false);
    setSuspects([]);
    setSelectedSuspects(new Set());
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={`导入${moduleName}`}>
      {step === 'ask' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">是否需要下载导入模板？</p>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-2 rounded-lg flex items-center gap-1">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleDownloadTemplate}
              className="flex-1 flex items-center justify-center gap-2 border border-blue-300 text-blue-600 py-2.5 rounded-lg text-sm hover:bg-blue-50 transition-colors"
            >
              <Download size={16} /> 下载模板
            </button>
            <button
              onClick={handleDirectImport}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white py-2.5 rounded-lg text-sm hover:bg-blue-600 transition-colors"
            >
              <Upload size={16} /> 直接导入
            </button>
          </div>
        </div>
      )}

      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">选择 .xlsx 文件进行导入</p>
          {uploading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
              <p className="text-sm text-gray-500">正在导入...</p>
            </div>
          ) : (
            <label className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
              <FileSpreadsheet size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">点击选择文件或拖拽到此处</p>
              <p className="text-xs text-gray-400 mt-1">仅支持 .xlsx 格式</p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}
          <button
            onClick={() => setStep('ask')}
            className="w-full border py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            返回
          </button>
        </div>
      )}

      {step === 'suspects' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle size={20} className="text-orange-500" />
            <span className="font-medium text-sm">发现疑似重复项</span>
          </div>
          {result && (
            <div className="text-sm bg-gray-50 rounded-lg p-3">
              {result.success > 0 && <span className="text-green-600">已添加 {result.success} 项</span>}
              {result.skipped > 0 && <span className="text-gray-500 ml-3">跳过 {result.skipped} 项</span>}
              <span className="text-orange-600 ml-3">疑似重复 {suspects.length} 项</span>
            </div>
          )}
          <p className="text-xs text-gray-500">请确认以下项目是否需要添加：</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {suspects.map((s, i) => (
              <div key={i} className="border rounded-lg p-3 text-sm">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSuspects.has(s.name)}
                    onChange={() => toggleSuspect(s.name)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <span className="font-medium">{s.name}</span>
                    <div className="text-xs text-gray-500 mt-1">
                      疑似与以下项重复：
                      {s.similar_to.map((sim, j) => (
                        <span key={j} className="ml-1">
                          <span className="text-orange-600">"{sim.name}"</span>
                          <span className="text-gray-400">（{sim.rule}）</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </label>
              </div>
            ))}
          </div>
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-2 rounded-lg flex items-center gap-1">
              <AlertCircle size={14} /> {error}
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleSkipAll}
              disabled={confirming}
              className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50"
            >
              全部跳过
            </button>
            <button
              onClick={handleConfirmSuspects}
              disabled={confirming || selectedSuspects.size === 0}
              className="flex-1 bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50"
            >
              {confirming ? "处理中..." : `确认添加 ${selectedSuspects.size} 项`}
            </button>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {result.errors?.length > 0 ? (
              <AlertCircle size={20} className="text-orange-500" />
            ) : (
              <CheckCircle size={20} className="text-green-500" />
            )}
            <span className="font-medium text-sm">导入完成</span>
          </div>
          <div className="text-sm bg-gray-50 rounded-lg p-3">
            <span className="text-gray-500">总计：</span>
            <span className="font-medium">{result.total || 0}</span> 条
            <span className="text-green-600 ml-4">成功：</span>
            <span className="font-medium">{result.success || result.imported || 0}</span> 条
            {result.skipped > 0 && (
              <>
                <span className="text-gray-500 ml-4">跳过：</span>
                <span className="font-medium">{result.skipped}</span> 条
              </>
            )}
            {result.errors?.length > 0 && (
              <>
                <span className="text-red-600 ml-4">失败：</span>
                <span className="font-medium">{result.errors.length}</span> 条
              </>
            )}
          </div>
          {result.errors?.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-red-600 mb-1">详情：</p>
              {result.errors.map((e: string, i: number) => (
                <p key={i} className="text-xs text-red-500">{typeof e === 'string' ? e : JSON.stringify(e)}</p>
              ))}
            </div>
          )}
          <button
            onClick={handleClose}
            className="w-full bg-blue-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
          >
            确定
          </button>
        </div>
      )}
    </Modal>
  );
}

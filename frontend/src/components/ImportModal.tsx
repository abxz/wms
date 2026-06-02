import { useState, useRef } from "react";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle } from "lucide-react";
import Modal from "./Modal";
import { api } from "../services/api";

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  /** 模板类型 */
  templateType: 'main-data' | 'employees' | 'orders' | 'master-products' | 'master-suppliers' | 'master-employees';
  /** 导入函数 */
  onImport: (file: File) => Promise<any>;
  /** 导入成功后回调 */
  onSuccess?: () => void;
  /** 模块显示名 */
  moduleName: string;
}

export default function ImportModal({ open, onClose, templateType, onImport, onSuccess, moduleName }: ImportModalProps) {
  const [step, setStep] = useState<'ask' | 'upload' | 'result'>('ask');
  const [result, setResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
      setStep('result');
      onSuccess?.();
    } catch (err: any) {
      setResult({ errors: [err?.message || '导入失败'] });
      setStep('result');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleClose = () => {
    setStep('ask');
    setResult(null);
    setError(null);
    setUploading(false);
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
            {result.errors?.length > 0 && (
              <>
                <span className="text-red-600 ml-4">失败：</span>
                <span className="font-medium">{result.errors.length}</span> 条
              </>
            )}
          </div>
          {result.errors?.length > 0 && (
            <div className="bg-red-50 rounded-lg p-3 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-red-600 mb-1">错误详情：</p>
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

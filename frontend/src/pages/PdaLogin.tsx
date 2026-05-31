import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { Scan, AlertCircle } from "lucide-react";

export default function PdaLogin() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in, redirect
    const token = localStorage.getItem("admin_token");
    if (token) {
      api.pdaVerify(token)
        .then(() => navigate("/pda/outbound", { replace: true }))
        .catch(() => localStorage.removeItem("admin_token"));
    }
    inputRef.current?.focus();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setError("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && input.trim()) {
      doLogin(input.trim());
    }
  };

  const doLogin = async (qrCode: string) => {
    setLoading(true);
    setError("");
    try {
      const res: any = await api.pdaLogin(qrCode);
      localStorage.setItem("admin_token", res.token);
      localStorage.setItem("admin_name", res.admin_name || "");
      localStorage.setItem("admin_role", res.role || "");
      navigate("/pda/outbound", { replace: true });
    } catch {
      setError("未授权的二维码，请重试");
      setInput("");
      setTimeout(() => inputRef.current?.focus(), 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 bg-blue-500 rounded-2xl flex items-center justify-center mb-4">
            <Scan size={40} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">仓储管理</h1>
          <p className="text-gray-400 mt-1">WMS v2.0 · PDA</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-6">
          <p className="text-white text-xl font-semibold text-center mb-6">请扫码登录</p>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="w-full bg-gray-700 text-white text-lg rounded-xl px-4 py-4 outline-none border-2 border-transparent focus:border-blue-500 transition-colors"
            placeholder="扫描员工二维码..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            disabled={loading}
          />

          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="mt-4 flex justify-center">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          <p className="text-gray-500 text-xs text-center mt-4">
            将扫码枪对准员工工牌二维码
          </p>
        </div>
      </div>
    </div>
  );
}

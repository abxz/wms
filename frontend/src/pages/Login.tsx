import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Warehouse } from "lucide-react";

export default function Login() {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `HTTP ${res.status}`);
      }
      const data = await res.json();
      localStorage.setItem("wms_token", data.token);
      localStorage.setItem("wms_role", data.role || "admin");
      localStorage.setItem("wms_name", data.admin_name || "");
      navigate("/", { replace: true });
    } catch (e: any) {
      try { setError(JSON.parse(e.message)?.detail || e.message); } catch { setError(e.message); }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl flex items-center justify-center mb-3">
            <Warehouse size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">仓储管理系统</h1>
          <p className="text-sm text-slate-400 mt-1">WMS v2.1</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">用户名</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="工号 或 admin"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              autoComplete="username"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">密码</label>
            <input
              type="password"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              placeholder="密码"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-lg font-medium text-sm transition-colors disabled:opacity-60"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
        <p className="text-xs text-slate-400 text-center mt-6">默认账号：admin / admin123</p>
      </div>
    </div>
  );
}

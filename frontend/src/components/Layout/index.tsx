import React, { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, ArrowDownToLine, ArrowUpFromLine,
  Warehouse, Users, FileText, UserCircle, MapPin, Menu, X, QrCode, LogOut
} from 'lucide-react';

const navItems = [
  { path: '/', label: '面板', icon: LayoutDashboard },
  { path: '/products', label: '商品', icon: Package },
  { path: '/inbound', label: '入库', icon: ArrowDownToLine },
  { path: '/outbound', label: '出库', icon: ArrowUpFromLine },
  { path: '/inventory', label: '库存', icon: Warehouse },
  { path: '/suppliers', label: '供应商', icon: Users },
  { path: '/invoices', label: '发票', icon: FileText },
  { path: '/employees', label: '员工', icon: UserCircle },
  { path: '/locations', label: '库位', icon: MapPin },
  { path: '/warehouses', label: '仓库', icon: Warehouse },
  { path: '/master-data', label: '基础数据', icon: FileText },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 桌面端侧栏 */}
      <aside className={`fixed top-0 left-0 h-full bg-slate-900 text-white z-40 transition-all
        ${isMobile ? (sidebarOpen ? 'w-64' : '-translate-x-full') : 'w-64'}`}>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl flex items-center justify-center">
              <Warehouse size={22} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">仓储管理</h1>
              <p className="text-xs text-slate-500">{localStorage.getItem("wms_name") || "WMS v2.1"}</p>
            </div>
            <button onClick={() => { localStorage.removeItem("wms_token"); localStorage.removeItem("wms_role"); localStorage.removeItem("wms_name"); navigate("/login"); }}
              className="p-1.5 text-slate-400 hover:text-white" title="退出登录">
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                ${isActive
                  ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'}`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* 遮罩 */}
      {isMobile && sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 主内容 */}
      <div className={`${isMobile ? '' : 'ml-64'} flex flex-col min-h-screen`}>
        {/* 顶栏（移动端显示菜单按钮） */}
        {isMobile && (
          <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="p-2">
              <Menu className="w-6 h-6 text-slate-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center">
                <Warehouse size={16} className="text-white" />
              </div>
              <span className="font-semibold text-slate-800">仓储管理</span>
            </div>
            <div className="w-10" />
          </header>
        )}

        {/* 桌面端顶栏 */}
        {!isMobile && (
          <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 h-14 flex items-center">
            <span className="text-sm font-medium text-slate-500">
              {navItems.find(i => {
                if (i.path === '/') return location.pathname === '/';
                return location.pathname.startsWith(i.path);
              })?.label || '仓储管理'}
            </span>
          </header>
        )}

        {/* 页面内容 */}
        <main className="flex-1 p-4 sm:p-6 pb-20 sm:pb-6">
          {children}
        </main>
      </div>

      {/* 移动端底部导航 */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-slate-200 safe-area-bottom">
          <div className="flex overflow-x-auto scrollbar-hide py-1 px-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex-shrink-0 flex flex-col items-center py-1 px-2 text-xs transition-colors
                    ${active ? 'text-violet-600' : 'text-slate-400'}`}
                >
                  <Icon className="w-5 h-5 mb-0.5" />
                  {item.label}
                </NavLink>
              );
            })}
            <button
              onClick={() => navigate('/scanner')}
              className="flex-shrink-0 flex flex-col items-center py-1 px-2 text-xs text-slate-400"
            >
              <QrCode className="w-5 h-5 mb-0.5" />
              扫码
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

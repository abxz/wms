import React, { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, PackagePlus, Truck,
  Boxes, Building2, Receipt, Users, Grid3x3, Store, Database, Menu, X, QrCode, LogOut, DatabaseBackup,
  ShieldCheck, Bell, Warehouse
} from 'lucide-react';
import { api } from '../../services/api';

const navItems = [
  { path: '/', label: '面板', icon: LayoutDashboard },
  { path: '/products', label: '商品', icon: Package },
  { path: '/inbound', label: '入库', icon: PackagePlus },
  { path: '/outbound', label: '出库', icon: Truck },
  { path: '/inventory', label: '库存', icon: Boxes },
  { path: '/suppliers', label: '供应商', icon: Building2 },
  { path: '/invoices', label: '发票', icon: Receipt },
  { path: '/hr-management', label: '人力资源管理', icon: Users },
  { path: '/locations', label: '库位', icon: Grid3x3 },
  { path: '/warehouses', label: '仓库', icon: Store },
  { path: '/backup', label: '数据备份', icon: DatabaseBackup },
  { path: '/labor', label: '劳保用品', icon: ShieldCheck },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsMobile(window.innerWidth < 640);
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadUnreadCount = async () => {
    try {
      const res = await api.getUnreadCount();
      setUnreadCount(res.count || 0);
    } catch {}
  };

  const loadNotifications = async () => {
    try {
      const res = await api.getNotifications(1, 20, false);
      setNotifications(res.items || []);
    } catch {}
  };

  const toggleNotifications = () => {
    if (!notifOpen) loadNotifications();
    setNotifOpen(!notifOpen);
  };

  const markRead = async (id: string) => {
    await api.markNotificationRead(id);
    loadNotifications();
    loadUnreadCount();
  };

  const markAllRead = async () => {
    await api.markAllNotificationsRead();
    loadNotifications();
    loadUnreadCount();
  };

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
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-base transition-all duration-200
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
          <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b border-slate-200 px-6 h-14 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500">
              {navItems.find(i => {
                if (i.path === '/') return location.pathname === '/';
                return location.pathname.startsWith(i.path);
              })?.label || '仓储管理'}
            </span>
            <NotificationBell
              notifRef={notifRef}
              unreadCount={unreadCount}
              notifOpen={notifOpen}
              notifications={notifications}
              onToggle={toggleNotifications}
              onMarkRead={markRead}
              onMarkAllRead={markAllRead}
            />
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

function NotificationBell({ notifRef, unreadCount, notifOpen, notifications, onToggle, onMarkRead, onMarkAllRead }: any) {
  return (
    <div className="relative" ref={notifRef}>
      <button onClick={onToggle} className="relative p-2 text-slate-600 hover:text-violet-600 transition">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {notifOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-xl shadow-xl max-h-96 overflow-hidden flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="font-semibold text-sm">通知</span>
            {notifications.length > 0 && (
              <button onClick={onMarkAllRead} className="text-xs text-violet-600 hover:underline">全部已读</button>
            )}
          </div>
          <div className="overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">暂无通知</div>
            ) : (
              notifications.map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && onMarkRead(n.id)}
                  className={`p-3 border-b hover:bg-slate-50 cursor-pointer ${!n.read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{n.title}</div>
                      <div className="text-xs text-slate-500 mt-1">{n.message}</div>
                      <div className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString('zh-CN')}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

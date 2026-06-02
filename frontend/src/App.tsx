import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Products = lazy(() => import('./pages/Products'));
const Inbound = lazy(() => import('./pages/Inbound'));
const Outbound = lazy(() => import('./pages/Outbound'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Invoices = lazy(() => import('./pages/Invoices'));
const Employees = lazy(() => import('./pages/Employees'));
const Locations = lazy(() => import('./pages/Locations'));
const Warehouses = lazy(() => import('./pages/Warehouses'));
const MasterData = lazy(() => import('./pages/MasterData'));
const BackupPage = lazy(() => import('./pages/BackupPage'));
const LaborProtection = lazy(() => import('./pages/LaborProtection'));

const Loading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-wms-primary" />
  </div>
);

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("wms_token");
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        <RequireAuth>
          <Layout>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/inbound" element={<Inbound />} />
                <Route path="/outbound" element={<Outbound />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/invoices" element={<Invoices />} />
                <Route path="/employees" element={<Employees />} />
                <Route path="/locations" element={<Locations />} />
                <Route path="/warehouses" element={<Warehouses />} />
                <Route path="/master-data" element={<MasterData />} />
                <Route path="/backup" element={<BackupPage />} />
                <Route path="/labor" element={<LaborProtection />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Layout>
        </RequireAuth>
      } />
    </Routes>
  );
}

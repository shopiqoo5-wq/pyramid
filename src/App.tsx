import React, { lazy, useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import { safeRedirectPath } from './utils/security';
import { LuLoader } from 'react-icons/lu';

import AdminLayout from './components/layout/AdminLayout';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminOrders from './pages/Admin/Orders';
import AdminProducts from './pages/Admin/Products';
import AdminClients from './pages/Admin/Clients';
import AdminInvoices from './pages/Admin/Invoices';
import AdminFinance from './pages/Admin/Finance';
import AdminContracts from './pages/Admin/Contracts';
import Analytics from './pages/Admin/Analytics';
import ClientPricing from './pages/Admin/ClientPricing';
import AdminWebhooks from './pages/Admin/Webhooks';
import AdminInventory from './pages/Admin/Inventory';
import AdminBundles from './pages/Admin/Bundles';
const StaffRegistry = lazy(() => import('./pages/Admin/StaffRegistry'));
const CorporateLogin = lazy(() => import('./pages/Admin/CorporateLogin'));
const CredentialManager = lazy(() => import('./pages/Admin/CredentialManager'));
const PlatformSecurity = lazy(() => import('./pages/Admin/PlatformSecurity'));
const EnterpriseClients = lazy(() => import('./pages/Admin/EnterpriseClients'));
import ReturnsManagement from './pages/Admin/ReturnsManagement';
const LogisticsManager = lazy(() => import('./pages/Admin/Logistics'));
import PricingTiers from './pages/Admin/PricingTiers';
import InventoryControl from './pages/Admin/InventoryControl';
import OpsAudit from './pages/Admin/OpsAudit';
import Compliance from './pages/Admin/Compliance';
import AdminSettings from './pages/Admin/Settings';
const Helpdesk = lazy(() => import('./pages/Admin/Helpdesk'));
import SystemHealth from './pages/Admin/SystemHealth';
const AttendanceReport = lazy(() => import('./pages/Admin/AttendanceReport'));
const WorkforceHub = lazy(() => import('./pages/Admin/WorkforceHub'));
const SiteMatrix = lazy(() => import('./pages/Admin/SiteMatrix'));
const OpsCommandCenter = lazy(() => import('./pages/Admin/OpsCommandCenter'));
const WorkEvidence = lazy(() => import('./pages/Admin/WorkEvidence'));
const PayrollRun = lazy(() => import('./pages/Admin/PayrollRun'));
const PunchRedirect = lazy(() => import('./pages/PunchRedirect'));


import EmployeeLayout from './components/layout/EmployeeLayout';
import EmployeeDashboard from './pages/Employee/Dashboard';
import ActivityHistory from './pages/Employee/ActivityHistory';
import SiteProtocols from './pages/Employee/SiteProtocols';
import FieldIncident from './pages/Employee/FieldIncident';
import MySchedule from './pages/Employee/MySchedule';
import TimeOff from './pages/Employee/TimeOff';
import EmployeeSettings from './pages/Employee/Settings';
import WorkReports from './pages/Employee/WorkReports';

import ClientLayout from './components/layout/ClientLayout';
import ToastContainer from './components/layout/ToastContainer';
import ClientDashboard from './pages/Portal/Dashboard';
import Catalog from './pages/Portal/Catalog';
import QuickOrder from './pages/Portal/QuickOrder';
import Cart from './pages/Portal/Cart';
import ClientOrders from './pages/Portal/Orders';
import ComplianceVault from './pages/Portal/ComplianceVault';
import OrderTracking from './pages/Portal/OrderTracking';
import ClientApprovals from './pages/Portal/Approvals';
import FastReorderResult from './pages/Portal/FastReorderResult';
import Returns from './pages/Portal/Returns';
import ClientInvoices from './pages/Portal/Invoices';
import RecurringOrders from './pages/Portal/RecurringOrders';
import Locations from './pages/Portal/Locations';
import QRCodeScanner from './pages/Portal/QRCodeScanner';
import Reports from './pages/Portal/Reports';
import ClientSettings from './pages/Portal/Settings';
import AttendanceTerminal from './pages/Portal/AttendanceTerminal';
import SupportDesk from './pages/Portal/SupportDesk';
import TeamManagement from './pages/Portal/TeamManagement';
import AgreementConsole from './pages/Portal/AgreementConsole';
import AttendanceLoggingQR from './pages/AttendanceLoggingQR';

const App: React.FC = () => {
  const initBackend = useStore((state) => state.initBackend);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    // Restore saved theme on mount
    const savedTheme = localStorage.getItem('pf-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    initBackend();
  }, [initBackend]);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen background-nexus">
          <div className="flex flex-col items-center gap-4">
            <LuLoader className="animate-spin text-primary" size={48} />
            <p className="text-muted font-bold animate-pulse">SYNCHRONIZING NEXUS...</p>
          </div>
        </div>
      }>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/punch" element={<PunchRedirect />} />
          
          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin', 'procurement_manager', 'warehouse_staff']} />}>
            <Route element={<AdminLayout />}>
              
              <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/inventory" element={<AdminInventory />} />
                <Route path="/admin/bundles" element={<AdminBundles />} />
                <Route path="/admin/clients" element={<AdminClients />} />
                <Route path="/admin/invoices" element={<AdminInvoices />} />
                <Route path="/admin/finance" element={<AdminFinance />} />
                <Route path="/admin/contracts" element={<AdminContracts />} />
                <Route path="/admin/analytics" element={<Analytics />} />
                <Route path="/admin/ops-audit" element={<OpsAudit />} />
                <Route path="/admin/compliance" element={<Compliance />} />
                <Route path="/admin/staff-registry" element={<StaffRegistry />} />
                <Route path="/admin/security" element={<PlatformSecurity />} />
                <Route path="/admin/corporate-login" element={<CorporateLogin />} />
                <Route path="/admin/credential-manager" element={<CredentialManager />} />
                <Route path="/admin/enterprise-clients" element={<EnterpriseClients />} />
                <Route path="/admin/attendance-report" element={<AttendanceReport />} />
                <Route path="/admin/site-matrix/:companyId" element={<SiteMatrix />} />
                <Route path="/admin/helpdesk" element={<Helpdesk />} />
                <Route path="/admin/evidence" element={<WorkEvidence />} />
                <Route path="/admin/payroll" element={<PayrollRun />} />
                <Route path="/admin/custom-pricing" element={<ClientPricing />} />
                <Route path="/admin/ops-command" element={<OpsCommandCenter />} />
                <Route path="/admin/pricing-tiers" element={<PricingTiers />} />
                <Route path="/admin/logistics" element={<LogisticsManager />} />
                <Route path="/admin/webhooks" element={<AdminWebhooks />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/system-health" element={<SystemHealth />} />

                {/* Workforce Hub - SEC-14: Modular Routing handled internally by WorkforceHub */}
                <Route path="/admin/workforce/*" element={<WorkforceHub />} />
              </Route>
              
              <Route element={<ProtectedRoute allowedRoles={['admin', 'procurement_manager']} />}>
                <Route path="/admin/returns" element={<ReturnsManagement />} />
              </Route>
              
              <Route element={<ProtectedRoute allowedRoles={['admin', 'warehouse_staff']} />}>
                <Route path="/admin/inventory-control" element={<InventoryControl />} />
              </Route>

            </Route>
    
            <Route path="/kiosk/attendance" element={<AttendanceLoggingQR />} />
          </Route>

          {/* Client Portal Routes */}
          <Route element={<ProtectedRoute allowedRoles={['client_director', 'client_manager', 'procurement_manager', 'facility_manager', 'finance', 'client_staff']} />}>
            <Route element={<ClientLayout />}>
              <Route path="/portal" element={<ClientDashboard />} />
              <Route path="/portal/catalog" element={<Catalog />} />
              <Route path="/portal/quick-order" element={<QuickOrder />} />
              <Route path="/portal/cart" element={<Cart />} />
              <Route path="/portal/orders" element={<ClientOrders />} />
              <Route path="/portal/tracking" element={<OrderTracking />} />
              <Route path="/portal/invoices" element={<ClientInvoices />} />
              <Route path="/portal/subscriptions" element={<RecurringOrders />} />
              <Route path="/portal/locations" element={<Locations />} />
              <Route path="/portal/approvals" element={<ClientApprovals />} />
              <Route path="/portal/scan" element={<QRCodeScanner />} />
              <Route path="/portal/attendance" element={<AttendanceTerminal />} />
              <Route path="/portal/scan-result" element={<FastReorderResult />} />
              <Route path="/portal/compliance-vault" element={<ComplianceVault />} />
              <Route path="/portal/returns" element={<Returns />} />
              <Route path="/portal/reports" element={<Reports />} />
              <Route path="/portal/support" element={<SupportDesk />} />
              <Route path="/portal/team" element={<TeamManagement />} />
              <Route path="/portal/agreements" element={<AgreementConsole />} />
              <Route path="/portal/settings" element={<ClientSettings />} />
              </Route>
            </Route>
    
            {/* Employee App Routes */}
            <Route element={<ProtectedRoute allowedRoles={['employee']} />}>
              <Route element={<EmployeeLayout />}>
                <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
                <Route path="/employee/history" element={<ActivityHistory />} />
              <Route path="/employee/reports" element={<WorkReports />} />
                <Route path="/employee/protocols" element={<SiteProtocols />} />
                <Route path="/employee/incident" element={<FieldIncident />} />
                <Route path="/employee/schedule" element={<MySchedule />} />
                <Route path="/employee/time-off" element={<TimeOff />} />
                <Route path="/employee/settings" element={<EmployeeSettings />} />
              </Route>
            </Route>

          {/* Fallback routing — SEC-13: use safeRedirectPath() to prevent open redirect */}
          <Route path="/" element={<Navigate to={safeRedirectPath(new URLSearchParams(window.location.search).get('redirect'), '/login')} replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;

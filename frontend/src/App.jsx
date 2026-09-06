import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'sonner';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

// Pages
import LoginPage from './pages/LoginPage';
import SalesRepDashboard from './pages/SalesRepDashboard';
import SalesManagerDashboard from './pages/SalesManagerDashboard';
import FinanceOperationsDashboard from './pages/FinanceOperationsDashboard';
import CustomerPortal from './pages/CustomerPortal';
import AdminDashboard from './pages/AdminDashboard';
import QuotationsPage from './pages/QuotationsPage';
import QuotationDetailPage from './pages/QuotationDetailPage';
import ApprovalsPage from './pages/ApprovalsPage';
import FulfillmentPage from './pages/FulfillmentPage';
import InvoicesPage from './pages/InvoicesPage';
import SubscriptionsPage from './pages/SubscriptionsPage';
import DealHealthPage from './pages/DealHealthPage';
import ClosedDealsPage from './pages/ClosedDealsPage';
import OrdersPage from './pages/OrdersPage';

// Protected Route Guard Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-xs text-slate-400">Verifying session...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const roleRoutes = {
      SALES_REP: '/sales-rep',
      SALES_MANAGER: '/sales-manager',
      FINANCE_OPERATIONS: '/finance',
      CUSTOMER: '/customer-portal',
      ADMIN: '/admin'
    };
    return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
  }

  return children;
};

// Root Dashboard Redirector based on logged-in role
const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const roleRoutes = {
    SALES_REP: '/sales-rep',
    SALES_MANAGER: '/sales-manager',
    FINANCE_OPERATIONS: '/finance',
    CUSTOMER: '/customer-portal',
    ADMIN: '/admin'
  };

  return <Navigate to={roleRoutes[user.role] || '/login'} replace />;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthProvider>
          <Toaster position="top-right" theme="dark" richColors />
          
          <Routes>
            {/* Public Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Dashboard Wrapper */}
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<HomeRedirect />} />

              {/* Role Dashboards */}
              <Route path="/sales-rep" element={<ProtectedRoute allowedRoles={['SALES_REP', 'ADMIN']}><SalesRepDashboard /></ProtectedRoute>} />
              <Route path="/sales-manager" element={<ProtectedRoute allowedRoles={['SALES_MANAGER', 'ADMIN']}><SalesManagerDashboard /></ProtectedRoute>} />
              <Route path="/finance" element={<ProtectedRoute allowedRoles={['FINANCE_OPERATIONS', 'ADMIN']}><FinanceOperationsDashboard /></ProtectedRoute>} />
              <Route path="/customer-portal" element={<ProtectedRoute allowedRoles={['CUSTOMER', 'ADMIN']}><CustomerPortal /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />

              {/* Operations & Detailed Pages */}
              <Route path="/quotations" element={<ProtectedRoute><QuotationsPage /></ProtectedRoute>} />
              <Route path="/quotations/:id" element={<ProtectedRoute><QuotationDetailPage /></ProtectedRoute>} />
              <Route path="/approvals" element={<ProtectedRoute allowedRoles={['SALES_MANAGER', 'FINANCE_OPERATIONS', 'ADMIN']}><ApprovalsPage /></ProtectedRoute>} />
              <Route path="/fulfillment" element={<ProtectedRoute allowedRoles={['SALES_REP', 'FINANCE_OPERATIONS', 'ADMIN']}><FulfillmentPage /></ProtectedRoute>} />
              <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
              <Route path="/subscriptions" element={<ProtectedRoute><SubscriptionsPage /></ProtectedRoute>} />
              <Route path="/deal-health" element={<ProtectedRoute allowedRoles={['SALES_MANAGER', 'FINANCE_OPERATIONS', 'ADMIN']}><DealHealthPage /></ProtectedRoute>} />
              <Route path="/closed-deals" element={<ProtectedRoute><ClosedDealsPage /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
              <Route path="/negotiations" element={<ProtectedRoute><QuotationsPage /></ProtectedRoute>} />
            </Route>

            {/* Catch all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;

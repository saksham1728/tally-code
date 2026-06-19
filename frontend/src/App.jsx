/**
 * Main App Component
 * 
 * Sets up routing and context providers for the application
 * 
 * Requirements: 13.2, 13.3, 13.4, 13.5, 13.6
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { InvoiceProvider } from './contexts/InvoiceContext';
import { CompanyProvider } from './contexts/CompanyContext';
import Navbar from './components/common/Navbar';
import LoginPage from './pages/LoginPage';
import SellerDashboard from './pages/SellerDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import CompanyProfilePage from './pages/CompanyProfilePage';
import SyncLogsPage from './pages/SyncLogsPage';
import SuperAdminPanel from './pages/SuperAdminPanel';
import './App.css';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, isAuthenticated, loading } = useAuth();
  
  console.log('🛡️ ProtectedRoute check:', { user, isAuthenticated, loading, allowedRoles });

  // Show loading while auth is being initialized
  if (loading) {
    console.log('⏳ Auth loading, waiting...');
    return <div className="loading-screen">Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    console.log('❌ Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    console.log('❌ Role not allowed, redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  console.log('✅ Access granted');
  return children;
};

// Dashboard Router - routes to appropriate dashboard based on role
const DashboardRouter = () => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case 'seller_admin':
      return <SellerDashboard />;
    case 'buyer_admin':
      return <BuyerDashboard />;
    case 'super_admin':
      return <SuperAdminPanel />;
    default:
      return <Navigate to="/login" replace />;
  }
};

// Layout with Navbar
const Layout = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="app-container">
      {isAuthenticated && <Navbar />}
      <main className="main-content">{children}</main>
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <InvoiceProvider>
          <CompanyProvider>
            <Layout>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<LoginPage />} />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardRouter />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/seller-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['seller_admin']}>
                      <SellerDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/buyer-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['buyer_admin']}>
                      <BuyerDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/company-profile"
                  element={
                    <ProtectedRoute>
                      <CompanyProfilePage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/sync-logs"
                  element={
                    <ProtectedRoute>
                      <SyncLogsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['super_admin']}>
                      <SuperAdminPanel />
                    </ProtectedRoute>
                  }
                />

                {/* Default Route */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />

                {/* 404 Route */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          </CompanyProvider>
        </InvoiceProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;

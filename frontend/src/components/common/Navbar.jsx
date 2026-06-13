/**
 * Navbar Component
 * 
 * Display navigation links based on user role
 * 
 * Requirements: 13.2, 13.3, 13.5, 13.6
 */

import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (role === 'seller_admin') return '/seller-dashboard';
    if (role === 'buyer_admin') return '/buyer-dashboard';
    if (role === 'super_admin') return '/admin';
    return '/';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to={getDashboardLink()}>
            <h1>📊 Invoice Sync</h1>
          </Link>
        </div>

        <div className="navbar-menu">
          <Link to={getDashboardLink()} className="nav-link">
            Dashboard
          </Link>

          <Link to="/company-profile" className="nav-link">
            Company Profile
          </Link>

          <Link to="/sync-logs" className="nav-link">
            Sync Logs
          </Link>

          {role === 'super_admin' && (
            <Link to="/admin" className="nav-link">
              Admin Panel
            </Link>
          )}

          <div className="navbar-user">
            <span className="user-email">{user?.email}</span>
            <span className="user-role">{role}</span>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

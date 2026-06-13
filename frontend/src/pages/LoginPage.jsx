/**
 * Login Page
 * 
 * Login and registration page
 * 
 * Requirements: 13.1
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import RegisterForm from '../components/auth/RegisterForm';
import './LoginPage.css';

const LoginPage = () => {
  const [showRegister, setShowRegister] = useState(false);
  const navigate = useNavigate();

  const handleLoginSuccess = () => {
    navigate('/dashboard');
  };

  const handleRegisterSuccess = () => {
    navigate('/dashboard');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="logo-section">
            <h1 className="app-title">📊 Tally Invoice Sync</h1>
            <p className="app-tagline">B2B Invoice Synchronization Platform</p>
          </div>
        </div>

        <div className="auth-form-container">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${!showRegister ? 'active' : ''}`}
              onClick={() => setShowRegister(false)}
            >
              Login
            </button>
            <button
              className={`auth-tab ${showRegister ? 'active' : ''}`}
              onClick={() => setShowRegister(true)}
            >
              Register
            </button>
          </div>

          <div className="auth-form-content">
            {showRegister ? (
              <RegisterForm onSuccess={handleRegisterSuccess} />
            ) : (
              <LoginForm onSuccess={handleLoginSuccess} />
            )}
          </div>

          {!showRegister && (
            <div className="auth-footer">
              <p>
                Don't have an account?{' '}
                <button
                  className="link-button"
                  onClick={() => setShowRegister(true)}
                >
                  Create one now
                </button>
              </p>
            </div>
          )}

          {showRegister && (
            <div className="auth-footer">
              <p>
                Already have an account?{' '}
                <button
                  className="link-button"
                  onClick={() => setShowRegister(false)}
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>

        <div className="login-features">
          <h3>Platform Features</h3>
          <div className="features-grid">
            <div className="feature-item">
              <span className="feature-icon">📥</span>
              <h4>Import Invoices</h4>
              <p>Seamlessly import invoices from Tally</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔗</span>
              <h4>Auto Matching</h4>
              <p>Automatic buyer matching by GSTIN</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📤</span>
              <h4>One-Click Push</h4>
              <p>Push invoices to buyer's Tally instantly</p>
            </div>
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <h4>Secure & Encrypted</h4>
              <p>End-to-end encryption for all data</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

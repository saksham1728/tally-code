/**
 * Login Form Component
 * 
 * Email and password input fields with validation
 * 
 * Requirements: 13.1
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';
import LoadingSpinner from '../common/LoadingSpinner';
import './AuthForm.css';

const LoginForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setApiError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log('🔐 Attempting login with:', formData.email);
      const result = await authService.login(formData.email, formData.password);
      console.log('📥 Login result:', result);

      if (result.success) {
        console.log('✅ Login successful, saving auth data...');
        // Save auth data and update context
        login(result.token, result.user);
        
        console.log('🔄 Auth data saved, waiting for localStorage write...');
        
        // Wait a tiny bit for localStorage to flush, then redirect
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const role = result.user.role;
        const redirectUrl = role === 'seller_admin' ? '/seller-dashboard' 
          : role === 'buyer_admin' ? '/buyer-dashboard'
          : role === 'super_admin' ? '/admin' 
          : '/';
        
        console.log('🚀 Redirecting to:', redirectUrl);
        window.location.href = redirectUrl;
      } else {
        console.error('❌ Login failed:', result.error);
        setApiError(result.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setApiError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <h2>Login to Invoice Sync</h2>
      <p className="auth-subtitle">Enter your credentials to access your account</p>

      {apiError && (
        <div className="form-error-banner">
          {apiError}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="you@company.com"
          className={errors.email ? 'input-error' : ''}
          disabled={loading}
        />
        {errors.email && <span className="error-message">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="••••••••"
          className={errors.password ? 'input-error' : ''}
          disabled={loading}
        />
        {errors.password && <span className="error-message">{errors.password}</span>}
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? <LoadingSpinner size="small" message="" /> : 'Login'}
      </button>
    </form>
  );
};

export default LoginForm;

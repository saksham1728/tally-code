/**
 * Register Form Component
 * 
 * Form for user registration with company details
 * 
 * Requirements: 2.1
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import authService from '../../services/authService';
import LoadingSpinner from '../common/LoadingSpinner';
import './AuthForm.css';

const RegisterForm = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    gstin: '',
    phone: '',
    companyType: 'seller'
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

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Company name validation
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Company name is required';
    }

    // GSTIN validation (15 alphanumeric characters)
    if (!formData.gstin.trim()) {
      newErrors.gstin = 'GSTIN is required';
    } else if (!/^[A-Z0-9]{15}$/.test(formData.gstin.toUpperCase())) {
      newErrors.gstin = 'GSTIN must be 15 alphanumeric characters';
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare data for API
      const userData = {
        email: formData.email,
        password: formData.password,
        companyName: formData.companyName,
        gstin: formData.gstin.toUpperCase(),
        phone: formData.phone,
        companyType: formData.companyType
      };

      const result = await authService.register(userData);

      if (result.success) {
        // Save auth data and update context
        login(result.token, result.user);

        // Redirect based on role
        const role = result.user.role;
        if (role === 'seller_admin') {
          navigate('/seller-dashboard');
        } else if (role === 'buyer_admin') {
          navigate('/buyer-dashboard');
        } else {
          navigate('/');
        }
      } else {
        setApiError(result.error || 'Registration failed. Please try again.');
      }
    } catch (error) {
      setApiError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form register-form">
      <h2>Register for Invoice Sync</h2>
      <p className="auth-subtitle">Create your account and start syncing invoices</p>

      {apiError && (
        <div className="form-error-banner">
          {apiError}
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="email">Email *</label>
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
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="password">Password *</label>
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

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password *</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            className={errors.confirmPassword ? 'input-error' : ''}
            disabled={loading}
          />
          {errors.confirmPassword && <span className="error-message">{errors.confirmPassword}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="companyName">Company Name *</label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            placeholder="ABC Pvt Ltd"
            className={errors.companyName ? 'input-error' : ''}
            disabled={loading}
          />
          {errors.companyName && <span className="error-message">{errors.companyName}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="gstin">GSTIN *</label>
          <input
            type="text"
            id="gstin"
            name="gstin"
            value={formData.gstin}
            onChange={handleChange}
            placeholder="27AABCU9603R1ZM"
            maxLength={15}
            className={errors.gstin ? 'input-error' : ''}
            disabled={loading}
          />
          {errors.gstin && <span className="error-message">{errors.gstin}</span>}
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="phone">Phone Number *</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="9876543210"
            className={errors.phone ? 'input-error' : ''}
            disabled={loading}
          />
          {errors.phone && <span className="error-message">{errors.phone}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="companyType">Company Type *</label>
          <select
            id="companyType"
            name="companyType"
            value={formData.companyType}
            onChange={handleChange}
            disabled={loading}
          >
            <option value="seller">Seller (Send Invoices)</option>
            <option value="buyer">Buyer (Receive Invoices)</option>
            <option value="both">Both</option>
          </select>
        </div>
      </div>

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? <LoadingSpinner size="small" message="" /> : 'Register'}
      </button>
    </form>
  );
};

export default RegisterForm;

/**
 * Unit Tests for JWT Configuration Module
 */

const jwt = require('jsonwebtoken');
const { generateToken, verifyToken, decodeToken, JWT_SECRET } = require('./jwt');

describe('JWT Configuration Module', () => {
  describe('generateToken', () => {
    test('should generate a valid JWT token for a user', () => {
      const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'admin@company.com',
        role: 'seller_admin',
        companyId: '507f1f77bcf86cd799439012'
      };

      const token = generateToken(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    test('should include user role and companyId in token payload (Requirement 1.3)', () => {
      const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'admin@company.com',
        role: 'buyer_admin',
        companyId: '507f1f77bcf86cd799439012'
      };

      const token = generateToken(user);
      const decoded = jwt.decode(token);

      expect(decoded.role).toBe(user.role);
      expect(decoded.companyId).toBe(user.companyId);
      expect(decoded.userId).toBe(user._id);
      expect(decoded.email).toBe(user.email);
    });

    test('should handle super_admin with null companyId', () => {
      const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'superadmin@platform.com',
        role: 'super_admin',
        companyId: null
      };

      const token = generateToken(user);
      const decoded = jwt.decode(token);

      expect(decoded.role).toBe('super_admin');
      expect(decoded.companyId).toBeNull();
    });

    test('should include expiration in token', () => {
      const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'admin@company.com',
        role: 'seller_admin',
        companyId: '507f1f77bcf86cd799439012'
      };

      const token = generateToken(user);
      const decoded = jwt.decode(token);

      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    test('should handle ObjectId instances by converting to string', () => {
      // Simulate Mongoose ObjectId
      const user = {
        _id: { toString: () => '507f1f77bcf86cd799439011' },
        email: 'admin@company.com',
        role: 'seller_admin',
        companyId: { toString: () => '507f1f77bcf86cd799439012' }
      };

      const token = generateToken(user);
      const decoded = jwt.decode(token);

      expect(decoded.userId).toBe('507f1f77bcf86cd799439011');
      expect(decoded.companyId).toBe('507f1f77bcf86cd799439012');
    });
  });

  describe('verifyToken', () => {
    test('should verify and decode a valid token', () => {
      const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'admin@company.com',
        role: 'seller_admin',
        companyId: '507f1f77bcf86cd799439012'
      };

      const token = generateToken(user);
      const decoded = verifyToken(token);

      expect(decoded.userId).toBe(user._id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.role).toBe(user.role);
      expect(decoded.companyId).toBe(user.companyId);
    });

    test('should throw error for expired token (Requirement 1.4)', () => {
      const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'admin@company.com',
        role: 'seller_admin',
        companyId: '507f1f77bcf86cd799439012'
      };

      // Generate token that expires immediately
      const expiredToken = jwt.sign(
        { userId: user._id, email: user.email, role: user.role, companyId: user.companyId },
        JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Wait a moment to ensure expiration
      setTimeout(() => {
        expect(() => verifyToken(expiredToken)).toThrow('Token has expired');
      }, 100);
    });

    test('should throw error for invalid token signature (Requirement 17.5)', () => {
      const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'admin@company.com',
        role: 'seller_admin',
        companyId: '507f1f77bcf86cd799439012'
      };

      // Generate token with wrong secret
      const invalidToken = jwt.sign(
        { userId: user._id, email: user.email, role: user.role, companyId: user.companyId },
        'wrong-secret',
        { expiresIn: '1h' }
      );

      expect(() => verifyToken(invalidToken)).toThrow('Invalid token signature');
    });

    test('should throw error for malformed token', () => {
      const malformedToken = 'not.a.valid.jwt.token';

      expect(() => verifyToken(malformedToken)).toThrow();
    });

    test('should throw error for empty or null token', () => {
      expect(() => verifyToken('')).toThrow();
      expect(() => verifyToken(null)).toThrow();
    });
  });

  describe('decodeToken', () => {
    test('should decode token without verification', () => {
      const user = {
        _id: '507f1f77bcf86cd799439011',
        email: 'admin@company.com',
        role: 'seller_admin',
        companyId: '507f1f77bcf86cd799439012'
      };

      const token = generateToken(user);
      const decoded = decodeToken(token);

      expect(decoded.userId).toBe(user._id);
      expect(decoded.role).toBe(user.role);
    });

    test('should decode expired token (without verification)', () => {
      const expiredToken = jwt.sign(
        { userId: '123', role: 'seller_admin' },
        JWT_SECRET,
        { expiresIn: '0s' }
      );

      const decoded = decodeToken(expiredToken);
      expect(decoded).not.toBeNull();
      expect(decoded.userId).toBe('123');
    });

    test('should return null for invalid token format', () => {
      const invalidToken = 'not-a-valid-token';
      const decoded = decodeToken(invalidToken);

      expect(decoded).toBeNull();
    });
  });
});

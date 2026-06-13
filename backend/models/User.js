/**
 * User Model
 * 
 * Represents a user in the system with authentication credentials and role.
 * Each user belongs to a company (except super_admin).
 * 
 * Requirements: 19.1, 17.6
 */

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required']
  },
  role: {
    type: String,
    enum: {
      values: ['seller_admin', 'buyer_admin', 'super_admin'],
      message: '{VALUE} is not a valid role'
    },
    required: [true, 'Role is required']
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: function() {
      // Company ID is required for all roles except super_admin
      return this.role !== 'super_admin';
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // Automatically manage createdAt and updatedAt
});

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ companyId: 1 });

/**
 * Pre-save hook to hash password before saving to database
 * Implements bcrypt with minimum 10 rounds (Requirement 17.6)
 */
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    // Hash password with 10 rounds (minimum requirement)
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Instance method to compare password with stored hash
 * 
 * @param {string} candidatePassword - Plain text password to verify
 * @returns {Promise<boolean>} True if password matches, false otherwise
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

/**
 * Instance method to convert user to JSON, excluding sensitive fields
 */
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.passwordHash; // Never expose password hash
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

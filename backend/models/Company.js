/**
 * Company Model
 * 
 * Represents a company (seller, buyer, or both) in the B2B invoice sync platform.
 * 
 * Requirements: 2.1, 2.2, 19.2
 */

const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  gstin: {
    type: String,
    required: [true, 'GSTIN is required'],
    unique: true,
    uppercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        // GSTIN must be exactly 15 alphanumeric characters (Requirement 2.2)
        return /^[A-Z0-9]{15}$/.test(v);
      },
      message: 'GSTIN must be exactly 15 alphanumeric characters'
    }
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
  },
  phone: {
    type: String,
    trim: true
  },
  companyType: {
    type: String,
    enum: {
      values: ['seller', 'buyer', 'both'],
      message: '{VALUE} is not a valid company type'
    },
    required: [true, 'Company type is required']
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
  timestamps: true
});

// Indexes (Requirement 19.2)
companySchema.index({ gstin: 1 }, { unique: true });
companySchema.index({ name: 'text' }); // Text index for searching by company name

/**
 * Pre-save hook to ensure GSTIN is always uppercase
 */
companySchema.pre('save', function(next) {
  if (this.gstin) {
    this.gstin = this.gstin.toUpperCase();
  }
  next();
});

/**
 * Static method to find company by GSTIN (case-insensitive)
 * 
 * @param {string} gstin - GSTIN to search for
 * @returns {Promise<Company|null>} Company if found, null otherwise
 */
companySchema.statics.findByGSTIN = function(gstin) {
  return this.findOne({ gstin: gstin.toUpperCase() });
};

/**
 * Static method to find company by name (case-insensitive)
 * 
 * @param {string} name - Company name to search for
 * @returns {Promise<Company|null>} Company if found, null otherwise
 */
companySchema.statics.findByName = function(name) {
  return this.findOne({ name: new RegExp(`^${name}$`, 'i') });
};

const Company = mongoose.model('Company', companySchema);

module.exports = Company;

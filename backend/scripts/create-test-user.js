/**
 * Create Test User Script
 * 
 * Creates a test user: saksham / saksham28
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Company = require('../models/Company');
const TallyConnection = require('../models/TallyConnection');

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if user already exists
    const existingUser = await User.findOne({ email: 'saksham@test.com' });
    if (existingUser) {
      console.log('❌ User already exists!');
      console.log('Email: saksham@test.com');
      console.log('Password: saksham28');
      await mongoose.disconnect();
      return;
    }

    // Create Company
    const company = new Company({
      name: 'Saksham Industries Pvt Ltd',
      gstin: '27AABCS9603R1Z5',
      email: 'contact@saksham.com',
      phone: '9876543210',
      companyType: 'seller'
    });
    await company.save();
    console.log('✅ Company created:', company.name);

    // Hash password
    const passwordHash = await bcrypt.hash('saksham28', 10);

    // Create User
    const user = new User({
      email: 'saksham@test.com',
      passwordHash: passwordHash,
      role: 'seller_admin',
      companyId: company._id
    });
    await user.save();
    console.log('✅ User created');

    // Create Tally Connection (empty for now)
    const tallyConnection = new TallyConnection({
      companyId: company._id,
      apiEndpoint: 'http://localhost:9000',
      encryptedCredentials: '', // Empty for now, will be set later from UI
      connectionStatus: 'disconnected'
    });
    await tallyConnection.save();
    console.log('✅ Tally connection entry created');

    console.log('\n' + '='.repeat(60));
    console.log('🎉 TEST USER CREATED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\n📧 Email: saksham@test.com');
    console.log('🔑 Password: saksham28');
    console.log('🏢 Company: Saksham Industries Pvt Ltd');
    console.log('📋 GSTIN: 27AABCS9603R1Z5');
    console.log('👤 Role: seller_admin');
    console.log('\n' + '='.repeat(60));
    console.log('\n✨ Now login with these credentials at http://localhost:5173');
    console.log('='.repeat(60) + '\n');

    await mongoose.disconnect();
    console.log('✅ Database disconnected');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

createTestUser();

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Models
const User = require('../models/User');
const Company = require('../models/Company');

async function createTestUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if user exists
    const existingUser = await User.findOne({ email: 'saksham@test.com' });
    if (existingUser) {
      console.log('✅ User already exists!');
      console.log('Email: saksham@test.com');
      console.log('Password: saksham28');
      process.exit(0);
    }

    // Create company
    const company = await Company.create({
      name: 'Test Company',
      gstin: '27AABCS9603R1Z5',
      type: 'seller'
    });

    console.log('✅ Company created:', company.name);

    // Hash password
    const hashedPassword = await bcrypt.hash('saksham28', 10);

    // Create user
    const user = await User.create({
      email: 'saksham@test.com',
      password: hashedPassword,
      name: 'Saksham',
      role: 'seller_admin',
      company: company._id
    });

    console.log('✅ User created successfully!');
    console.log('Email:', user.email);
    console.log('Password: saksham28');
    console.log('Role:', user.role);
    console.log('Company:', company.name);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestUser();

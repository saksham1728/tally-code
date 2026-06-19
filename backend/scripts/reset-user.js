const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('../models/User');
const Company = require('../models/Company');

async function resetUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Delete existing user
    await User.deleteOne({ email: 'saksham@test.com' });
    console.log('🗑️ Deleted old user');

    // Find or create company
    let company = await Company.findOne({ gstin: '27AABCS9603R1Z5' });
    if (!company) {
      company = await Company.create({
        name: 'Saksham Industries Pvt Ltd',
        gstin: '27AABCS9603R1Z5',
        type: 'seller'
      });
      console.log('✅ Company created');
    }

    // Set PLAIN TEXT password - pre-save hook will hash it
    const user = new User({
      email: 'saksham@test.com',
      passwordHash: 'saksham28', // Plain text! Hook will hash it
      role: 'seller_admin',
      companyId: company._id
    });
    
    console.log('💾 Saving user (pre-save hook will hash password)...');
    await user.save();

    console.log('\n✅ USER CREATED SUCCESSFULLY!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', user.email);
    console.log('Password: saksham28');
    console.log('Role:', user.role);
    console.log('Company:', company.name);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetUser();

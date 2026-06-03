const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');

async function seedTestAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const adminEmail = 'admin_e2e@test.com';
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      adminUser = new User({
        name: 'Test ADMIN E2E',
        email: adminEmail,
        password: 'Password123',
        role: 'admin',
        isVerified: true,
        isActive: true
      });
      await adminUser.save();
      console.log('Test Admin account seeded successfully: admin_e2e@test.com / Password123');
    } else {
      console.log('Test Admin account already exists');
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding test admin:', error);
    process.exit(1);
  }
}

seedTestAdmin();

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');

async function findOrCreateUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const roles = ['candidate', 'employer', 'admin'];
    const accounts = {};

    for (const role of roles) {
      let user = await User.findOne({ role });
      
      if (!user) {
        console.log(`Creating ${role} user...`);
        const password = 'Password123';
        user = new User({
          name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
          email: `test_${role}@example.com`,
          password,
          role,
          isVerified: true
        });
        await user.save();
        accounts[role] = {
          email: user.email,
          password: password,
          role: role
        };
      } else {
        console.log(`Found existing ${role} user: ${user.email}`);
        accounts[role] = {
          email: user.email,
          password: ' (Use original password or Password123 if created by me previously)',
          role: role
        };
      }
    }

    console.log('\n--- Accounts Information ---');
    console.table(accounts);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

findOrCreateUsers();

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');

async function createNewUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const roles = ['candidate', 'employer', 'admin'];
    const accounts = [];
    const timestamp = Date.now().toString().slice(-4);

    for (const role of roles) {
      const email = `${role}_${timestamp}@test.com`;
      const password = 'Password123';
      
      const user = new User({
        name: `Test ${role.toUpperCase()}`,
        email: email,
        password: password,
        role: role,
        isVerified: true
      });
      
      await user.save();
      accounts.push({
        Role: role.toUpperCase(),
        Email: email,
        Password: password
      });
    }

    console.log('\n--- NEW TEST ACCOUNTS CREATED ---');
    console.table(accounts);
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

createNewUsers();

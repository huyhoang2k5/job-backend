const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');

async function getUserId() {
  const email = process.argv[2];
  if (!email) {
    console.error('Email argument is required');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const user = await User.findOne({ email });
    if (!user) {
      process.exit(1);
    }
    console.log(user._id.toString());
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

getUserId();

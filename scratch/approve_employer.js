const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const EmployerProfile = require('../src/models/EmployerProfile');

async function approveEmployer() {
  const email = process.argv[2];
  if (!email) {
    console.error('Email argument is required');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const user = await User.findOne({ email });
    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    let profile = await EmployerProfile.findOne({ userId: user._id });
    if (!profile) {
      console.error(`Employer profile not found for user ${email}`);
      process.exit(1);
    }

    profile.isApproved = true;
    profile.approvalDate = new Date();
    await profile.save();
    console.log(`Employer profile approved successfully for ${email}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

approveEmployer();

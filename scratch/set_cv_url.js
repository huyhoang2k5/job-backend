const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const CandidateProfile = require('../src/models/CandidateProfile');

async function setCvUrl() {
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

    let profile = await CandidateProfile.findOne({ userId: user._id });
    if (!profile) {
      profile = new CandidateProfile({ userId: user._id });
    }

    profile.cvUrl = 'https://res.cloudinary.com/demo/image/upload/sample.pdf';
    profile.skills = ['Node.js', 'React', 'TypeScript'];
    await profile.save();
    console.log(`CV URL and skills set successfully for ${email}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setCvUrl();

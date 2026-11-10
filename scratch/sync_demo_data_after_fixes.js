const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const CandidateProfile = require('../src/models/CandidateProfile');
const Application = require('../src/models/Application');

const CV_BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';

const seedCandidates = {
  'dangquochuy@gmail.com': {
    cvUrl: `${CV_BASE_URL}/uploads/cvs/dangquochuy.html`,
    phone: '0901234567'
  },
  'doannguyenbao@gmail.com': {
    cvUrl: `${CV_BASE_URL}/uploads/cvs/doannguyenbao.html`,
    phone: '0912345678'
  },
  'lenguyenhuyhoang@gmail.com': {
    cvUrl: `${CV_BASE_URL}/uploads/cvs/lenguyenhuyhoang.html`,
    phone: '0923456789'
  }
};

async function syncDemoData() {
  await mongoose.connect(process.env.MONGODB_URI);

  const summary = [];

  for (const [email, data] of Object.entries(seedCandidates)) {
    const user = await User.findOne({ email });
    if (!user) {
      summary.push(`${email}: user not found`);
      continue;
    }

    const profile = await CandidateProfile.findOne({ userId: user._id });
    if (!profile) {
      summary.push(`${email}: profile not found`);
      continue;
    }

    profile.cvUrl = data.cvUrl;
    profile.cvParsed = {
      name: user.name,
      email: user.email,
      phone: data.phone,
      skills: profile.skills || [],
      experience: profile.experience || [],
      education: profile.education || [],
      location: profile.location,
      summary: profile.bio
    };
    await profile.save();

    const appUpdate = await Application.updateMany(
      { candidateId: profile._id },
      { $set: { cvUrl: data.cvUrl } }
    );

    summary.push(`${email}: cv synced, applications updated ${appUpdate.modifiedCount}`);
  }

  await mongoose.disconnect();

  console.log('--- DEMO DATA SYNCED AFTER FIXES ---');
  for (const line of summary) console.log(line);
}

syncDemoData().catch(async (error) => {
  console.error('Failed to sync demo data:', error);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});

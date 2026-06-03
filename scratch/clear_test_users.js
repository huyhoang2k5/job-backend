const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const CandidateProfile = require('../src/models/CandidateProfile');
const EmployerProfile = require('../src/models/EmployerProfile');
const JobPost = require('../src/models/JobPost');
const Application = require('../src/models/Application');
const Message = require('../src/models/Message');
const Notification = require('../src/models/Notification');

async function cleanAndSeed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB for cleaning...');

    const testEmails = [
      'candidate_1655@test.com',
      'employer_1655@test.com',
      'admin_1655@test.com'
    ];

    // Find user IDs first
    const users = await User.find({ email: { $in: testEmails } });
    const userIds = users.map(u => u._id);
    console.log(`Found ${users.length} existing test users to clean up.`);

    // If users exist, clean up profiles, jobs, applications, etc.
    if (userIds.length > 0) {
      // Find employer profiles to get employerIds for job deletion
      const employerProfiles = await EmployerProfile.find({ userId: { $in: userIds } });
      const employerProfileIds = employerProfiles.map(p => p._id);

      // Clean application documents
      const deletedApps = await Application.deleteMany({
        $or: [
          { candidateId: { $in: userIds } },
          { jobId: { $in: employerProfileIds } }
        ]
      });
      console.log(`Deleted ${deletedApps.deletedCount} applications.`);

      // Clean job postings
      const deletedJobs = await JobPost.deleteMany({ employerId: { $in: employerProfileIds } });
      console.log(`Deleted ${deletedJobs.deletedCount} job postings.`);

      // Clean profiles
      const deletedCandidates = await CandidateProfile.deleteMany({ userId: { $in: userIds } });
      console.log(`Deleted ${deletedCandidates.deletedCount} candidate profiles.`);

      const deletedEmployers = await EmployerProfile.deleteMany({ userId: { $in: userIds } });
      console.log(`Deleted ${deletedEmployers.deletedCount} employer profiles.`);

      // Clean messages
      const deletedMessages = await Message.deleteMany({
        $or: [
          { sender: { $in: userIds } },
          { receiver: { $in: userIds } }
        ]
      });
      console.log(`Deleted ${deletedMessages.deletedCount} messages.`);

      // Clean notifications
      const deletedNotifs = await Notification.deleteMany({ userId: { $in: userIds } });
      console.log(`Deleted ${deletedNotifs.deletedCount} notifications.`);

      // Delete User documents
      const deletedUsers = await User.deleteMany({ _id: { $in: userIds } });
      console.log(`Deleted ${deletedUsers.deletedCount} user accounts.`);
    }

    // Seed the Admin account
    const adminUser = new User({
      name: 'Platform Admin',
      email: 'admin_1655@test.com',
      password: 'Password123',
      role: 'admin',
      isVerified: true,
      isActive: true
    });
    
    await adminUser.save();
    console.log('Seeded admin test account: admin_1655@test.com');

    await mongoose.disconnect();
    console.log('Database clean and seed completed.');
    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup/seed:', error);
    process.exit(1);
  }
}

cleanAndSeed();

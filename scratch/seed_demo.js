const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const JobPost = require('../src/models/JobPost');
const CandidateProfile = require('../src/models/CandidateProfile');
const EmployerProfile = require('../src/models/EmployerProfile');

async function seedDemoData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // 1. Create Employer
    const employerEmail = 'demo_employer@test.com';
    let employerUser = await User.findOne({ email: employerEmail });
    if (!employerUser) {
      employerUser = new User({
        name: 'TechCorp Recruiter',
        email: employerEmail,
        password: 'Password123',
        role: 'employer',
        isVerified: true
      });
      await employerUser.save();
    }

    let employerProfile = await EmployerProfile.findOne({ userId: employerUser._id });
    if (!employerProfile) {
      employerProfile = new EmployerProfile({
        userId: employerUser._id,
        companyName: 'TechCorp Solutions',
        description: 'A leading technology company specialized in AI and Web development.',
        website: 'https://techcorp.example.com',
        location: 'Ho Chi Minh City',
        industry: 'Technology',
        companySize: '51-200',
        isApproved: true
      });
      await employerProfile.save();
    }

    // 2. Clear and Create Job Postings
    await JobPost.deleteMany({ employerId: employerProfile._id });
    console.log('Cleared existing demo jobs');

    const jobs = [
      {
        title: 'Senior Software Engineer (Node.js)',
        description: 'We are looking for a Senior Node.js developer to lead our backend team.',
        requirements: ['5+ years of Node.js experience', 'Strong SQL skills', 'Architecture design'],
        skills: ['nodejs', 'express', 'postgresql', 'docker', 'api'],
        location: 'Vietnam',
        salary: { min: 2000, max: 4000, currency: 'USD' },
        type: 'full-time',
        experienceLevel: 'senior',
        status: 'approved'
      },
      {
        title: 'AI Engineer (Python)',
        description: 'Join our AI team to build innovative matching algorithms.',
        requirements: ['Python expertise', 'Experience with NLP', 'Machine Learning knowledge'],
        skills: ['python', 'pytorch', 'nlp', 'sql', 'rest'],
        location: 'Vietnam',
        salary: { min: 2500, max: 5000, currency: 'USD' },
        type: 'full-time',
        experienceLevel: 'mid-level',
        status: 'approved'
      },
      {
        title: 'Frontend Developer (React)',
        description: 'Design beautiful UIs for our job matching platform.',
        requirements: ['React expertise', 'CSS/HTML', 'UI/UX focus'],
        skills: ['react', 'javascript', 'html', 'css', 'figma'],
        location: 'Vietnam',
        salary: { min: 1500, max: 3000, currency: 'USD' },
        type: 'full-time',
        experienceLevel: 'junior',
        status: 'approved'
      }
    ];

    for (const jobData of jobs) {
      const existingJob = await JobPost.findOne({ title: jobData.title, employerId: employerProfile._id });
      if (!existingJob) {
        const job = new JobPost({
          ...jobData,
          employerId: employerProfile._id,
          deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        });
        await job.save();
        console.log(`Created job: ${job.title}`);
      }
    }

    console.log('\n--- DEMO DATA SEEDED SUCCESSFULLY ---');
    console.log('Employer Email:', employerEmail);
    console.log('Password: Password123');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

seedDemoData();

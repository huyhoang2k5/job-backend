const EmployerProfile = require('../models/EmployerProfile');
const JobPost = require('../models/JobPost');
const Application = require('../models/Application');
const CandidateProfile = require('../models/CandidateProfile');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize, requireVerification } = require('../middleware/auth');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');

// Validation rules
const profileValidation = [
  body('companyName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),
  body('industry')
    .isIn([
      'Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing',
      'Retail', 'Consulting', 'Media', 'Real Estate', 'Transportation',
      'Energy', 'Agriculture', 'Government', 'Non-profit', 'Other'
    ])
    .withMessage('Please select a valid industry'),
  body('companySize')
    .isIn(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'])
    .withMessage('Please select a valid company size'),
  body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL')
];

const jobValidation = [
  body('title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Job title must be between 5 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 50, max: 5000 })
    .withMessage('Description must be between 50 and 5000 characters'),
  body('requirements')
    .optional()
    .isArray()
    .withMessage('Requirements must be an array'),
  body('skills')
    .isArray({ min: 1 })
    .withMessage('At least one skill is required'),
  body('location')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),
  body('type')
    .isIn(['full-time', 'part-time', 'contract', 'internship', 'remote'])
    .withMessage('Please select a valid job type'),
  body('experienceLevel')
    .isIn(['entry-level', 'junior', 'mid-level', 'senior', 'lead', 'manager'])
    .withMessage('Please select a valid experience level'),
  body('deadline')
    .isISO8601()
    .withMessage('Please provide a valid deadline date')
];

// Get employer profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    let profile = await EmployerProfile.findOne({ userId })
      .populate('userId', 'name email avatar');
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }
    
    res.json({
      success: true,
      data: { profile }
    });
  } catch (error) {
    logger.error('Get employer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

// Create or update employer profile
const updateProfile = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const updates = req.body;
    
    let profile = await EmployerProfile.findOne({ userId });
    
    if (!profile) {
      // Create new profile
      profile = new EmployerProfile({ userId, ...updates });
    } else {
      // Update existing profile
      Object.assign(profile, updates);
      
      // Reset approval status if profile is being updated
      if (profile.isApproved) {
        profile.isApproved = false;
        profile.approvalDate = null;
      }
    }
    
    await profile.save();
    
    // Populate user info
    profile = await EmployerProfile.findOne({ userId })
      .populate('userId', 'name email avatar');
    
    res.json({
      success: true,
      message: profile.isApproved ? 
        'Profile updated successfully' : 
        'Profile submitted for approval',
      data: { profile }
    });
  } catch (error) {
    logger.error('Update employer profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Create job posting
const createJob = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const userId = req.user._id;
    const employerProfile = await EmployerProfile.findOne({ userId });
    
    if (!employerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }
    
    if (!employerProfile.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Employer profile must be approved to post jobs'
      });
    }
    
    if (!employerProfile.canPostJob()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot post job. Check your subscription plan.'
      });
    }
    
    const jobData = {
      ...req.body,
      employerId: employerProfile._id,
      deadline: new Date(req.body.deadline)
    };
    
    const job = new JobPost(jobData);
    await job.save();
    
    // Add job to employer's job postings
    employerProfile.jobPostings.push(job._id);
    await employerProfile.save();
    
    // Populate employer info
    await job.populate('employerId', 'companyName logo location');
    
    res.status(201).json({
      success: true,
      message: 'Job posted successfully. It will be reviewed shortly.',
      data: { job }
    });
  } catch (error) {
    logger.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create job',
      error: error.message
    });
  }
};

// Update job posting
const updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const employerProfile = await EmployerProfile.findOne({ userId });
    
    if (!employerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }
    
    const job = await JobPost.findOne({
      _id: id,
      employerId: employerProfile._id
    });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }
    
    // Update job
    Object.assign(job, req.body);
    if (req.body.deadline) {
      job.deadline = new Date(req.body.deadline);
    }
    
    // Reset approval status if job is being updated
    if (job.status === 'approved') {
      job.status = 'pending';
      job.approvedDate = null;
    }
    
    await job.save();
    
    res.json({
      success: true,
      message: 'Job updated successfully',
      data: { job }
    });
  } catch (error) {
    logger.error('Update job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job',
      error: error.message
    });
  }
};

// Delete job posting
const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const employerProfile = await EmployerProfile.findOne({ userId });
    
    if (!employerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }
    
    const job = await JobPost.findOne({
      _id: id,
      employerId: employerProfile._id
    });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    await JobPost.findByIdAndDelete(id);
    
    // Remove job from employer's job postings
    employerProfile.jobPostings = employerProfile.jobPostings.filter(
      jobId => jobId.toString() !== id
    );
    await employerProfile.save();
    
    res.json({
      success: true,
      message: 'Job deleted successfully'
    });
  } catch (error) {
    logger.error('Delete job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete job',
      error: error.message
    });
  }
};

// Get my jobs
const getMyJobs = async (req, res) => {
  try {
    const userId = req.user._id;
    const employerProfile = await EmployerProfile.findOne({ userId });
    
    if (!employerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }
    
    const { page = 1, limit = 10, status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    let query = { employerId: employerProfile._id };
    
    if (status) {
      query.status = status;
    }
    
    const jobs = await JobPost.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await JobPost.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        jobs,
        pagination: {
          current: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Get my jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get jobs',
      error: error.message
    });
  }
};

// Get applications for job
const getJobApplications = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const employerProfile = await EmployerProfile.findOne({ userId });
    
    if (!employerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }
    
    // Verify job belongs to employer
    const job = await JobPost.findOne({
      _id: id,
      employerId: employerProfile._id
    });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const applications = await Application.findByJob(id)
      .skip(skip)
      .limit(limitNum);
    
    const total = await Application.countDocuments({ jobId: id });
    
    res.json({
      success: true,
      data: {
        applications,
        job,
        pagination: {
          current: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Get job applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get applications',
      error: error.message
    });
  }
};

// Update application status
const updateApplicationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const userId = req.user._id;
    const employerProfile = await EmployerProfile.findOne({ userId });
    
    if (!employerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }
    
    const application = await Application.findById(id)
      .populate('jobId')
      .populate('candidateId');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Verify job belongs to employer
    if (application.jobId.employerId.toString() !== employerProfile._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Update application status
    await application.updateStatus(status, reason);
    
    // Send notification to candidate (this would be implemented with notification service)
    
    res.json({
      success: true,
      message: 'Application status updated successfully',
      data: { application }
    });
  } catch (error) {
    logger.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application status',
      error: error.message
    });
  }
};

// Search candidates
const searchCandidates = async (req, res) => {
  try {
    const {
      skills,
      location,
      experience,
      page = 1,
      limit = 10
    } = req.query;
    
    const userId = req.user._id;
    const employerProfile = await EmployerProfile.findOne({ userId });
    
    if (!employerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }
    
    if (!employerProfile.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Employer profile must be approved to search candidates'
      });
    }
    
    const searchQuery = {};
    
    if (skills) {
      searchQuery.skills = Array.isArray(skills) ? skills : [skills];
    }
    
    if (location) {
      searchQuery.location = new RegExp(location, 'i');
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const candidates = await CandidateProfile.searchCandidates(searchQuery)
      .populate('userId', 'name email avatar')
      .skip(skip)
      .limit(limitNum);
    
    const total = await CandidateProfile.countDocuments({
      isPublic: true,
      isAvailable: true,
      ...searchQuery
    });
    
    res.json({
      success: true,
      data: {
        candidates,
        pagination: {
          current: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Search candidates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search candidates',
      error: error.message
    });
  }
};

// Get dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const userId = req.user._id;
    const employerProfile = await EmployerProfile.findOne({ userId });
    
    if (!employerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }
    
    // Get job statistics
    const jobStats = await JobPost.aggregate([
      { $match: { employerId: employerProfile._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get application statistics
    const applicationStats = await Application.aggregate([
      {
        $lookup: {
          from: 'jobposts',
          localField: 'jobId',
          foreignField: '_id',
          as: 'job'
        }
      },
      { $unwind: '$job' },
      { $match: { 'job.employerId': employerProfile._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Get recent applications
    const recentApplications = (await Application.findByEmployer(employerProfile._id))
      .slice(0, 5);
    
    // Get active jobs
    const activeJobs = await JobPost.find({
      employerId: employerProfile._id,
      status: 'approved',
      isActive: true,
      deadline: { $gt: new Date() }
    }).countDocuments();
    
    // Format stats
    const stats = {
      jobs: {
        total: jobStats.reduce((sum, stat) => sum + stat.count, 0),
        active: activeJobs,
        pending: jobStats.find(s => s._id === 'pending')?.count || 0,
        approved: jobStats.find(s => s._id === 'approved')?.count || 0,
        rejected: jobStats.find(s => s._id === 'rejected')?.count || 0
      },
      applications: {
        total: applicationStats.reduce((sum, stat) => sum + stat.count, 0),
        pending: applicationStats.find(s => s._id === 'pending')?.count || 0,
        reviewing: applicationStats.find(s => s._id === 'reviewing')?.count || 0,
        accepted: applicationStats.find(s => s._id === 'accepted')?.count || 0,
        rejected: applicationStats.find(s => s._id === 'rejected')?.count || 0
      },
      recentApplications
    };
    
    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats',
      error: error.message
    });
  }
};

// Get all applications for employer's jobs
const getEmployerApplications = async (req, res) => {
  try {
    const userId = req.user._id;
    const employerProfile = await EmployerProfile.findOne({ userId });
    
    if (!employerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }
    
    const applications = await Application.findByEmployer(employerProfile._id);
    
    res.json({
      success: true,
      data: { applications }
    });
  } catch (error) {
    logger.error('Get employer applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get applications',
      error: error.message
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  createJob,
  updateJob,
  deleteJob,
  getMyJobs,
  getJobApplications,
  getEmployerApplications,
  updateApplicationStatus,
  searchCandidates,
  getDashboardStats,
  profileValidation,
  jobValidation
};

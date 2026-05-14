const CandidateProfile = require('../models/CandidateProfile');
const Application = require('../models/Application');
const JobPost = require('../models/JobPost');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize, requireVerification } = require('../middleware/auth');
const logger = require('../utils/logger');
const axios = require('axios');

// Validation rules
const profileValidation = [
  body('skills')
    .optional()
    .isArray()
    .withMessage('Skills must be an array'),
  body('skills.*')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each skill must be between 1 and 50 characters'),
  body('experience')
    .optional()
    .isArray()
    .withMessage('Experience must be an array'),
  body('education')
    .optional()
    .isArray()
    .withMessage('Education must be an array'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location cannot exceed 100 characters'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
];

const applicationValidation = [
  body('jobId')
    .notEmpty()
    .withMessage('Job ID is required'),
  body('coverLetter')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Cover letter cannot exceed 2000 characters')
];

// Get candidate profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    let profile = await CandidateProfile.findOne({ userId })
      .populate('userId', 'name email avatar');
    
    if (!profile) {
      // Create empty profile if it doesn't exist
      profile = new CandidateProfile({ userId });
      await profile.save();
      
      // Populate user info
      profile = await CandidateProfile.findOne({ userId })
        .populate('userId', 'name email avatar');
    }
    
    res.json({
      success: true,
      data: { profile }
    });
  } catch (error) {
    logger.error('Get candidate profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};

// Update candidate profile
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
    
    let profile = await CandidateProfile.findOne({ userId });
    
    if (!profile) {
      // Create profile if it doesn't exist
      profile = new CandidateProfile({ userId, ...updates });
    } else {
      // Update existing profile
      Object.assign(profile, updates);
    }
    
    await profile.save();
    
    // Populate user info
    profile = await CandidateProfile.findOne({ userId })
      .populate('userId', 'name email avatar');
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { profile }
    });
  } catch (error) {
    logger.error('Update candidate profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Add skill to profile
const addSkill = async (req, res) => {
  try {
    const { skill } = req.body;
    
    if (!skill || skill.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Skill is required'
      });
    }
    
    const userId = req.user._id;
    const profile = await CandidateProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }
    
    profile.addSkill(skill.trim());
    await profile.save();
    
    res.json({
      success: true,
      message: 'Skill added successfully',
      data: { skills: profile.skills }
    });
  } catch (error) {
    logger.error('Add skill error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add skill',
      error: error.message
    });
  }
};

// Remove skill from profile
const removeSkill = async (req, res) => {
  try {
    const { skill } = req.params;
    
    const userId = req.user._id;
    const profile = await CandidateProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }
    
    profile.removeSkill(skill);
    await profile.save();
    
    res.json({
      success: true,
      message: 'Skill removed successfully',
      data: { skills: profile.skills }
    });
  } catch (error) {
    logger.error('Remove skill error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove skill',
      error: error.message
    });
  }
};

// Add experience to profile
const addExperience = async (req, res) => {
  try {
    const experience = req.body;
    
    const userId = req.user._id;
    const profile = await CandidateProfile.findOne({ userId });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }
    
    profile.addExperience(experience);
    await profile.save();
    
    res.json({
      success: true,
      message: 'Experience added successfully',
      data: { experience: profile.experience }
    });
  } catch (error) {
    logger.error('Add experience error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add experience',
      error: error.message
    });
  }
};

// Get jobs with filtering
const getJobs = async (req, res) => {
  try {
    const {
      keyword,
      skills,
      location,
      type,
      experienceLevel,
      salaryMin,
      salaryMax,
      isRemote,
      page = 1,
      limit = 10
    } = req.query;
    
    const query = {};
    
    if (keyword) {
      query.keyword = keyword;
    }
    
    if (skills) {
      query.skills = Array.isArray(skills) ? skills : [skills];
    }
    
    if (location) {
      query.location = location;
    }
    
    if (type) {
      query.type = type;
    }
    
    if (experienceLevel) {
      query.experienceLevel = experienceLevel;
    }
    
    if (salaryMin) {
      query.salaryMin = parseInt(salaryMin);
    }
    
    if (salaryMax) {
      query.salaryMax = parseInt(salaryMax);
    }
    
    if (isRemote !== undefined) {
      query.isRemote = isRemote === 'true';
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const jobs = await JobPost.searchJobs(query)
      .populate('employerId', 'companyName logo location')
      .skip(skip)
      .limit(limitNum);
    
    const total = await JobPost.countDocuments({
      status: 'approved',
      isActive: true,
      deadline: { $gt: new Date() }
    });
    
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
    logger.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get jobs',
      error: error.message
    });
  }
};

// Get job details
const getJobDetails = async (req, res) => {
  try {
    const { id } = req.params;
    
    const job = await JobPost.findOne({ 
      _id: id, 
      status: 'approved',
      isActive: true 
    })
      .populate('employerId', 'companyName logo website location description');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    // Increment view count
    await job.addView();
    
    res.json({
      success: true,
      data: { job }
    });
  } catch (error) {
    logger.error('Get job details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get job details',
      error: error.message
    });
  }
};

// Apply for job
const applyJob = async (req, res) => {
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
    const { jobId, coverLetter } = req.body;
    
    // Check if job exists and is active
    const job = await JobPost.findOne({
      _id: jobId,
      status: 'approved',
      isActive: true,
      deadline: { $gt: new Date() }
    });
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found or expired'
      });
    }
    
    // Get candidate profile
    const candidateProfile = await CandidateProfile.findOne({ userId });
    if (!candidateProfile) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }
    
    // Check if already applied
    const existingApplication = await Application.checkDuplicate(
      candidateProfile._id,
      jobId
    );
    
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job'
      });
    }
    
    // Check if CV is available
    if (!candidateProfile.cvUrl) {
      return res.status(400).json({
        success: false,
        message: 'Please upload your CV before applying'
      });
    }
    
    // Create application
    const application = new Application({
      candidateId: candidateProfile._id,
      jobId,
      userId,
      cvUrl: candidateProfile.cvUrl,
      coverLetter
    });
    
    await application.save();
    
    // Update job application count
    await job.addApplication(application._id);
    
    // Send notification to employer (this would be implemented with email service)
    // await emailService.sendApplicationNotification(employerEmail, candidateName, jobTitle);
    
    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: { application }
    });
  } catch (error) {
    logger.error('Apply job error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: error.message
    });
  }
};

// Get my applications
const getMyApplications = async (req, res) => {
  try {
    const userId = req.user._id;
    const candidateProfile = await CandidateProfile.findOne({ userId });
    
    if (!candidateProfile) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }
    
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const applications = await Application.findByCandidate(candidateProfile._id)
      .skip(skip)
      .limit(limitNum);
    
    const total = await Application.countDocuments({
      candidateId: candidateProfile._id
    });
    
    res.json({
      success: true,
      data: {
        applications,
        pagination: {
          current: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Get my applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get applications',
      error: error.message
    });
  }
};

// Get job recommendations
const getRecommendations = async (req, res) => {
  try {
    const userId = req.user._id;
    const candidateProfile = await CandidateProfile.findOne({ userId });
    
    if (!candidateProfile) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }
    
    // Get active jobs
    const activeJobs = await JobPost.findActive()
      .populate('employerId', 'companyName logo location')
      .limit(50);
    
    // Call AI service for recommendations
    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      const response = await axios.post(`${aiServiceUrl}/api/v1/recommend`, {
        cv_data: candidateProfile.cvParsed || {},
        jobs: activeJobs.map(job => ({
          id: job._id.toString(),
          title: job.title,
          description: job.description,
          requirements: job.requirements,
          skills: job.skills,
          location: job.location,
          salary: job.salary,
          type: job.type
        })),
        top_k: 20
      });
      
      if (response.data.success) {
        const recommendations = response.data.recommendations;
        
        // Get full job details for recommended jobs
        const recommendedJobs = [];
        for (const rec of recommendations) {
          const job = activeJobs.find(j => j._id.toString() === rec.job_id);
          if (job) {
            recommendedJobs.push({
              ...job.toObject(),
              matchScore: Math.round(rec.match_score * 100),
              matchReasons: rec.match_reasons
            });
          }
        }
        
        res.json({
          success: true,
          data: { 
            recommendations: recommendedJobs,
            total: recommendedJobs.length
          }
        });
      } else {
        // Fallback to basic recommendations
        const fallbackRecommendations = activeJobs
          .filter(job => {
            // Simple skill matching as fallback
            const candidateSkills = new Set(candidateProfile.skills || []);
            const jobSkills = new Set(job.skills || []);
            const intersection = new Set([...candidateSkills].filter(x => jobSkills.has(x)));
            return intersection.size > 0;
          })
          .slice(0, 10);
        
        res.json({
          success: true,
          data: { 
            recommendations: fallbackRecommendations,
            total: fallbackRecommendations.length
          }
        });
      }
    } catch (aiError) {
      logger.error('AI service error:', aiError);
      
      // Fallback to basic recommendations
      const fallbackRecommendations = activeJobs.slice(0, 10);
      
      res.json({
        success: true,
        data: { 
          recommendations: fallbackRecommendations,
          total: fallbackRecommendations.length
        }
      });
    }
  } catch (error) {
    logger.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get recommendations',
      error: error.message
    });
  }
};

// Withdraw application
const withdrawApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    const candidateProfile = await CandidateProfile.findOne({ userId });
    
    if (!candidateProfile) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }
    
    const application = await Application.findOne({
      _id: id,
      candidateId: candidateProfile._id
    });
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    if (application.status === 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot withdraw accepted application'
      });
    }
    
    await application.updateStatus('withdrawn', 'Withdrawn by candidate');
    
    res.json({
      success: true,
      message: 'Application withdrawn successfully'
    });
  } catch (error) {
    logger.error('Withdraw application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to withdraw application',
      error: error.message
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  addSkill,
  removeSkill,
  addExperience,
  getJobs,
  getJobDetails,
  applyJob,
  getMyApplications,
  getRecommendations,
  withdrawApplication,
  profileValidation,
  applicationValidation
};

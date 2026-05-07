const express = require('express');
const { optionalAuth } = require('../middleware/auth');
const JobPost = require('../models/JobPost');
const logger = require('../utils/logger');

const router = express.Router();

// Get all active jobs (public route)
router.get('/', optionalAuth, async (req, res) => {
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
});

// Get featured jobs
router.get('/featured', optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const jobs = await JobPost.findFeatured()
      .populate('employerId', 'companyName logo location')
      .skip(skip)
      .limit(limitNum);
    
    const total = await JobPost.countDocuments({
      status: 'approved',
      isActive: true,
      isFeatured: true,
      featuredExpiry: { $gt: new Date() },
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
    logger.error('Get featured jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get featured jobs',
      error: error.message
    });
  }
});

// Get job details by ID
router.get('/:id', optionalAuth, async (req, res) => {
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
});

// Get popular skills
router.get('/skills/popular', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const skills = await JobPost.getPopularSkills(parseInt(limit));
    
    res.json({
      success: true,
      data: { skills }
    });
  } catch (error) {
    logger.error('Get popular skills error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get popular skills',
      error: error.message
    });
  }
});

module.exports = router;

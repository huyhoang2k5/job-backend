const User = require('../models/User');
const EmployerProfile = require('../models/EmployerProfile');
const JobPost = require('../models/JobPost');
const Application = require('../models/Application');
const CandidateProfile = require('../models/CandidateProfile');
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

// Get dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    // User statistics
    const userStats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: {
            $sum: { $cond: ['$isActive', 1, 0] }
          },
          verified: {
            $sum: { $cond: ['$isVerified', 1, 0] }
          }
        }
      }
    ]);
    
    // Job statistics
    const jobStats = await JobPost.getStatistics();
    
    // Application statistics
    const applicationStats = await Application.getStatistics();
    
    // Recent registrations
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select('name email role createdAt');
    
    // Recent job postings
    const recentJobs = await JobPost.find()
      .populate('employerId', 'companyName')
      .sort({ createdAt: -1 })
      .limit(10)
      .select('title companyName createdAt status');
    
    // Popular skills
    const popularSkills = await JobPost.getPopularSkills(10);
    
    // Format statistics
    const stats = {
      users: {
        total: userStats.reduce((sum, stat) => sum + stat.count, 0),
        candidates: userStats.find(s => s._id === 'candidate')?.count || 0,
        employers: userStats.find(s => s._id === 'employer')?.count || 0,
        admins: userStats.find(s => s._id === 'admin')?.count || 0,
        active: userStats.reduce((sum, stat) => sum + stat.active, 0),
        verified: userStats.reduce((sum, stat) => sum + stat.verified, 0)
      },
      jobs: {
        total: jobStats.reduce((sum, stat) => sum + stat.count, 0),
        pending: jobStats.find(s => s._id === 'pending')?.count || 0,
        approved: jobStats.find(s => s._id === 'approved')?.count || 0,
        rejected: jobStats.find(s => s._id === 'rejected')?.count || 0,
        expired: jobStats.find(s => s._id === 'expired')?.count || 0
      },
      applications: {
        total: applicationStats.reduce((sum, stat) => sum + stat.count, 0),
        pending: applicationStats.find(s => s._id === 'pending')?.count || 0,
        viewed: applicationStats.find(s => s._id === 'viewed')?.count || 0,
        reviewing: applicationStats.find(s => s._id === 'reviewing')?.count || 0,
        accepted: applicationStats.find(s => s._id === 'accepted')?.count || 0,
        rejected: applicationStats.find(s => s._id === 'rejected')?.count || 0
      },
      recent: {
        users: recentUsers,
        jobs: recentJobs
      },
      popularSkills
    };
    
    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard statistics',
      error: error.message
    });
  }
};

// Get all users with filtering and pagination
const getUsers = async (req, res) => {
  try {
    const {
      role,
      status,
      verified,
      page = 1,
      limit = 10,
      search
    } = req.query;
    
    const query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }
    
    if (verified === 'true') {
      query.isVerified = true;
    } else if (verified === 'false') {
      query.isVerified = false;
    }
    
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const users = await User.find(query)
      .select('-password -verificationToken -passwordResetToken -passwordResetExpires -refreshTokens')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
      error: error.message
    });
  }
};

// Update user status (activate/deactivate)
const updateUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive, reason } = req.body;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify admin user status'
      });
    }
    
    user.isActive = isActive !== undefined ? isActive : !user.isActive;
    await user.save();
    
    // Log the action
    logger.info(`User ${user.email} status updated to ${user.isActive} by admin ${req.user.email}`);
    
    res.json({
      success: true,
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { user }
    });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message
    });
  }
};

// Get all employers with filtering and pagination
const getEmployers = async (req, res) => {
  try {
    const {
      status,
      industry,
      location,
      page = 1,
      limit = 10,
      search
    } = req.query;
    
    const query = {};
    
    if (status === 'approved') {
      query.isApproved = true;
    } else if (status === 'pending') {
      query.isApproved = false;
    }
    
    if (industry) {
      query.industry = industry;
    }
    
    if (location) {
      query.location = new RegExp(location, 'i');
    }
    
    if (search) {
      query.$or = [
        { companyName: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const employers = await EmployerProfile.find(query)
      .populate('userId', 'name email isActive createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await EmployerProfile.countDocuments(query);
    
    res.json({
      success: true,
      data: {
        employers,
        pagination: {
          current: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum)
        }
      }
    });
  } catch (error) {
    logger.error('Get employers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get employers',
      error: error.message
    });
  }
};

// Approve or reject employer
const updateEmployerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isApproved, rejectionReason } = req.body;
    
    const employer = await EmployerProfile.findById(id)
      .populate('userId', 'name email');
    
    if (!employer) {
      return res.status(404).json({
        success: false,
        message: 'Employer not found'
      });
    }
    
    employer.isApproved = isApproved;
    
    if (isApproved) {
      employer.approvalDate = new Date();
      employer.rejectionReason = null;
    } else {
      employer.rejectionReason = rejectionReason;
    }
    
    await employer.save();
    
    // Log the action
    logger.info(`Employer ${employer.companyName} ${isApproved ? 'approved' : 'rejected'} by admin ${req.user.email}`);
    
    res.json({
      success: true,
      message: `Employer ${isApproved ? 'approved' : 'rejected'} successfully`,
      data: { employer }
    });
  } catch (error) {
    logger.error('Update employer status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update employer status',
      error: error.message
    });
  }
};

// Get all jobs with filtering and pagination
const getJobs = async (req, res) => {
  try {
    const {
      status,
      employerId,
      page = 1,
      limit = 10,
      search
    } = req.query;
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (employerId) {
      query.employerId = employerId;
    }
    
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const jobs = await JobPost.find(query)
      .populate('employerId', 'companyName')
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
    logger.error('Get jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get jobs',
      error: error.message
    });
  }
};

// Update job status
const updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    const job = await JobPost.findById(id)
      .populate('employerId', 'companyName userId');
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }
    
    job.status = status;
    
    if (status === 'approved') {
      job.approvedDate = new Date();
      job.rejectionReason = null;
    } else if (status === 'rejected') {
      job.rejectionReason = rejectionReason;
    }
    
    await job.save();
    
    // Log the action
    logger.info(`Job "${job.title}" status updated to ${status} by admin ${req.user.email}`);
    
    res.json({
      success: true,
      message: `Job ${status} successfully`,
      data: { job }
    });
  } catch (error) {
    logger.error('Update job status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update job status',
      error: error.message
    });
  }
};

// Get all applications with filtering and pagination
const getApplications = async (req, res) => {
  try {
    const {
      status,
      jobId,
      candidateId,
      page = 1,
      limit = 10,
      search
    } = req.query;
    
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (jobId) {
      query.jobId = jobId;
    }
    
    if (candidateId) {
      query.candidateId = candidateId;
    }
    
    if (search) {
      query.$or = [
        { 'candidate.name': new RegExp(search, 'i') },
        { 'job.title': new RegExp(search, 'i') }
      ];
    }
    
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    
    const applications = await Application.find(query)
      .populate('candidateId', 'name email skills')
      .populate({
        path: 'jobId',
        select: 'title employerId',
        populate: {
          path: 'employerId',
          select: 'companyName'
        }
      })
      .populate('userId', 'name email')
      .sort({ appliedAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Application.countDocuments(query);
    
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
    logger.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get applications',
      error: error.message
    });
  }
};

// Get reports and analytics
const getReports = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    let report = {};
    
    switch (type) {
      case 'user-growth':
        report = await User.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
              }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              },
              count: { $sum: 1 },
              candidates: {
                $sum: {
                  $cond: [{ $eq: ['$role', 'candidate'] }, 1, 0]
                }
              },
              employers: {
                $sum: {
                  $cond: [{ $eq: ['$role', 'employer'] }, 1, 0]
                }
              }
            }
          },
          { $sort: { _id: 1 } }
        ]);
        break;
        
      case 'job-postings':
        report = await JobPost.aggregate([
          {
            $match: {
              createdAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
              }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: '$createdAt'
                }
              },
              count: { $sum: 1 },
              approved: {
                $sum: {
                  $cond: [{ $eq: ['$status', 'approved'] }, 1, 0]
                }
              }
            }
          },
          { $sort: { _id: 1 } }
        ]);
        break;
        
      case 'applications':
        report = await Application.getApplicationsByDate(
          new Date(startDate),
          new Date(endDate)
        );
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid report type'
        });
    }
    
    res.json({
      success: true,
      data: { report }
    });
  } catch (error) {
    logger.error('Get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get reports',
      error: error.message
    });
  }
};

// Delete user (admin only)
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    if (user.role === 'admin' && user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete other admin users'
      });
    }
    
    // Delete related data based on role
    if (user.role === 'candidate') {
      await CandidateProfile.deleteOne({ userId: id });
      await Application.deleteMany({ userId: id });
    } else if (user.role === 'employer') {
      await EmployerProfile.deleteOne({ userId: id });
      await JobPost.deleteMany({ employerId: (await EmployerProfile.findOne({ userId: id }))._id });
    }
    
    await User.findByIdAndDelete(id);
    
    // Log the action
    logger.info(`User ${user.email} deleted by admin ${req.user.email}`);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

module.exports = {
  getDashboardStats,
  getUsers,
  updateUserStatus,
  getEmployers,
  updateEmployerStatus,
  getJobs,
  updateJobStatus,
  getApplications,
  getReports,
  deleteUser
};

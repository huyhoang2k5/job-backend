const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const Application = require('../models/Application');
const logger = require('../utils/logger');

const router = express.Router();

// Get application by ID (for candidates and employers)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    let application;
    
    if (req.user.role === 'candidate') {
      // Candidates can only see their own applications
      const candidateProfile = await CandidateProfile.findOne({ userId });
      if (!candidateProfile) {
        return res.status(404).json({
          success: false,
          message: 'Candidate profile not found'
        });
      }
      
      application = await Application.findOne({
        _id: id,
        candidateId: candidateProfile._id
      })
        .populate({
          path: 'jobId',
          select: 'title location salary type employerId',
          populate: {
            path: 'employerId',
            select: 'companyName userId logo'
          }
        })
        .populate({
          path: 'job',
          select: 'title location salary type employerId',
          populate: {
            path: 'employerId',
            select: 'companyName userId logo'
          }
        })
        .populate('candidateId', 'name email skills experience');
    } else if (req.user.role === 'employer') {
      // Employers can only see applications for their jobs
      const employerProfile = await EmployerProfile.findOne({ userId });
      if (!employerProfile) {
        return res.status(404).json({
          success: false,
          message: 'Employer profile not found'
        });
      }
      
      application = await Application.findOne({
        _id: id
      })
        .populate({
          path: 'jobId',
          match: { employerId: employerProfile._id },
          select: 'title location salary type employerId',
          populate: {
            path: 'employerId',
            select: 'companyName userId logo'
          }
        })
        .populate({
          path: 'job',
          match: { employerId: employerProfile._id },
          select: 'title location salary type employerId',
          populate: {
            path: 'employerId',
            select: 'companyName userId logo'
          }
        })
        .populate('candidateId', 'name email skills experience');
      
      // Check if application belongs to employer's job
      if (!application || !application.jobId) {
        return res.status(404).json({
          success: false,
          message: 'Application not found'
        });
      }
    } else {
      // Admins can see any application
      application = await Application.findById(id)
        .populate({
          path: 'jobId',
          select: 'title location salary type employerId',
          populate: {
            path: 'employerId',
            select: 'companyName userId logo'
          }
        })
        .populate({
          path: 'job',
          select: 'title location salary type employerId',
          populate: {
            path: 'employerId',
            select: 'companyName userId logo'
          }
        })
        .populate('candidateId', 'name email skills experience')
        .populate('userId', 'name email');
    }
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    res.json({
      success: true,
      data: { application }
    });
  } catch (error) {
    logger.error('Get application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get application',
      error: error.message
    });
  }
});

// Add note to application (employer only)
router.post('/:id/notes', authenticate, authorize('employer'), async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }
    
    const employerProfile = await EmployerProfile.findOne({ userId });
    if (!employerProfile) {
      return res.status(404).json({
        success: false,
        message: 'Employer profile not found'
      });
    }
    
    const application = await Application.findById(id)
      .populate('jobId');
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Verify application belongs to employer's job
    if (application.jobId.employerId.toString() !== employerProfile._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await application.addNote(content.trim(), userId);
    
    res.json({
      success: true,
      message: 'Note added successfully'
    });
  } catch (error) {
    logger.error('Add application note error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add note',
      error: error.message
    });
  }
});

// Schedule interview (employer only)
router.post('/:id/interview', authenticate, authorize('employer'), async (req, res) => {
  try {
    const { id } = req.params;
    const interviewData = req.body;
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
    
    // Verify application belongs to employer's job
    if (application.jobId.employerId.toString() !== employerProfile._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await application.scheduleInterview(interviewData);
    
    // Send email notification to candidate (this would be implemented)
    // await emailService.sendInterviewInvitation(
    //   application.candidateId.userId.email,
    //   employerProfile.companyName,
    //   application.jobId.title,
    //   interviewData
    // );
    
    res.json({
      success: true,
      message: 'Interview scheduled successfully',
      data: { application }
    });
  } catch (error) {
    logger.error('Schedule interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule interview',
      error: error.message
    });
  }
});

// Accept interview (candidate only)
router.patch('/:id/interview/accept', authenticate, authorize('candidate'), async (req, res) => {
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
    
    if (!application.interviewSchedule) {
      return res.status(400).json({
        success: false,
        message: 'No interview scheduled for this application'
      });
    }
    
    application.interviewSchedule.status = 'completed';
    await application.save();
    
    res.json({
      success: true,
      message: 'Interview accepted successfully'
    });
  } catch (error) {
    logger.error('Accept interview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to accept interview',
      error: error.message
    });
  }
});

// Upload attachment to application
router.post('/:id/attachments', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { filename, url } = req.body;
    const userId = req.user._id;
    
    if (!filename || !url) {
      return res.status(400).json({
        success: false,
        message: 'Filename and URL are required'
      });
    }
    
    let application;
    
    if (req.user.role === 'candidate') {
      const candidateProfile = await CandidateProfile.findOne({ userId });
      if (!candidateProfile) {
        return res.status(404).json({
          success: false,
          message: 'Candidate profile not found'
        });
      }
      
      application = await Application.findOne({
        _id: id,
        candidateId: candidateProfile._id
      });
    } else if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({ userId });
      if (!employerProfile) {
        return res.status(404).json({
          success: false,
          message: 'Employer profile not found'
        });
      }
      
      application = await Application.findById(id)
        .populate('jobId');
      
      if (application && application.jobId.employerId.toString() !== employerProfile._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else {
      application = await Application.findById(id);
    }
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    await application.addAttachment(filename, url);
    
    res.json({
      success: true,
      message: 'Attachment uploaded successfully'
    });
  } catch (error) {
    logger.error('Upload attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload attachment',
      error: error.message
    });
  }
});

// Delete attachment from application
router.delete('/:id/attachments/:attachmentId', authenticate, async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const userId = req.user._id;
    
    let application;
    
    if (req.user.role === 'candidate') {
      const candidateProfile = await CandidateProfile.findOne({ userId });
      if (!candidateProfile) {
        return res.status(404).json({
          success: false,
          message: 'Candidate profile not found'
        });
      }
      
      application = await Application.findOne({
        _id: id,
        candidateId: candidateProfile._id
      });
    } else if (req.user.role === 'employer') {
      const employerProfile = await EmployerProfile.findOne({ userId });
      if (!employerProfile) {
        return res.status(404).json({
          success: false,
          message: 'Employer profile not found'
        });
      }
      
      application = await Application.findById(id)
        .populate('jobId');
      
      if (application && application.jobId.employerId.toString() !== employerProfile._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else {
      application = await Application.findById(id);
    }
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    await application.removeAttachment(attachmentId);
    
    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    logger.error('Delete attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete attachment',
      error: error.message
    });
  }
});

module.exports = router;

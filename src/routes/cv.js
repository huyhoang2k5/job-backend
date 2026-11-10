const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { authenticate, authorize, requireVerification } = require('../middleware/auth');
const CandidateProfile = require('../models/CandidateProfile');
const axios = require('axios');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer for file upload
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'docx', 'jpg', 'jpeg', 'png'];
    const fileExtension = file.originalname.split('.').pop().toLowerCase();

    if (allowedTypes.includes(fileExtension)) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${fileExtension} is not allowed`), false);
    }
  }
});

const getLocalCvUrl = (req, filename) => `${req.protocol}://${req.get('host')}/uploads/cvs/${filename}`;

const saveCvLocally = async (req, file, userId) => {
  const uploadDir = path.join(__dirname, '../../uploads/cvs');
  await fs.promises.mkdir(uploadDir, { recursive: true });

  const extension = path.extname(file.originalname).toLowerCase();
  const filename = `cv_${userId}_${Date.now()}${extension}`;
  const filePath = path.join(uploadDir, filename);

  await fs.promises.writeFile(filePath, file.buffer);
  return getLocalCvUrl(req, filename);
};

// Upload CV and extract data using AI service
router.post('/upload', authenticate, authorize('candidate'), upload.single('cv'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const userId = req.user._id;

    // Get or create candidate profile
    let candidateProfile = await CandidateProfile.findOne({ userId });
    if (!candidateProfile) {
      candidateProfile = new CandidateProfile({ userId });
    }

    // Store the original CV locally so it can always be opened and reprocessed in local development.
    let cvUrl;
    try {
      cvUrl = await saveCvLocally(req, req.file, userId);
    } catch (uploadError) {
      logger.error('Local CV save error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save CV file',
        error: uploadError.message
      });
    }

    // Extract CV data using AI service
    let cvParsedData = {};
    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

      // Create form data for AI service
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', req.file.buffer, {
        filename: req.file.originalname,
        contentType: req.file.mimetype
      });
      formData.append('include_raw_text', 'true');

      const aiResponse = await axios.post(`${aiServiceUrl}/api/v1/extract`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 seconds
      });

      if (aiResponse.data.success) {
        cvParsedData = aiResponse.data.cv_data || {};
        logger.info(`CV data extracted for user ${userId}`);
      } else {
        logger.warn(`AI service extraction failed: ${aiResponse.data.error}`);
      }
    } catch (aiError) {
      logger.error('AI service error:', aiError);
      // Don't fail the upload if AI service fails
    }

    // Update candidate profile
    candidateProfile.cvUrl = cvUrl;
    candidateProfile.updateCVData(cvParsedData);
    await candidateProfile.save();

    res.json({
      success: true,
      message: 'CV uploaded and processed successfully',
      data: {
        cvUrl,
        cvParsed: cvParsedData,
        profile: candidateProfile
      }
    });
  } catch (error) {
    logger.error('CV upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload CV',
      error: error.message
    });
  }
});

// Get parsed CV data
router.get('/me', authenticate, authorize('candidate'), async (req, res) => {
  try {
    const userId = req.user._id;

    const candidateProfile = await CandidateProfile.findOne({ userId });

    if (!candidateProfile) {
      return res.status(404).json({
        success: false,
        message: 'CV not found'
      });
    }

    res.json({
      success: true,
      data: {
        cvUrl: candidateProfile.cvUrl,
        cvParsed: candidateProfile.cvParsed
      }
    });
  } catch (error) {
    logger.error('Get CV data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get CV data',
      error: error.message
    });
  }
});

// Update CV data manually
router.put('/me', authenticate, authorize('candidate'), async (req, res) => {
  try {
    const userId = req.user._id;
    const cvData = req.body;

    const candidateProfile = await CandidateProfile.findOne({ userId });

    if (!candidateProfile) {
      return res.status(404).json({
        success: false,
        message: 'Candidate profile not found'
      });
    }

    candidateProfile.updateCVData(cvData);
    await candidateProfile.save();

    res.json({
      success: true,
      message: 'CV data updated successfully',
      data: {
        cvParsed: candidateProfile.cvParsed
      }
    });
  } catch (error) {
    logger.error('Update CV data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update CV data',
      error: error.message
    });
  }
});

// Re-process CV with AI service
router.post('/reprocess', authenticate, authorize('candidate'), async (req, res) => {
  try {
    const userId = req.user._id;

    const candidateProfile = await CandidateProfile.findOne({ userId });

    if (!candidateProfile || !candidateProfile.cvUrl) {
      return res.status(404).json({
        success: false,
        message: 'No CV found to reprocess'
      });
    }

    // Extract CV data using AI service from existing CV URL
    let cvParsedData = {};
    try {
      const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';
      
      let downloadUrl = candidateProfile.cvUrl;
      
      // If using private Cloudinary, we might face 401. 
      // Workaround: Use Cloudinary SDK to get a temporary public version or use Admin API to download
      if (downloadUrl.includes('cloudinary.com')) {
        try {
          logger.info('Using Cloudinary SDK workaround for restricted CV access...');
          const urlParts = downloadUrl.split('/');
          const uploadIndex = urlParts.indexOf('upload');
          if (uploadIndex !== -1) {
            const publicIdWithExt = urlParts.slice(uploadIndex + 2).join('/');
            const publicId = publicIdWithExt.split('.')[0];
            
            // Re-upload to a temporary public resource to get content
            // Cloudinary's uploader can access its own restricted resources
            const uploadResult = await cloudinary.uploader.upload(downloadUrl, {
              folder: 'temp_reprocess',
              resource_type: 'auto'
            });
            downloadUrl = uploadResult.secure_url;
            logger.info(`Temporary public URL generated: ${downloadUrl}`);
            
            // Ensure we clean up later
            setTimeout(() => {
              cloudinary.uploader.destroy(uploadResult.public_id).catch(e => logger.warn('Failed to cleanup temp CV', e));
            }, 60000); // Delete after 1 minute
          }
        } catch (workaroundError) {
          logger.warn('Cloudinary workaround failed, falling back to direct download', workaroundError);
        }
      }
      
      logger.info(`Attempting to download CV from: ${downloadUrl}`);
      // Download CV
      const cvResponse = await axios.get(downloadUrl, {
        responseType: 'arraybuffer'
      });
      logger.info(`CV downloaded successfully, size: ${cvResponse.data.length}`);

      // Create form data for AI service
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', cvResponse.data, {
        filename: 'cv.pdf',
        contentType: 'application/pdf'
      });
      formData.append('include_raw_text', 'true');

      logger.info(`Calling AI service at: ${aiServiceUrl}/api/v1/extract`);
      const aiResponse = await axios.post(`${aiServiceUrl}/api/v1/extract`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 seconds
      });

      if (aiResponse.data.success) {
        cvParsedData = aiResponse.data.cv_data || {};
        logger.info(`CV data re-extracted for user ${userId}`);
      } else {
        logger.warn(`AI service re-extraction failed: ${aiResponse.data.error}`);
      }
    } catch (aiError) {
      logger.error('AI service re-processing error details:', {
        message: aiError.message,
        status: aiError.response?.status,
        data: aiError.response?.data,
        url: aiError.config?.url
      });
      return res.status(500).json({
        success: false,
        message: 'Failed to re-process CV with AI service',
        error: aiError.message
      });
    }

    // Update candidate profile
    candidateProfile.updateCVData(cvParsedData);
    await candidateProfile.save();

    res.json({
      success: true,
      message: 'CV re-processed successfully',
      data: {
        cvParsed: cvParsedData
      }
    });
  } catch (error) {
    logger.error('CV re-process error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to re-process CV',
      error: error.message
    });
  }
});

// Delete CV
router.delete('/me', authenticate, authorize('candidate'), async (req, res) => {
  try {
    const userId = req.user._id;

    const candidateProfile = await CandidateProfile.findOne({ userId });

    if (!candidateProfile) {
      return res.status(404).json({
        success: false,
        message: 'CV not found'
      });
    }

    // Delete from Cloudinary
    if (candidateProfile.cvUrl) {
      try {
        const publicId = candidateProfile.cvUrl.split('/').pop().split('.')[0];
        await cloudinary.uploader.destroy(publicId);
        logger.info(`CV deleted from Cloudinary: ${publicId}`);
      } catch (cloudinaryError) {
        logger.error('Cloudinary deletion error:', cloudinaryError);
        // Don't fail the operation if Cloudinary deletion fails
      }
    }

    // Update profile
    candidateProfile.cvUrl = null;
    candidateProfile.cvParsed = {};
    await candidateProfile.save();

    res.json({
      success: true,
      message: 'CV deleted successfully'
    });
  } catch (error) {
    logger.error('CV deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete CV',
      error: error.message
    });
  }
});

// Get AI service status
router.get('/ai-status', authenticate, authorize('candidate'), async (req, res) => {
  try {
    const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:8000';

    try {
      const response = await axios.get(`${aiServiceUrl}/health`, {
        timeout: 5000 // 5 seconds
      });

      res.json({
        success: true,
        data: {
          aiServiceAvailable: true,
          aiServiceUrl,
          status: response.data
        }
      });
    } catch (aiError) {
      res.json({
        success: true,
        data: {
          aiServiceAvailable: false,
          aiServiceUrl,
          error: aiError.message
        }
      });
    }
  } catch (error) {
    logger.error('AI status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check AI service status',
      error: error.message
    });
  }
});

module.exports = router;

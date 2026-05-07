const express = require('express');
const { authenticate, authorize, requireVerification } = require('../middleware/auth');
const {
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
} = require('../controllers/candidateController');

const router = express.Router();

// All candidate routes require authentication and candidate role
router.use(authenticate);
router.use(authorize('candidate'));

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', profileValidation, updateProfile);
router.post('/skills', addSkill);
router.delete('/skills/:skill', removeSkill);
router.post('/experience', addExperience);

// Job routes
router.get('/jobs', getJobs);
router.get('/jobs/:id', getJobDetails);
router.post('/apply', applicationValidation, applyJob);
router.get('/recommendations', getRecommendations);

// Application routes
router.get('/applications', getMyApplications);
router.delete('/applications/:id', withdrawApplication);

module.exports = router;

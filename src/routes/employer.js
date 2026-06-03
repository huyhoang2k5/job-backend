const express = require('express');
const { authenticate, authorize, requireVerification } = require('../middleware/auth');
const {
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
} = require('../controllers/employerController');

const router = express.Router();

// All employer routes require authentication and employer role
router.use(authenticate);
router.use(authorize('employer'));

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', profileValidation, updateProfile);

// Job routes
router.post('/jobs', jobValidation, createJob);
router.get('/jobs', getMyJobs);
router.put('/jobs/:id', jobValidation, updateJob);
router.delete('/jobs/:id', deleteJob);
router.get('/jobs/:id/applications', getJobApplications);
router.get('/applications', getEmployerApplications);
router.patch('/applications/:id/status', updateApplicationStatus);

// Candidate search
router.get('/candidates', searchCandidates);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

module.exports = router;

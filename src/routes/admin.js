const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
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
} = require('../controllers/adminController');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(authorize('admin'));

// Dashboard
router.get('/stats', getDashboardStats);

// User management
router.get('/users', getUsers);
router.patch('/users/:id/status', updateUserStatus);
router.delete('/users/:id', deleteUser);

// Employer management
router.get('/employers', getEmployers);
router.patch('/employers/:id/status', updateEmployerStatus);

// Job management
router.get('/jobs', getJobs);
router.patch('/jobs/:id/status', updateJobStatus);

// Application management
router.get('/applications', getApplications);

// Reports and analytics
router.get('/reports', getReports);

module.exports = router;

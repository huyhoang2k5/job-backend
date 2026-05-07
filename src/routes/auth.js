const express = require('express');
const rateLimit = require('express-rate-limit');
const { 
  authenticate, 
  authRateLimit 
} = require('../middleware/auth');
const {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  changePassword,
  getProfile,
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation
} = require('../controllers/authController');

const router = express.Router();

// Apply rate limiting to auth routes
router.use(rateLimit(authRateLimit));

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password', resetPasswordValidation, resetPassword);

// Protected routes
router.post('/logout-all', authenticate, logoutAll);
router.post('/change-password', authenticate, changePasswordValidation, changePassword);
router.get('/profile', authenticate, getProfile);

module.exports = router;

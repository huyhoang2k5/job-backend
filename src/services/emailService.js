const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send verification email
const sendVerificationEmail = async (email, token) => {
  try {
    const transporter = createTransporter();
    
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
    
    const mailOptions = {
      from: `"Job Matching" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Verify Your Email Address',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">Welcome to Job Matching!</h2>
          <p style="color: #666; line-height: 1.6;">
            Thank you for registering with Job Matching. Please verify your email address to complete your registration.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Verify Email
            </a>
          </div>
          <p style="color: #999; font-size: 14px; text-align: center;">
            If you didn't create an account with Job Matching, please ignore this email.
            This link will expire in 24 hours.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © 2024 Job Matching. All rights reserved.
          </p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    logger.info(`Verification email sent to ${email}`);
  } catch (error) {
    logger.error('Failed to send verification email:', error);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, token) => {
  try {
    const transporter = createTransporter();
    
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
    
    const mailOptions = {
      from: `"Job Matching" <${process.env.FROM_EMAIL}>`,
      to: email,
      subject: 'Reset Your Password',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">Reset Your Password</h2>
          <p style="color: #666; line-height: 1.6;">
            We received a request to reset your password for your Job Matching account.
            Click the button below to reset your password.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #dc3545; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #999; font-size: 14px; text-align: center;">
            If you didn't request a password reset, please ignore this email.
            This link will expire in 10 minutes.
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © 2024 Job Matching. All rights reserved.
          </p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${email}`);
  } catch (error) {
    logger.error('Failed to send password reset email:', error);
    throw error;
  }
};

// Send application notification to employer
const sendApplicationNotification = async (employerEmail, candidateName, jobTitle) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Job Matching" <${process.env.FROM_EMAIL}>`,
      to: employerEmail,
      subject: `New Application for ${jobTitle}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">New Application Received</h2>
          <p style="color: #666; line-height: 1.6;">
            You have received a new application for the position: <strong>${jobTitle}</strong>
          </p>
          <p style="color: #666; line-height: 1.6;">
            Candidate: <strong>${candidateName}</strong>
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/employer/applications" 
               style="background-color: #28a745; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              View Applications
            </a>
          </div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © 2024 Job Matching. All rights reserved.
          </p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    logger.info(`Application notification sent to ${employerEmail}`);
  } catch (error) {
    logger.error('Failed to send application notification:', error);
    throw error;
  }
};

// Send interview invitation
const sendInterviewInvitation = async (candidateEmail, employerName, jobTitle, interviewDetails) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"Job Matching" <${process.env.FROM_EMAIL}>`,
      to: candidateEmail,
      subject: `Interview Invitation for ${jobTitle}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">Interview Invitation</h2>
          <p style="color: #666; line-height: 1.6;">
            Congratulations! ${employerName} would like to interview you for the position: <strong>${jobTitle}</strong>
          </p>
          
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Interview Details:</h3>
            <p style="color: #666; margin: 5px 0;">
              <strong>Date:</strong> ${interviewDetails.date}
            </p>
            <p style="color: #666; margin: 5px 0;">
              <strong>Time:</strong> ${interviewDetails.time}
            </p>
            <p style="color: #666; margin: 5px 0;">
              <strong>Type:</strong> ${interviewDetails.type}
            </p>
            ${interviewDetails.location ? `
              <p style="color: #666; margin: 5px 0;">
                <strong>Location:</strong> ${interviewDetails.location}
              </p>
            ` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/candidate/applications" 
               style="background-color: #007bff; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              View Application
            </a>
          </div>
          
          <p style="color: #999; font-size: 14px; text-align: center;">
            Please log in to your account to accept or decline this interview invitation.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © 2024 Job Matching. All rights reserved.
          </p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    logger.info(`Interview invitation sent to ${candidateEmail}`);
  } catch (error) {
    logger.error('Failed to send interview invitation:', error);
    throw error;
  }
};

// Send job recommendation
const sendJobRecommendation = async (candidateEmail, recommendations) => {
  try {
    const transporter = createTransporter();
    
    const jobList = recommendations.map(job => `
      <div style="border: 1px solid #ddd; padding: 15px; margin: 15px 0; border-radius: 5px;">
        <h3 style="color: #333; margin-top: 0;">${job.title}</h3>
        <p style="color: #666; margin: 5px 0;">
          <strong>Company:</strong> ${job.company}
        </p>
        <p style="color: #666; margin: 5px 0;">
          <strong>Location:</strong> ${job.location}
        </p>
        <p style="color: #666; margin: 5px 0;">
          <strong>Match Score:</strong> ${job.matchScore}%
        </p>
        <a href="${process.env.FRONTEND_URL}/jobs/${job.id}" 
           style="color: #007bff; text-decoration: none;">
          View Job Details
        </a>
      </div>
    `).join('');
    
    const mailOptions = {
      from: `"Job Matching" <${process.env.FROM_EMAIL}>`,
      to: candidateEmail,
      subject: 'New Job Recommendations for You',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <h2 style="color: #333; text-align: center;">New Job Recommendations</h2>
          <p style="color: #666; line-height: 1.6;">
            Based on your profile, we found some jobs that might be a great fit for you:
          </p>
          
          ${jobList}
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/candidate/recommendations" 
               style="background-color: #28a745; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              View All Recommendations
            </a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © 2024 Job Matching. All rights reserved.
          </p>
        </div>
      `
    };
    
    await transporter.sendMail(mailOptions);
    logger.info(`Job recommendations sent to ${candidateEmail}`);
  } catch (error) {
    logger.error('Failed to send job recommendations:', error);
    throw error;
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendApplicationNotification,
  sendInterviewInvitation,
  sendJobRecommendation
};

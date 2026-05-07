const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'application_received',
      'application_viewed',
      'application_status',
      'interview_scheduled',
      'job_recommended',
      'new_message',
      'profile_approved',
      'profile_rejected',
      'job_approved',
      'job_rejected',
      'system_announcement'
    ],
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Content cannot exceed 500 characters']
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  data: {
    // Store related data like job ID, application ID, etc.
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobPost'
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application'
    },
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    url: String,
    actionUrl: String
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  category: {
    type: String,
    enum: ['application', 'job', 'message', 'profile', 'system'],
    required: true
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ category: 1 });
notificationSchema.index({ priority: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for user info
notificationSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware
notificationSchema.pre('save', function(next) {
  // Set readAt when notification is marked as read
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  
  // Set default category based on type if not provided
  if (this.isNew && !this.category) {
    switch (this.type) {
      case 'application_received':
      case 'application_viewed':
      case 'application_status':
      case 'interview_scheduled':
        this.category = 'application';
        break;
      case 'job_recommended':
      case 'job_approved':
      case 'job_rejected':
        this.category = 'job';
        break;
      case 'new_message':
        this.category = 'message';
        break;
      case 'profile_approved':
      case 'profile_rejected':
        this.category = 'profile';
        break;
      case 'system_announcement':
        this.category = 'system';
        break;
    }
  }
  
  // Set default priority based on type if not provided
  if (this.isNew && !this.priority) {
    switch (this.type) {
      case 'interview_scheduled':
        this.priority = 'high';
        break;
      case 'application_received':
      case 'new_message':
        this.priority = 'medium';
        break;
      default:
        this.priority = 'low';
    }
  }
  
  next();
});

// Instance methods
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  if (!this.readAt) {
    this.readAt = new Date();
  }
  return this.save();
};

notificationSchema.methods.deleteNotification = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

notificationSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

// Static methods
notificationSchema.statics.findByUser = function(userId, options = {}) {
  const query = {
    userId,
    isDeleted: false
  };
  
  // Filter by read status
  if (options.isRead !== undefined) {
    query.isRead = options.isRead;
  }
  
  // Filter by category
  if (options.category) {
    query.category = options.category;
  }
  
  // Filter by type
  if (options.type) {
    query.type = options.type;
  }
  
  // Filter by priority
  if (options.priority) {
    query.priority = options.priority;
  }
  
  let notificationQuery = this.find(query)
    .populate('data.senderId', 'name avatar')
    .sort({ createdAt: -1 });
  
  // Apply limit
  if (options.limit) {
    notificationQuery = notificationQuery.limit(options.limit);
  }
  
  return notificationQuery;
};

notificationSchema.statics.findUnreadByUser = function(userId) {
  return this.find({
    userId,
    isRead: false,
    isDeleted: false
  })
  .populate('data.senderId', 'name avatar')
  .sort({ createdAt: -1 });
};

notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    userId,
    isRead: false,
    isDeleted: false
  });
};

notificationSchema.statics.markAllAsRead = function(userId) {
  return this.updateMany(
    {
      userId,
      isRead: false,
      isDeleted: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );
};

notificationSchema.statics.createNotification = function(userId, type, title, content, data = {}) {
  return this.create({
    userId,
    type,
    title,
    content,
    data
  });
};

notificationSchema.statics.createApplicationNotification = function(userId, type, applicationData) {
  const titles = {
    application_received: 'New Application Received',
    application_viewed: 'Application Viewed',
    application_status: 'Application Status Updated',
    interview_scheduled: 'Interview Scheduled'
  };
  
  const contents = {
    application_received: `You have a new application for ${applicationData.jobTitle}`,
    application_viewed: `Your application for ${applicationData.jobTitle} has been viewed`,
    application_status: `Your application for ${applicationData.jobTitle} is now ${applicationData.status}`,
    interview_scheduled: `Interview scheduled for ${applicationData.jobTitle} on ${applicationData.interviewDate}`
  };
  
  return this.create({
    userId,
    type,
    title: titles[type],
    content: contents[type],
    data: {
      applicationId: applicationData.applicationId,
      jobId: applicationData.jobId,
      url: `/employer/applications/${applicationData.applicationId}`
    }
  });
};

notificationSchema.statics.createMessageNotification = function(userId, senderData, messageContent) {
  return this.create({
    userId,
    type: 'new_message',
    title: 'New Message',
    content: `${senderData.name}: ${messageContent.substring(0, 50)}...`,
    data: {
      messageId: messageContent.messageId,
      senderId: senderData.userId,
      url: `/messages/${messageContent.roomId}`
    }
  });
};

notificationSchema.statics.createJobNotification = function(userId, type, jobData) {
  const titles = {
    job_recommended: 'Job Recommended for You',
    job_approved: 'Job Posting Approved',
    job_rejected: 'Job Posting Rejected'
  };
  
  const contents = {
    job_recommended: `New job recommendation: ${jobData.title}`,
    job_approved: `Your job posting "${jobData.title}" has been approved`,
    job_rejected: `Your job posting "${jobData.title}" was rejected: ${jobData.reason}`
  };
  
  return this.create({
    userId,
    type,
    title: titles[type],
    content: contents[type],
    data: {
      jobId: jobData.jobId,
      url: type === 'job_recommended' ? `/jobs/${jobData.jobId}` : `/employer/jobs/${jobData.jobId}`
    }
  });
};

notificationSchema.statics.createProfileNotification = function(userId, type, profileData) {
  const titles = {
    profile_approved: 'Profile Approved',
    profile_rejected: 'Profile Rejected'
  };
  
  const contents = {
    profile_approved: 'Your company profile has been approved',
    profile_rejected: `Your company profile was rejected: ${profileData.reason}`
  };
  
  return this.create({
    userId,
    type,
    title: titles[type],
    content: contents[type],
    data: {
      url: '/employer/company'
    }
  });
};

notificationSchema.statics.getNotificationStats = function(userId) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        isDeleted: false
      }
    },
    {
      $group: {
        _id: '$category',
        total: { $sum: 1 },
        unread: {
          $sum: {
            $cond: [{ $eq: ['$isRead', false] }, 1, 0]
          }
        }
      }
    }
  ]);
};

notificationSchema.statics.cleanupExpiredNotifications = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

module.exports = mongoose.model('Notification', notificationSchema);

const mongoose = require('mongoose');

const jobPostSchema = new mongoose.Schema({
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployerProfile',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Job title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  requirements: [{
    type: String,
    trim: true,
    maxlength: [500, 'Requirement cannot exceed 500 characters']
  }],
  skills: [{
    type: String,
    trim: true,
    maxlength: [50, 'Skill name cannot exceed 50 characters']
  }],
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  isRemote: {
    type: Boolean,
    default: false
  },
  salary: {
    min: {
      type: Number,
      min: [0, 'Minimum salary cannot be negative']
    },
    max: {
      type: Number,
      min: [0, 'Maximum salary cannot be negative']
    },
    currency: {
      type: String,
      enum: ['USD', 'VND'],
      default: 'VND'
    },
    isNegotiable: {
      type: Boolean,
      default: false
    }
  },
  type: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'],
    required: true
  },
  experienceLevel: {
    type: String,
    enum: ['entry-level', 'junior', 'mid-level', 'senior', 'lead', 'manager'],
    required: true
  },
  department: {
    type: String,
    trim: true,
    maxlength: [50, 'Department cannot exceed 50 characters']
  },
  deadline: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired', 'closed'],
    default: 'pending'
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  approvedDate: {
    type: Date,
    default: null
  },
  views: {
    type: Number,
    default: 0
  },
  applications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application'
  }],
  isFeatured: {
    type: Boolean,
    default: false
  },
  featuredExpiry: {
    type: Date,
    default: null
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters']
  }],
  applicationCount: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
jobPostSchema.index({ employerId: 1 });
jobPostSchema.index({ title: 'text', description: 'text' });
jobPostSchema.index({ skills: 1 });
jobPostSchema.index({ location: 1 });
jobPostSchema.index({ type: 1 });
jobPostSchema.index({ experienceLevel: 1 });
jobPostSchema.index({ status: 1 });
jobPostSchema.index({ deadline: 1 });
jobPostSchema.index({ isFeatured: 1 });
jobPostSchema.index({ createdAt: -1 });

// Virtual for days until deadline
jobPostSchema.virtual('daysUntilDeadline').get(function() {
  if (!this.deadline) return null;
  const now = new Date();
  const diffTime = this.deadline - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for salary range string
jobPostSchema.virtual('salaryRange').get(function() {
  if (!this.salary.min && !this.salary.max) {
    return this.salary.isNegotiable ? 'Negotiable' : 'Not specified';
  }
  
  const currency = this.salary.currency === 'USD' ? '$' : '₫';
  const min = this.salary.min ? `${currency}${this.salary.min.toLocaleString()}` : '';
  const max = this.salary.max ? `${currency}${this.salary.max.toLocaleString()}` : '';
  
  if (min && max) {
    return `${min} - ${max}`;
  } else if (min) {
    return `${min}+`;
  } else if (max) {
    return `Up to ${max}`;
  }
  
  return this.salary.isNegotiable ? 'Negotiable' : 'Not specified';
});

// Virtual for is expired
jobPostSchema.virtual('isExpired').get(function() {
  return this.deadline && new Date() > this.deadline;
});

// Virtual for is active and approved
jobPostSchema.virtual('isLive').get(function() {
  return this.status === 'approved' && 
         this.isActive && 
         !this.isExpired;
});

// Virtual for employer (alias to populated employerId)
jobPostSchema.virtual('employer').get(function() {
  return this.employerId;
});

// Pre-save middleware
jobPostSchema.pre('save', function(next) {
  // Set approved date when status changes to approved
  if (this.isModified('status') && this.status === 'approved' && !this.approvedDate) {
    this.approvedDate = new Date();
  }
  
  // Clear rejection reason when approved
  if (this.isModified('status') && this.status === 'approved') {
    this.rejectionReason = null;
  }
  
  // Auto-expire jobs past deadline
  if (this.deadline && new Date() > this.deadline && this.status === 'approved') {
    this.status = 'expired';
  }
  
  // Validate salary range
  if (this.salary.min && this.salary.max && this.salary.min > this.salary.max) {
    return next(new Error('Minimum salary cannot be greater than maximum salary'));
  }
  
  next();
});

// Pre-remove middleware
jobPostSchema.pre('remove', async function(next) {
  // Remove all applications for this job
  await mongoose.model('Application').deleteMany({ jobId: this._id });
  next();
});

// Instance methods
jobPostSchema.methods.addView = function() {
  this.views += 1;
  return this.save();
};

jobPostSchema.methods.addApplication = function(applicationId) {
  this.applications.push(applicationId);
  this.applicationCount += 1;
  return this.save();
};

jobPostSchema.methods.removeApplication = function(applicationId) {
  this.applications = this.applications.filter(app => app.toString() !== applicationId.toString());
  this.applicationCount = Math.max(0, this.applicationCount - 1);
  return this.save();
};

jobPostSchema.methods.feature = function(days = 7) {
  this.isFeatured = true;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  this.featuredExpiry = expiry;
  return this.save();
};

jobPostSchema.methods.unfeature = function() {
  this.isFeatured = false;
  this.featuredExpiry = null;
  return this.save();
};

jobPostSchema.methods.isCurrentlyFeatured = function() {
  return this.isFeatured && 
         this.featuredExpiry && 
         new Date() <= this.featuredExpiry;
};

// Static methods
jobPostSchema.statics.findByEmployer = function(employerId) {
  return this.find({ employerId })
    .sort({ createdAt: -1 });
};

jobPostSchema.statics.findActive = function() {
  return this.find({ 
    status: 'approved',
    isActive: true,
    deadline: { $gt: new Date() }
  })
  .sort({ createdAt: -1 });
};

jobPostSchema.statics.findFeatured = function() {
  return this.find({
    status: 'approved',
    isActive: true,
    isFeatured: true,
    featuredExpiry: { $gt: new Date() },
    deadline: { $gt: new Date() }
  })
  .sort({ createdAt: -1 });
};

jobPostSchema.statics.searchJobs = function(query) {
  const searchQuery = {
    status: 'approved',
    isActive: true,
    deadline: { $gt: new Date() }
  };
  
  if (query.keyword) {
    searchQuery.$text = { $search: query.keyword };
  }
  
  if (query.skills && query.skills.length > 0) {
    searchQuery.skills = { $in: query.skills };
  }
  
  if (query.location) {
    searchQuery.location = new RegExp(query.location, 'i');
  }
  
  if (query.type) {
    searchQuery.type = query.type;
  }
  
  if (query.experienceLevel) {
    searchQuery.experienceLevel = query.experienceLevel;
  }
  
  if (query.salaryMin) {
    searchQuery['salary.min'] = { $gte: query.salaryMin };
  }
  
  if (query.salaryMax) {
    searchQuery['salary.max'] = { $lte: query.salaryMax };
  }
  
  if (query.isRemote !== undefined) {
    searchQuery.isRemote = query.isRemote;
  }
  
  let jobQuery = this.find(searchQuery);
  
  // Sort by relevance for text search, otherwise by date
  if (query.keyword) {
    jobQuery = jobQuery.sort({ score: { $meta: 'textScore' } });
  } else {
    jobQuery = jobQuery.sort({ createdAt: -1 });
  }
  
  // Featured jobs first
  jobQuery = jobQuery.sort({ isFeatured: -1 });
  
  return jobQuery;
};

jobPostSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

jobPostSchema.statics.getPopularSkills = function(limit = 10) {
  return this.aggregate([
    { $unwind: '$skills' },
    { $group: { _id: '$skills', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ]);
};

module.exports = mongoose.model('JobPost', jobPostSchema);

const mongoose = require('mongoose');

const employerProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Company name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  logo: {
    type: String,
    default: null
  },
  website: {
    type: String,
    trim: true,
    match: [
      /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
      'Please enter a valid website URL'
    ]
  },
  location: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  industry: {
    type: String,
    required: true,
    enum: [
      'Technology',
      'Finance',
      'Healthcare',
      'Education',
      'Manufacturing',
      'Retail',
      'Consulting',
      'Media',
      'Real Estate',
      'Transportation',
      'Energy',
      'Agriculture',
      'Government',
      'Non-profit',
      'Other'
    ]
  },
  companySize: {
    type: String,
    enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
    required: true
  },
  foundedYear: {
    type: Number,
    min: [1800, 'Founded year cannot be before 1800'],
    max: [new Date().getFullYear(), 'Founded year cannot be in the future']
  },
  socialLinks: {
    linkedin: String,
    facebook: String,
    twitter: String,
    instagram: String
  },
  contactInfo: {
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please enter a valid email'
      ]
    },
    address: {
      type: String,
      trim: true,
      maxlength: [200, 'Address cannot exceed 200 characters']
    }
  },
  benefits: [{
    type: String,
    trim: true,
    maxlength: [100, 'Benefit cannot exceed 100 characters']
  }],
  isApproved: {
    type: Boolean,
    default: false
  },
  approvalDate: {
    type: Date,
    default: null
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  subscription: {
    type: {
      type: String,
      enum: ['free', 'basic', 'premium', 'enterprise'],
      default: 'free'
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date,
      default: null
    },
    features: [{
      type: String
    }]
  },
  jobPostings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPost'
  }],
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
employerProfileSchema.index({ userId: 1 });
employerProfileSchema.index({ companyName: 1 });
employerProfileSchema.index({ industry: 1 });
employerProfileSchema.index({ location: 1 });
employerProfileSchema.index({ isApproved: 1 });
employerProfileSchema.index({ isActive: 1 });

// Virtual for company age
employerProfileSchema.virtual('companyAge').get(function() {
  if (!this.foundedYear) return null;
  return new Date().getFullYear() - this.foundedYear;
});

// Virtual for active job postings count
employerProfileSchema.virtual('activeJobPostingsCount', {
  ref: 'JobPost',
  localField: '_id',
  foreignField: 'employerId',
  count: true,
  match: { status: 'approved' }
});

// Pre-save middleware
employerProfileSchema.pre('save', function(next) {
  // Set approval date when profile is approved
  if (this.isModified('isApproved') && this.isApproved && !this.approvalDate) {
    this.approvalDate = new Date();
  }
  
  // Clear rejection reason when approved
  if (this.isModified('isApproved') && this.isApproved) {
    this.rejectionReason = null;
  }
  
  next();
});

// Instance methods
employerProfileSchema.methods.addBenefit = function(benefit) {
  if (!this.benefits.includes(benefit)) {
    this.benefits.push(benefit);
  }
};

employerProfileSchema.methods.removeBenefit = function(benefit) {
  this.benefits = this.benefits.filter(b => b !== benefit);
};

employerProfileSchema.methods.updateSubscription = function(plan, duration) {
  this.subscription.type = plan;
  this.subscription.startDate = new Date();
  
  if (duration) {
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + duration);
    this.subscription.endDate = endDate;
  }
  
  // Set features based on plan
  switch (plan) {
    case 'basic':
      this.subscription.features = ['basic-posting', 'candidate-search'];
      break;
    case 'premium':
      this.subscription.features = ['basic-posting', 'candidate-search', 'featured-posting', 'ai-matching'];
      break;
    case 'enterprise':
      this.subscription.features = ['basic-posting', 'candidate-search', 'featured-posting', 'ai-matching', 'dedicated-support', 'custom-branding'];
      break;
    default:
      this.subscription.features = ['basic-posting'];
  }
};

employerProfileSchema.methods.isSubscriptionActive = function() {
  if (this.subscription.type === 'free') return true;
  
  if (!this.subscription.endDate) return true;
  
  return new Date() <= this.subscription.endDate;
};

employerProfileSchema.methods.canPostJob = function() {
  if (!this.isApproved || !this.isActive) return false;
  
  if (!this.isSubscriptionActive()) return false;
  
  // Check posting limits based on subscription
  switch (this.subscription.type) {
    case 'free':
      return true; // Unlimited but basic features
    case 'basic':
      return true;
    case 'premium':
      return true;
    case 'enterprise':
      return true;
    default:
      return false;
  }
};

// Static methods
employerProfileSchema.statics.findByIndustry = function(industry) {
  return this.find({ 
    industry, 
    isApproved: true, 
    isActive: true 
  });
};

employerProfileSchema.statics.findByLocation = function(location) {
  return this.find({ 
    location: new RegExp(location, 'i'),
    isApproved: true,
    isActive: true
  });
};

employerProfileSchema.statics.findApproved = function() {
  return this.find({ 
    isApproved: true, 
    isActive: true 
  });
};

employerProfileSchema.statics.searchEmployers = function(query) {
  const searchQuery = {
    isApproved: true,
    isActive: true
  };
  
  if (query.companyName) {
    searchQuery.companyName = new RegExp(query.companyName, 'i');
  }
  
  if (query.industry) {
    searchQuery.industry = query.industry;
  }
  
  if (query.location) {
    searchQuery.location = new RegExp(query.location, 'i');
  }
  
  if (query.companySize) {
    searchQuery.companySize = query.companySize;
  }
  
  return this.find(searchQuery);
};

module.exports = mongoose.model('EmployerProfile', employerProfileSchema);

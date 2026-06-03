const mongoose = require('mongoose');

const candidateProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  skills: [{
    type: String,
    trim: true,
    maxlength: [100, 'Skill name cannot exceed 100 characters']
  }],
  experience: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [150, 'Job title cannot exceed 150 characters']
    },
    company: {
      type: String,
      required: true,
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters']
    },
    location: {
      type: String,
      trim: true,
      maxlength: [150, 'Location cannot exceed 150 characters']
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      default: null // null for current job
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    isCurrentJob: {
      type: Boolean,
      default: false
    }
  }],
  education: [{
    degree: {
      type: String,
      required: true,
      trim: true,
      maxlength: [150, 'Degree cannot exceed 150 characters']
    },
    school: {
      type: String,
      required: true,
      trim: true,
      maxlength: [150, 'School name cannot exceed 150 characters']
    },
    field: {
      type: String,
      trim: true,
      maxlength: [100, 'Field of study cannot exceed 100 characters']
    },
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      default: null
    },
    gpa: {
      type: Number,
      min: [0, 'GPA cannot be less than 0'],
      max: [4.0, 'GPA cannot exceed 4.0']
    },
    isCurrent: {
      type: Boolean,
      default: false
    }
  }],
  location: {
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  cvUrl: {
    type: String,
    default: null
  },
  cvParsed: {
    name: String,
    email: String,
    phone: String,
    skills: [String],
    experience: [mongoose.Schema.Types.Mixed],
    education: [mongoose.Schema.Types.Mixed],
    location: String,
    summary: String
  },
  resumeHeadline: {
    type: String,
    trim: true,
    maxlength: [200, 'Resume headline cannot exceed 200 characters']
  },
  preferredLocations: [{
    type: String,
    trim: true,
    maxlength: [100, 'Location cannot exceed 100 characters']
  }],
  expectedSalary: {
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
    }
  },
  jobType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship', 'remote'],
    default: 'full-time'
  },
  availability: {
    type: String,
    enum: ['immediately', '1-2-weeks', '2-4-weeks', '1-month', 'not-looking'],
    default: 'immediately'
  },
  socialLinks: {
    linkedin: String,
    github: String,
    portfolio: String,
    website: String
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
candidateProfileSchema.index({ userId: 1 });
candidateProfileSchema.index({ skills: 1 });
candidateProfileSchema.index({ location: 1 });
candidateProfileSchema.index({ 'experience.company': 1 });
candidateProfileSchema.index({ 'education.school': 1 });
candidateProfileSchema.index({ isPublic: 1 });
candidateProfileSchema.index({ isAvailable: 1 });

// Virtual for total experience
candidateProfileSchema.virtual('totalExperience').get(function() {
  let totalMonths = 0;
  
  this.experience.forEach(exp => {
    const start = new Date(exp.startDate);
    const end = exp.endDate ? new Date(exp.endDate) : new Date();
    const months = (end.getFullYear() - start.getFullYear()) * 12 + 
                  (end.getMonth() - start.getMonth());
    totalMonths += Math.max(0, months);
  });
  
  const years = Math.floor(totalMonths / 12);
  const remainingMonths = totalMonths % 12;
  
  if (years > 0) {
    return remainingMonths > 0 ? `${years} years ${remainingMonths} months` : `${years} years`;
  }
  return `${remainingMonths} months`;
});

// Virtual for candidate name (alias to populated userId name)
candidateProfileSchema.virtual('name').get(function() {
  return this.userId?.name;
});

// Virtual for candidate email (alias to populated userId email)
candidateProfileSchema.virtual('email').get(function() {
  return this.userId?.email;
});

// Virtual for latest education
candidateProfileSchema.virtual('latestEducation').get(function() {
  if (!this.education || this.education.length === 0) return null;
  
  return this.education.reduce((latest, edu) => {
    return !latest || new Date(edu.startDate) > new Date(latest.startDate) ? edu : latest;
  });
});

// Pre-save middleware to validate dates
candidateProfileSchema.pre('save', function(next) {
  // Validate experience dates
  this.experience.forEach(exp => {
    if (exp.endDate && exp.startDate >= exp.endDate) {
      return next(new Error('End date must be after start date for experience'));
    }
  });
  
  // Validate education dates
  this.education.forEach(edu => {
    if (edu.endDate && edu.startDate >= edu.endDate) {
      return next(new Error('End date must be after start date for education'));
    }
  });
  
  // Validate expected salary
  if (this.expectedSalary.min && this.expectedSalary.max && 
      this.expectedSalary.min > this.expectedSalary.max) {
    return next(new Error('Minimum salary cannot be greater than maximum salary'));
  }
  
  next();
});

// Instance methods
candidateProfileSchema.methods.addSkill = function(skill) {
  if (!this.skills.includes(skill)) {
    this.skills.push(skill);
  }
};

candidateProfileSchema.methods.removeSkill = function(skill) {
  this.skills = this.skills.filter(s => s !== skill);
};

candidateProfileSchema.methods.addExperience = function(exp) {
  this.experience.push(exp);
};

candidateProfileSchema.methods.updateCVData = function(parsedData) {
  this.cvParsed = parsedData;
  
  // Update fields from parsed data if they're empty
  if (!this.skills || this.skills.length === 0) {
    this.skills = parsedData.skills || [];
  }
  
  if (!this.location && parsedData.location) {
    this.location = parsedData.location;
  }
  
  if (!this.bio && parsedData.summary) {
    this.bio = parsedData.summary;
  }
};

// Static methods
candidateProfileSchema.statics.findBySkills = function(skills) {
  return this.find({ 
    skills: { $in: skills },
    isPublic: true,
    isAvailable: true
  });
};

candidateProfileSchema.statics.findByLocation = function(location) {
  return this.find({ 
    location: new RegExp(location, 'i'),
    isPublic: true,
    isAvailable: true
  });
};

candidateProfileSchema.statics.searchCandidates = function(query) {
  const searchQuery = {
    isPublic: true,
    isAvailable: true
  };
  
  if (query.skills) {
    searchQuery.skills = { $in: query.skills };
  }
  
  if (query.location) {
    searchQuery.location = new RegExp(query.location, 'i');
  }
  
  if (query.minExperience) {
    // This would require more complex calculation
    // For now, we'll use a simple approach
    searchQuery['experience.0'] = { $exists: true };
  }
  
  return this.find(searchQuery);
};

module.exports = mongoose.model('CandidateProfile', candidateProfileSchema);

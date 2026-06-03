const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CandidateProfile',
    required: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobPost',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  cvUrl: {
    type: String,
    required: true
  },
  coverLetter: {
    type: String,
    trim: true,
    maxlength: [2000, 'Cover letter cannot exceed 2000 characters']
  },
  status: {
    type: String,
    enum: ['pending', 'viewed', 'reviewing', 'shortlisted', 'rejected', 'accepted', 'withdrawn'],
    default: 'pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  notes: [{
    content: {
      type: String,
      required: true,
      maxlength: [1000, 'Note cannot exceed 1000 characters']
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  employerNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Employer notes cannot exceed 1000 characters']
  },
  matchScore: {
    type: Number,
    min: [0, 'Match score cannot be less than 0'],
    max: [100, 'Match score cannot exceed 100']
  },
  matchReasons: [{
    type: String,
    maxlength: [200, 'Match reason cannot exceed 200 characters']
  }],
  isViewed: {
    type: Boolean,
    default: false
  },
  viewedAt: {
    type: Date,
    default: null
  },
  interviewSchedule: {
    date: Date,
    time: String,
    type: {
      type: String,
      enum: ['phone', 'video', 'onsite', 'technical'],
      default: 'video'
    },
    location: String,
    notes: String,
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled'
    }
  },
  rejectionReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Rejection reason cannot exceed 500 characters']
  },
  withdrawalReason: {
    type: String,
    trim: true,
    maxlength: [500, 'Withdrawal reason cannot exceed 500 characters']
  },
  attachments: [{
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
applicationSchema.index({ candidateId: 1 });
applicationSchema.index({ jobId: 1 });
applicationSchema.index({ userId: 1 });
applicationSchema.index({ status: 1 });
applicationSchema.index({ appliedAt: -1 });
applicationSchema.index({ matchScore: -1 });

// Compound index to prevent duplicate applications
applicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });

// Virtual for days since application
applicationSchema.virtual('daysSinceApplied').get(function() {
  const now = new Date();
  const diffTime = now - this.appliedAt;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for candidate info
applicationSchema.virtual('candidate', {
  ref: 'CandidateProfile',
  localField: 'candidateId',
  foreignField: '_id',
  justOne: true
});

// Virtual for job info
applicationSchema.virtual('job', {
  ref: 'JobPost',
  localField: 'jobId',
  foreignField: '_id',
  justOne: true
});

// Virtual for user info
applicationSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware
applicationSchema.pre('save', function(next) {
  this.lastUpdated = new Date();
  
  // Set viewedAt when application is first viewed
  if (this.isModified('isViewed') && this.isViewed && !this.viewedAt) {
    this.viewedAt = new Date();
  }
  
  next();
});

// Instance methods
applicationSchema.methods.updateStatus = function(status, reason = null) {
  this.status = status;
  
  if (status === 'rejected' && reason) {
    this.rejectionReason = reason;
  }
  
  if (status === 'withdrawn' && reason) {
    this.withdrawalReason = reason;
  }
  
  return this.save();
};

applicationSchema.methods.addNote = function(content, addedBy) {
  this.notes.push({
    content,
    addedBy,
    addedAt: new Date()
  });
  return this.save();
};

applicationSchema.methods.view = function() {
  this.isViewed = true;
  if (!this.viewedAt) {
    this.viewedAt = new Date();
  }
  return this.save();
};

applicationSchema.methods.scheduleInterview = function(interviewData) {
  this.interviewSchedule = {
    ...interviewData,
    status: 'scheduled'
  };
  this.status = 'reviewing';
  return this.save();
};

applicationSchema.methods.addAttachment = function(filename, url) {
  this.attachments.push({
    filename,
    url,
    uploadedAt: new Date()
  });
  return this.save();
};

applicationSchema.methods.removeAttachment = function(attachmentId) {
  this.attachments = this.attachments.filter(
    att => att._id.toString() !== attachmentId.toString()
  );
  return this.save();
};

// Static methods
applicationSchema.statics.findByCandidate = function(candidateId) {
  return this.find({ candidateId })
    .populate({
      path: 'job',
      select: 'title location salary type employerId',
      populate: {
        path: 'employerId',
        select: 'companyName userId logo'
      }
    })
    .populate({
      path: 'jobId',
      select: 'title location salary type employerId',
      populate: {
        path: 'employerId',
        select: 'companyName userId logo'
      }
    })
    .sort({ appliedAt: -1 });
};

applicationSchema.statics.findByJob = function(jobId) {
  return this.find({ jobId })
    .populate({
      path: 'candidate',
      select: 'skills experience userId',
      populate: {
        path: 'userId',
        select: 'name email'
      }
    })
    .sort({ matchScore: -1, appliedAt: -1 });
};

applicationSchema.statics.findByEmployer = async function(employerId) {
  const jobs = await mongoose.model('JobPost').find({ employerId }).select('_id');
  const jobIds = jobs.map(j => j._id);
  return this.find({ jobId: { $in: jobIds } })
    .populate({
      path: 'job',
      select: 'title location salary type employerId',
      populate: {
        path: 'employerId',
        select: 'companyName userId logo'
      }
    })
    .populate({
      path: 'jobId',
      select: 'title location salary type employerId',
      populate: {
        path: 'employerId',
        select: 'companyName userId logo'
      }
    })
    .populate({
      path: 'candidate',
      select: 'skills experience userId',
      populate: {
        path: 'userId',
        select: 'name email'
      }
    })
    .sort({ appliedAt: -1 });
};

applicationSchema.statics.findByStatus = function(status) {
  return this.find({ status })
    .populate('candidate', 'name email')
    .populate('job', 'title company location')
    .sort({ appliedAt: -1 });
};

applicationSchema.statics.getStatistics = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
};

applicationSchema.statics.getApplicationsByDate = function(startDate, endDate) {
  const matchStage = {};
  if (startDate && endDate) {
    matchStage.appliedAt = {
      $gte: startDate,
      $lte: endDate
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: '$appliedAt'
          }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

applicationSchema.statics.getTopCandidates = function(limit = 10) {
  return this.aggregate([
    {
      $group: {
        _id: '$candidateId',
        applicationCount: { $sum: 1 },
        avgMatchScore: { $avg: '$matchScore' },
        acceptedCount: {
          $sum: {
            $cond: [{ $eq: ['$status', 'accepted'] }, 1, 0]
          }
        }
      }
    },
    {
      $addFields: {
        acceptanceRate: {
          $multiply: [
            { $divide: ['$acceptedCount', '$applicationCount'] },
            100
          ]
        }
      }
    },
    { $sort: { avgMatchScore: -1, acceptanceRate: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'candidateprofiles',
        localField: '_id',
        foreignField: '_id',
        as: 'candidate'
      }
    },
    { $unwind: '$candidate' }
  ]);
};

applicationSchema.statics.checkDuplicate = function(candidateId, jobId) {
  return this.findOne({ candidateId, jobId });
};

module.exports = mongoose.model('Application', applicationSchema);

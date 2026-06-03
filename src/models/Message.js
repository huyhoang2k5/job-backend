const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2000, 'Message cannot exceed 2000 characters']
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  attachment: {
    filename: String,
    url: String,
    mimeType: String,
    size: Number
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date,
    default: null
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
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
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: {
    userAgent: String,
    ipAddress: String,
    device: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
messageSchema.index({ roomId: 1, createdAt: -1 });
messageSchema.index({ senderId: 1 });
messageSchema.index({ receiverId: 1 });
messageSchema.index({ isRead: 1 });
messageSchema.index({ isDeleted: 1 });

// Virtual for sender info
messageSchema.virtual('sender', {
  ref: 'User',
  localField: 'senderId',
  foreignField: '_id',
  justOne: true
});

// Virtual for receiver info
messageSchema.virtual('receiver', {
  ref: 'User',
  localField: 'receiverId',
  foreignField: '_id',
  justOne: true
});

// Virtual for reply message
messageSchema.virtual('replyMessage', {
  ref: 'Message',
  localField: 'replyTo',
  foreignField: '_id',
  justOne: true
});

// Pre-save middleware
messageSchema.pre('save', function(next) {
  // Set readAt when message is marked as read
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  
  // Set editedAt when message is edited
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  
  // Set deletedAt when message is deleted
  if (this.isModified('isDeleted') && this.isDeleted && !this.deletedAt) {
    this.deletedAt = new Date();
  }
  
  next();
});

// Instance methods
messageSchema.methods.markAsRead = function() {
  this.isRead = true;
  if (!this.readAt) {
    this.readAt = new Date();
  }
  return this.save();
};

messageSchema.methods.edit = function(newContent) {
  this.content = newContent;
  this.isEdited = true;
  this.editedAt = new Date();
  return this.save();
};

messageSchema.methods.deleteMessage = function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  return this.save();
};

messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction from same user
  this.reactions = this.reactions.filter(
    reaction => reaction.userId.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({
    userId,
    emoji,
    addedAt: new Date()
  });
  
  return this.save();
};

messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(
    reaction => reaction.userId.toString() !== userId.toString()
  );
  return this.save();
};

messageSchema.methods.getReactionsByEmoji = function() {
  const reactionsByEmoji = {};
  
  this.reactions.forEach(reaction => {
    if (!reactionsByEmoji[reaction.emoji]) {
      reactionsByEmoji[reaction.emoji] = [];
    }
    reactionsByEmoji[reaction.emoji].push(reaction.userId);
  });
  
  return reactionsByEmoji;
};

// Static methods
messageSchema.statics.findByRoom = function(roomId, limit = 50, before = null) {
  const query = { 
    roomId, 
    isDeleted: false 
  };
  
  if (before) {
    query.createdAt = { $lt: before };
  }
  
  return this.find(query)
    .populate('sender', 'name avatar')
    .populate('receiver', 'name avatar')
    .populate('replyTo', 'content senderId')
    .sort({ createdAt: -1 })
    .limit(limit);
};

messageSchema.statics.findUnreadByUser = function(userId) {
  return this.find({
    receiverId: userId,
    isRead: false,
    isDeleted: false
  })
  .populate('sender', 'name avatar')
  .populate('roomId')
  .sort({ createdAt: -1 });
};

messageSchema.statics.findBetweenUsers = function(userId1, userId2, limit = 50) {
  return this.find({
    $or: [
      { senderId: userId1, receiverId: userId2 },
      { senderId: userId2, receiverId: userId1 }
    ],
    isDeleted: false
  })
  .populate('sender', 'name avatar')
  .populate('receiver', 'name avatar')
  .sort({ createdAt: -1 })
  .limit(limit);
};

messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    receiverId: userId,
    isRead: false,
    isDeleted: false
  });
};

messageSchema.statics.getRecentConversations = function(userId, limit = 20) {
  return this.aggregate([
    {
      $match: {
        $or: [
          { senderId: new mongoose.Types.ObjectId(userId) },
          { receiverId: new mongoose.Types.ObjectId(userId) }
        ],
        isDeleted: false
      }
    },
    {
      $group: {
        _id: '$roomId',
        lastMessage: { $last: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiverId', new mongoose.Types.ObjectId(userId)] },
                  { $eq: ['$isRead', false] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    },
    { $sort: { 'lastMessage.createdAt': -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: 'lastMessage.senderId',
        foreignField: '_id',
        as: 'sender'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'lastMessage.receiverId',
        foreignField: '_id',
        as: 'receiver'
      }
    },
    {
      $project: {
        id: '$_id',
        roomId: '$_id',
        lastMessage: 1,
        unreadCount: 1,
        otherUser: {
          $cond: [
            { $eq: ['$lastMessage.senderId', new mongoose.Types.ObjectId(userId)] },
            { $arrayElemAt: ['$receiver', 0] },
            { $arrayElemAt: ['$sender', 0] }
          ]
        }
      }
    }
  ]);
};

messageSchema.statics.markAllAsRead = function(userId, roomId) {
  return this.updateMany(
    {
      receiverId: userId,
      roomId,
      isRead: false,
      isDeleted: false
    },
    {
      isRead: true,
      readAt: new Date()
    }
  );
};

messageSchema.statics.deleteConversation = function(userId1, userId2) {
  return this.updateMany(
    {
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 }
      ]
    },
    {
      isDeleted: true,
      deletedAt: new Date()
    }
  );
};

messageSchema.statics.getMessageStats = function(userId, startDate, endDate) {
  const matchStage = {
    $or: [
      { senderId: new mongoose.Types.ObjectId(userId) },
      { receiverId: new mongoose.Types.ObjectId(userId) }
    ],
    isDeleted: false
  };
  
  if (startDate && endDate) {
    matchStage.createdAt = {
      $gte: startDate,
      $lte: endDate
    };
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        sentMessages: {
          $sum: {
            $cond: [
              { $eq: ['$senderId', new mongoose.Types.ObjectId(userId)] },
              1,
              0
            ]
          }
        },
        receivedMessages: {
          $sum: {
            $cond: [
              { $eq: ['$receiverId', new mongoose.Types.ObjectId(userId)] },
              1,
              0
            ]
          }
        },
        unreadMessages: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiverId', new mongoose.Types.ObjectId(userId)] },
                  { $eq: ['$isRead', false] }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Message', messageSchema);

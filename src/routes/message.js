const express = require('express');
const { authenticate } = require('../middleware/auth');
const Message = require('../models/Message');
const logger = require('../utils/logger');

const router = express.Router();

// All message routes require authentication
router.use(authenticate);

// Get messages for a room (conversation)
router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, before } = req.query;
    const userId = req.user._id;
    
    const messages = await Message.findByRoom(roomId, parseInt(limit), before ? new Date(before) : null);
    
    // Filter out deleted messages for current user
    const filteredMessages = messages.filter(msg => !msg.isDeleted);
    
    res.json({
      success: true,
      data: { 
        messages: filteredMessages,
        roomId 
      }
    });
  } catch (error) {
    logger.error('Get room messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get messages',
      error: error.message
    });
  }
});

// Get messages between two users
router.get('/conversation/:userId', async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const { limit = 50 } = req.query;
    const currentUserId = req.user._id;
    
    const messages = await Message.findBetweenUsers(currentUserId, otherUserId, parseInt(limit));
    
    // Filter out deleted messages for current user
    const filteredMessages = messages.filter(msg => !msg.isDeleted);
    
    res.json({
      success: true,
      data: { 
        messages: filteredMessages,
        otherUserId 
      }
    });
  } catch (error) {
    logger.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversation',
      error: error.message
    });
  }
});

// Get unread messages for current user
router.get('/unread', async (req, res) => {
  try {
    const userId = req.user._id;
    
    const unreadMessages = await Message.findUnreadByUser(userId);
    
    res.json({
      success: true,
      data: { 
        messages: unreadMessages,
        count: unreadMessages.length 
      }
    });
  } catch (error) {
    logger.error('Get unread messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread messages',
      error: error.message
    });
  }
});

// Get unread count
router.get('/unread/count', async (req, res) => {
  try {
    const userId = req.user._id;
    
    const unreadCount = await Message.getUnreadCount(userId);
    
    res.json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    logger.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count',
      error: error.message
    });
  }
});

// Get recent conversations
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user._id;
    const { limit = 20 } = req.query;
    
    const conversations = await Message.getRecentConversations(userId, parseInt(limit));
    
    res.json({
      success: true,
      data: { conversations }
    });
  } catch (error) {
    logger.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversations',
      error: error.message
    });
  }
});

// Mark message as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Only receiver can mark as read
    if (message.receiverId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await message.markAsRead();
    
    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    logger.error('Mark message as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark message as read',
      error: error.message
    });
  }
});

// Mark all messages in room as read
router.patch('/room/:roomId/read', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user._id;
    
    await Message.markAllAsRead(userId, roomId);
    
    res.json({
      success: true,
      message: 'All messages in room marked as read'
    });
  } catch (error) {
    logger.error('Mark room messages as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark messages as read',
      error: error.message
    });
  }
});

// Edit message
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user._id;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }
    
    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Only sender can edit
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    // Cannot edit after 24 hours
    const editTimeLimit = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    if (Date.now() - message.createdAt.getTime() > editTimeLimit) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit message after 24 hours'
      });
    }
    
    await message.edit(content.trim());
    
    res.json({
      success: true,
      message: 'Message updated successfully'
    });
  } catch (error) {
    logger.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit message',
      error: error.message
    });
  }
});

// Delete message
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;
    
    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Only sender can delete
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }
    
    await message.deleteMessage();
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    logger.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete message',
      error: error.message
    });
  }
});

// Add reaction to message
router.post('/:id/reactions', async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;
    
    if (!emoji) {
      return res.status(400).json({
        success: false,
        message: 'Emoji is required'
      });
    }
    
    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    await message.addReaction(userId, emoji);
    
    res.json({
      success: true,
      message: 'Reaction added successfully'
    });
  } catch (error) {
    logger.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add reaction',
      error: error.message
    });
  }
});

// Remove reaction from message
router.delete('/:id/reactions/:emoji', async (req, res) => {
  try {
    const { id, emoji } = req.params;
    const userId = req.user._id;
    
    const message = await Message.findById(id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    await message.removeReaction(userId);
    
    res.json({
      success: true,
      message: 'Reaction removed successfully'
    });
  } catch (error) {
    logger.error('Remove reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove reaction',
      error: error.message
    });
  }
});

// Delete conversation
router.delete('/conversation/:userId', async (req, res) => {
  try {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user._id;
    
    await Message.deleteConversation(currentUserId, otherUserId);
    
    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });
  } catch (error) {
    logger.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversation',
      error: error.message
    });
  }
});

// Get message statistics
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate } = req.query;
    
    const stats = await Message.getMessageStats(
      userId,
      startDate ? new Date(startDate) : null,
      endDate ? new Date(endDate) : null
    );
    
    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    logger.error('Get message stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get message statistics',
      error: error.message
    });
  }
});

module.exports = router;

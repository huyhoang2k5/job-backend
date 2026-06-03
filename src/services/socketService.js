const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

// Socket.IO connection handler
const socketHandler = (io) => {
  // Store connected users
  const connectedUsers = new Map();
  
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }
      
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user || !user.isActive) {
        return next(new Error('Invalid user'));
      }
      
      socket.user = user;
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });
  
  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`User ${user.email} connected to socket`);
    
    // Add user to connected users
    connectedUsers.set(user._id.toString(), {
      socketId: socket.id,
      user: user,
      joinedRooms: new Set()
    });
    
    // Join user to their personal room for notifications
    socket.join(`user_${user._id}`);
    
    // Join user to their existing conversation rooms
    joinExistingRooms(socket, user._id);
    
    // Handle joining a room (conversation)
    socket.on('join_room', async (data) => {
      try {
        const { roomId } = data;
        
        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }
        
        // Create room ID format (sorted user IDs)
        const roomUsers = roomId.split('_');
        if (!roomUsers.includes(user._id.toString())) {
          socket.emit('error', { message: 'Cannot join room - user not part of conversation' });
          return;
        }
        
        // Join room
        socket.join(roomId);
        
        // Update user's joined rooms
        const userInfo = connectedUsers.get(user._id.toString());
        if (userInfo) {
          userInfo.joinedRooms.add(roomId);
        }
        
        // Notify others in room that user is online
        socket.to(roomId).emit('user_online', {
          userId: user._id,
          userName: user.name
        });
        
        // Mark unread messages as read
        await Message.markAllAsRead(user._id, roomId);
        
        // Send room status
        socket.emit('room_joined', { roomId });
        
        logger.info(`User ${user.email} joined room ${roomId}`);
      } catch (error) {
        logger.error('Join room error:', error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });
    
    // Handle leaving a room
    socket.on('leave_room', (data) => {
      try {
        const { roomId } = data;
        
        if (!roomId) {
          socket.emit('error', { message: 'Room ID is required' });
          return;
        }
        
        // Leave room
        socket.leave(roomId);
        
        // Update user's joined rooms
        const userInfo = connectedUsers.get(user._id.toString());
        if (userInfo) {
          userInfo.joinedRooms.delete(roomId);
        }
        
        // Notify others in room that user is offline
        socket.to(roomId).emit('user_offline', {
          userId: user._id,
          userName: user.name
        });
        
        socket.emit('room_left', { roomId });
        
        logger.info(`User ${user.email} left room ${roomId}`);
      } catch (error) {
        logger.error('Leave room error:', error);
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });
    
    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { roomId, content, type = 'text', replyTo } = data;
        
        if (!roomId || !content) {
          socket.emit('error', { message: 'Room ID and content are required' });
          return;
        }
        
        // Verify user is part of the room (userId must be in the roomId)
        const roomUsers = roomId.split('_');
        if (!roomUsers.includes(user._id.toString())) {
          socket.emit('error', { message: 'You are not part of this conversation' });
          return;
        }
        
        // Auto-join the room if not already joined
        const userInfo = connectedUsers.get(user._id.toString());
        if (userInfo && !userInfo.joinedRooms.has(roomId)) {
          socket.join(roomId);
          userInfo.joinedRooms.add(roomId);
        }
        
        // Get other user ID from room
        const receiverId = roomUsers.find(id => id !== user._id.toString());
        
        if (!receiverId) {
          socket.emit('error', { message: 'Invalid room' });
          return;
        }
        
        // Create message
        const message = new Message({
          roomId,
          senderId: user._id,
          receiverId,
          content: content.trim(),
          type,
          replyTo,
          metadata: {
            userAgent: socket.handshake.headers['user-agent'],
            ipAddress: socket.handshake.address,
            device: socket.handshake.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop'
          }
        });
        
        await message.save();
        
        // Populate message details
        await message.populate('senderId', 'name avatar');
        await message.populate('receiverId', 'name avatar');
        if (replyTo) {
          await message.populate('replyTo');
        }
        
        // Broadcast to room
        io.to(roomId).emit('receive_message', message);
        
        // Create notification for receiver
        await Notification.createNotification(
          receiverId,
          'new_message',
          'New Message',
          `${user.name}: ${content.substring(0, 50)}...`,
          {
            messageId: message._id,
            senderId: user._id,
            url: `/messages/${roomId}`
          }
        );
        
        // Send notification to receiver's personal room
        io.to(`user_${receiverId}`).emit('notification', {
          type: 'new_message',
          title: 'New Message',
          content: `${user.name}: ${content.substring(0, 50)}...`,
          data: {
            messageId: message._id,
            roomId,
            sender: {
              id: user._id,
              name: user.name,
              avatar: user.avatar
            }
          }
        });
        
        logger.info(`Message sent in room ${roomId} by ${user.email}`);
      } catch (error) {
        logger.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });
    
    // Handle typing indicators
    socket.on('typing', (data) => {
      try {
        const { roomId } = data;
        
        if (!roomId) {
          return;
        }
        
        // Verify user is in room
        const userInfo = connectedUsers.get(user._id.toString());
        if (!userInfo || !userInfo.joinedRooms.has(roomId)) {
          return;
        }
        
        // Notify others in room that user is typing
        socket.to(roomId).emit('user_typing', {
          userId: user._id,
          userName: user.name,
          roomId
        });
      } catch (error) {
        logger.error('Typing indicator error:', error);
      }
    });
    
    // Handle stop typing
    socket.on('stop_typing', (data) => {
      try {
        const { roomId } = data;
        
        if (!roomId) {
          return;
        }
        
        // Verify user is in room
        const userInfo = connectedUsers.get(user._id.toString());
        if (!userInfo || !userInfo.joinedRooms.has(roomId)) {
          return;
        }
        
        // Notify others in room that user stopped typing
        socket.to(roomId).emit('user_stop_typing', {
          userId: user._id,
          userName: user.name,
          roomId
        });
      } catch (error) {
        logger.error('Stop typing error:', error);
      }
    });
    
    // Handle message read
    socket.on('mark_read', async (data) => {
      try {
        const { messageId } = data;
        
        if (!messageId) {
          socket.emit('error', { message: 'Message ID is required' });
          return;
        }
        
        const message = await Message.findById(messageId);
        
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }
        
        // Only receiver can mark as read
        if (message.receiverId.toString() !== user._id.toString()) {
          socket.emit('error', { message: 'Cannot mark own message as read' });
          return;
        }
        
        await message.markAsRead();
        
        // Notify sender that message was read
        io.to(`user_${message.senderId}`).emit('message_read', {
          messageId: message._id,
          readAt: message.readAt
        });
        
        logger.info(`Message ${messageId} marked as read by ${user.email}`);
      } catch (error) {
        logger.error('Mark message as read error:', error);
        socket.emit('error', { message: 'Failed to mark message as read' });
      }
    });
    
    // Handle message reactions
    socket.on('add_reaction', async (data) => {
      try {
        const { messageId, emoji } = data;
        
        if (!messageId || !emoji) {
          socket.emit('error', { message: 'Message ID and emoji are required' });
          return;
        }
        
        const message = await Message.findById(messageId);
        
        if (!message) {
          socket.emit('error', { message: 'Message not found' });
          return;
        }
        
        await message.addReaction(user._id, emoji);
        
        // Get updated reactions
        const reactions = message.getReactionsByEmoji();
        
        // Broadcast to room
        io.to(message.roomId).emit('reaction_added', {
          messageId: message._id,
          emoji,
          userId: user._id,
          reactions
        });
        
        logger.info(`Reaction ${emoji} added to message ${messageId} by ${user.email}`);
      } catch (error) {
        logger.error('Add reaction error:', error);
        socket.emit('error', { message: 'Failed to add reaction' });
      }
    });
    
    // Handle getting online users
    socket.on('get_online_users', async (data) => {
      try {
        const { roomId } = data;
        
        let onlineUsers = [];
        
        if (roomId) {
          // Get online users in specific room
          const roomUsers = roomId.split('_');
          onlineUsers = roomUsers
            .map(userId => {
              const userInfo = connectedUsers.get(userId);
              return userInfo ? {
                userId,
                socketId: userInfo.socketId,
                user: userInfo.user,
                isOnline: true
              } : null;
            })
            .filter(user => user !== null);
        } else {
          // Get all online users
          onlineUsers = Array.from(connectedUsers.entries()).map(([userId, userInfo]) => ({
            userId,
            socketId: userInfo.socketId,
            user: userInfo.user,
            isOnline: true
          }));
        }
        
        socket.emit('online_users', { users: onlineUsers });
      } catch (error) {
        logger.error('Get online users error:', error);
        socket.emit('error', { message: 'Failed to get online users' });
      }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
      try {
        logger.info(`User ${user.email} disconnected from socket`);
        
        // Remove user from connected users
        const userInfo = connectedUsers.get(user._id.toString());
        
        if (userInfo) {
          // Notify all rooms that user is offline
          userInfo.joinedRooms.forEach(roomId => {
            socket.to(roomId).emit('user_offline', {
              userId: user._id,
              userName: user.name
            });
          });
          
          // Remove from connected users
          connectedUsers.delete(user._id.toString());
        }
      } catch (error) {
        logger.error('Socket disconnection error:', error);
      }
    });
    
    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${user.email}:`, error);
    });
  });
  
  // Helper function to join existing rooms
  async function joinExistingRooms(socket, userId) {
    try {
      // Get recent conversations for the user
      const conversations = await Message.getRecentConversations(userId.toString(), 10);
      
      for (const conversation of conversations) {
        const roomId = conversation.roomId;
        
        // Join room
        socket.join(roomId);
        
        // Update user's joined rooms
        const userInfo = connectedUsers.get(userId.toString());
        if (userInfo) {
          userInfo.joinedRooms.add(roomId);
        }
        
        // Notify others in room that user is online
        socket.to(roomId).emit('user_online', {
          userId: userId,
          userName: socket.user.name
        });
      }
    } catch (error) {
      logger.error('Join existing rooms error:', error);
    }
  }
  
  // Helper function to get all connected users
  function getConnectedUsers() {
    return Array.from(connectedUsers.entries()).map(([userId, userInfo]) => ({
      userId,
      socketId: userInfo.socketId,
      user: userInfo.user,
      isOnline: true,
      joinedRooms: Array.from(userInfo.joinedRooms)
    }));
  }
  
  // Export helper functions for external use
  io.getConnectedUsers = getConnectedUsers;
  io.isUserConnected = (userId) => {
    return connectedUsers.has(userId.toString());
  };
  io.getUserSocketId = (userId) => {
    const userInfo = connectedUsers.get(userId.toString());
    return userInfo ? userInfo.socketId : null;
  };
};

module.exports = socketHandler;

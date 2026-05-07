# Job Backend API

RESTful API for job matching platform with authentication, real-time chat, and file management.

## Features

- **JWT Authentication**: Secure authentication with refresh tokens
- **Role-based Access**: Candidate, Employer, and Admin roles
- **RESTful APIs**: Complete CRUD operations for all entities
- **Real-time Chat**: Socket.IO integration for instant messaging
- **File Upload**: Cloudinary integration for CV and document storage
- **Email Notifications**: Nodemailer for transactional emails
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Input validation and sanitization
- **Rate Limiting**: API protection against abuse

## Tech Stack

- **Node.js 18+** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Socket.IO** - Real-time communication
- **JWT** - Authentication tokens
- **Bcrypt** - Password hashing
- **Cloudinary** - File storage
- **Nodemailer** - Email service
- **Multer** - File upload handling
- **Joi** - Input validation
- **Redis** - Session storage and caching

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- MongoDB 5.0+
- Redis (optional, for session storage)

## Installation

### Local Development

1. **Clone the repository**
```bash
git clone <repository-url>
cd job-backend
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
```

3. **Copy environment file**
```bash
cp .env.example .env
```

4. **Configure environment variables**
Edit `.env` file with your settings (see Configuration section)

5. **Start MongoDB**
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:5.0

# Or install locally
mongod --dbpath /path/to/your/db
```

6. **Start Redis (optional)**
```bash
# Using Docker
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Or install locally
redis-server
```

### Docker Setup

1. **Build Docker image**
```bash
docker build -t job-backend .
```

2. **Run container**
```bash
docker run -p 3001:3001 --env-file .env job-backend
```

## Configuration

Environment variables in `.env` file:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/job-matching

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=noreply@yourapp.com

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# AI Service Configuration
AI_SERVICE_URL=http://localhost:8000

# File Upload Configuration
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,docx,jpg,jpeg,png

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

## Running the Application

### Development Mode

```bash
# Start with nodemon for auto-reload
npm run dev

# Or start normally
npm start
```

### Production Mode

```bash
# Set production environment
export NODE_ENV=production

# Start with PM2 (recommended)
npm install -g pm2
pm2 start ecosystem.config.js

# Or start directly
npm start
```

### Docker Compose

```bash
# From project root
docker-compose up backend
```

## API Documentation

### Base URL
- **Development**: http://localhost:3001
- **Production**: https://your-domain.com

### Authentication

All API endpoints (except auth routes) require JWT token in `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

### API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Forgot password
- `POST /api/auth/reset-password` - Reset password

#### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users` - List users (Admin only)
- `PATCH /api/users/:id/status` - Update user status (Admin only)
- `DELETE /api/users/:id` - Delete user (Admin only)

#### Jobs
- `GET /api/jobs` - Browse jobs (public)
- `GET /api/jobs/featured` - Get featured jobs
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create job (Employer only)
- `PUT /api/jobs/:id` - Update job (Employer only)
- `DELETE /api/jobs/:id` - Delete job (Employer only)
- `GET /api/jobs/my` - My posted jobs (Employer only)

#### Applications
- `POST /api/applications` - Apply for job (Candidate only)
- `GET /api/applications` - Get applications
- `GET /api/applications/:id` - Get application details
- `PATCH /api/applications/:id/status` - Update status (Employer only)
- `POST /api/applications/:id/notes` - Add notes (Employer only)
- `POST /api/applications/:id/interview` - Schedule interview (Employer only)
- `POST /api/applications/:id/attachments` - Upload attachments
- `DELETE /api/applications/:id/attachments/:fileId` - Delete attachment

#### CV Management
- `POST /api/cv/upload` - Upload CV (Candidate only)
- `GET /api/cv` - Get CV data (Candidate only)
- `PUT /api/cv` - Update CV data (Candidate only)
- `DELETE /api/cv` - Delete CV (Candidate only)
- `POST /api/cv/reprocess` - Reprocess CV with AI (Candidate only)

#### Messages & Chat
- `GET /api/messages/conversations` - Get conversations
- `GET /api/messages/conversations/:id` - Get conversation messages
- `POST /api/messages` - Send message
- `PATCH /api/messages/:id/read` - Mark message as read
- `POST /api/messages/:id/reactions` - Add reaction
- `DELETE /api/messages/:id` - Delete message
- `DELETE /api/messages/conversations/:id` - Delete conversation
- `GET /api/messages/unread` - Get unread count
- `GET /api/messages/stats` - Get messaging stats

#### Admin
- `GET /api/admin/dashboard/stats` - Dashboard statistics
- `GET /api/admin/users` - User management
- `GET /api/admin/jobs` - Job management
- `GET /api/admin/applications` - Application management
- `GET /api/admin/reports` - System reports

## Usage Examples

### User Registration

```javascript
const response = await fetch('http://localhost:3001/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'candidate'
  })
});

const data = await response.json();
console.log(data);
```

### Login

```javascript
const response = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'password123'
  })
});

const { token, refreshToken, user } = await response.json();
```

### Create Job Posting

```javascript
const response = await fetch('http://localhost:3001/api/jobs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    title: 'Senior React Developer',
    description: 'Looking for experienced React developer...',
    requirements: '5+ years of React experience...',
    skills: ['React', 'JavaScript', 'TypeScript'],
    location: 'Ho Chi Minh City',
    type: 'full-time',
    experienceLevel: 'senior',
    salaryMin: 20000000,
    salaryMax: 30000000,
    currency: 'VND',
    deadline: '2024-02-15'
  })
});

const job = await response.json();
```

### Upload CV

```javascript
const formData = new FormData();
formData.append('cv', cvFile);

const response = await fetch('http://localhost:3001/api/cv/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { cvUrl, cvParsed } = await response.json();
```

## Real-time Chat

### Socket.IO Events

#### Client Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to chat server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from chat server');
});
```

#### Join Room
```javascript
// Join conversation room
socket.emit('joinRoom', {
  roomId: 'conversation-123'
});

socket.on('roomJoined', (data) => {
  console.log('Joined room:', data);
});
```

#### Send Message
```javascript
socket.emit('sendMessage', {
  roomId: 'conversation-123',
  content: 'Hello, how are you?'
});
```

#### Receive Message
```javascript
socket.on('newMessage', (message) => {
  console.log('New message:', message);
  // Update UI with new message
});
```

#### Typing Indicators
```javascript
// Send typing indicator
socket.emit('typing', {
  roomId: 'conversation-123',
  isTyping: true
});

// Receive typing indicator
socket.on('userTyping', (data) => {
  console.log('User is typing:', data);
});
```

## Database Schema

### User Model
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String, // hashed
  role: String, // 'candidate', 'employer', 'admin'
  isActive: Boolean,
  isVerified: Boolean,
  profile: {
    phone: String,
    location: String,
    bio: String,
    avatar: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Job Model
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  requirements: String,
  skills: [String],
  location: String,
  type: String, // 'full-time', 'part-time', 'contract', 'remote'
  experienceLevel: String, // 'entry', 'mid', 'senior'
  salary: {
    min: Number,
    max: Number,
    currency: String
  },
  employer: ObjectId, // ref: User
  status: String, // 'pending', 'approved', 'rejected', 'closed'
  deadline: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Application Model
```javascript
{
  _id: ObjectId,
  candidate: ObjectId, // ref: User
  job: ObjectId, // ref: Job
  status: String, // 'pending', 'reviewing', 'accepted', 'rejected'
  cvUrl: String,
  coverLetter: String,
  notes: String,
  interview: {
    scheduledAt: Date,
    location: String,
    type: String // 'phone', 'video', 'in-person'
  },
  attachments: [String],
  createdAt: Date,
  updatedAt: Date
}
```

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/auth.test.js

# Run tests in watch mode
npm run test:watch
```

## Monitoring

### Health Check

```bash
curl http://localhost:3001/api/health
```

### Logs

```bash
# Development logs
npm run dev

# Production logs (PM2)
pm2 logs

# Docker logs
docker logs job-backend
```

### Performance Monitoring

```bash
# Enable performance monitoring
export NODE_ENV=production

# Use monitoring tools like PM2
pm2 monit
```

## Security

### Authentication
- JWT tokens with expiration
- Refresh token mechanism
- Password hashing with bcrypt
- Rate limiting on auth endpoints

### Data Validation
- Input sanitization with Joi
- SQL injection prevention
- XSS protection

### File Upload
- File type validation
- Size limits
- Virus scanning (optional)

### Rate Limiting
- API endpoint rate limiting
- IP-based blocking
- Request throttling

## Deployment

### Environment Setup

1. **Production Environment Variables**
```env
NODE_ENV=production
PORT=3001
MONGODB_URI=mongodb://user:pass@host:port/db
# ... other production variables
```

2. **Database Setup**
```bash
# Create database user
mongo
use job-matching
db.createUser({
  user: "app_user",
  pwd: "secure_password",
  roles: ["readWrite"]
})
```

3. **Process Manager**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'job-backend',
    script: './server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
```

### Docker Deployment

```bash
# Build production image
docker build -t job-backend:prod .

# Run with environment file
docker run -d \
  --name job-backend-prod \
  -p 3001:3001 \
  --env-file .env.production \
  job-backend:prod
```

### Cloud Deployment

#### AWS EC2
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and deploy
git clone <repository>
cd job-backend
npm install --production
pm2 start ecosystem.config.js
```

#### Heroku
```bash
# Install Heroku CLI
npm install -g heroku

# Create app
heroku create

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI=your-mongodb-uri

# Deploy
git push heroku main
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   ```bash
   # Check MongoDB status
   sudo systemctl status mongod
   
   # Check connection string
   mongo mongodb://localhost:27017/job-matching
   ```

2. **JWT Token Not Working**
   ```bash
   # Check JWT secrets
   echo $JWT_SECRET
   
   # Verify token payload
   node -e "console.log(require('jsonwebtoken').decode('your-token'))"
   ```

3. **File Upload Not Working**
   ```bash
   # Check Cloudinary credentials
   echo $CLOUDINARY_CLOUD_NAME
   
   # Test file size limit
   echo $MAX_FILE_SIZE
   ```

4. **Socket.IO Connection Issues**
   ```bash
   # Check CORS settings
   echo $CORS_ORIGIN
   
   # Verify port accessibility
   telnet localhost 3001
   ```

### Debug Mode

Enable debug logging:
```bash
export DEBUG=app:*
npm run dev
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions:
- Create an issue in the repository
- Check the API documentation at `/api/docs`
- Review the troubleshooting section above

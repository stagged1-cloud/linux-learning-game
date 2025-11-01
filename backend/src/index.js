require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.MAX_REQUESTS_PER_MINUTE || 100,
});
app.use('/api/', limiter);

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Linux Learning Game API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const levelRoutes = require('./routes/levels');
const exerciseRoutes = require('./routes/exercises');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/exercises', exerciseRoutes);

// WebSocket handling for terminal
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('command', async (data) => {
    const { command, exerciseId } = data;
    console.log('Command received:', command);

    try {
      // TODO: Execute command in sandbox container
      // TODO: Validate against exercise rules
      // For now, send mock response
      
      socket.emit('output', `$ ${command}\r\n`);
      
      // Mock validation
      const isCorrect = command.trim() === 'pwd';
      socket.emit('command-result', {
        isCorrect,
        message: isCorrect 
          ? 'Correct! You used the pwd command.' 
          : 'Try using the pwd command to print your current directory.',
      });
      
    } catch (error) {
      console.error('Error executing command:', error);
      socket.emit('output', 'Error executing command\r\n');
    }
  });

  socket.on('resize', (data) => {
    const { cols, rows } = data;
    console.log('Terminal resized:', cols, rows);
    // TODO: Resize sandbox terminal
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

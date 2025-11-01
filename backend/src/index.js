require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { validateCommand, saveAttempt, updateProgress } = require('./services/commandValidator');

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

// Store user-exercise mapping for WebSocket
const userSessions = new Map();

// WebSocket handling for terminal
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Store user info when they connect
  socket.on('authenticate', (data) => {
    const { userId, levelId } = data;
    userSessions.set(socket.id, { userId, levelId });
    socket.emit('authenticated', { message: 'Connected to game server' });
  });

  socket.on('command', async (data) => {
    const { command, exerciseId } = data;
    const session = userSessions.get(socket.id);
    
    if (!session) {
      socket.emit('error', 'Not authenticated');
      return;
    }

    console.log(`[${session.userId}] Command: ${command} (Exercise: ${exerciseId})`);

    try {
      // Echo the command to terminal
      socket.emit('output', `$ ${command}\r\n`);
      
      // For now, we're doing client-side validation since we don't have a real sandbox
      // In a real scenario, you'd execute this in a Docker container
      // For MVP, we'll validate based on exercise definition
      
      // Parse exercise definition from exercises JSON files
      // This is a simplified validation - in production you'd load from DB
      
      const exerciseDefinition = getExerciseDefinition(exerciseId);
      if (!exerciseDefinition) {
        socket.emit('output', 'Error: Exercise not found\r\n');
        return;
      }

      // Validate the command
      const validation = await validateCommand(command, exerciseDefinition);
      
      // Save the attempt
      await saveAttempt(session.userId, exerciseId, command, validation.isCorrect);

      // Emit validation result
      socket.emit('command-result', {
        isCorrect: validation.isCorrect,
        message: validation.feedback,
        pointsEarned: validation.isCorrect ? exerciseDefinition.points : 0,
      });

      // If correct, update user progress
      if (validation.isCorrect) {
        const isNewCompletion = await updateProgress(
          session.userId,
          exerciseId,
          exerciseDefinition.points
        );
        
        if (isNewCompletion) {
          socket.emit('exercise-completed', {
            pointsEarned: exerciseDefinition.points,
            message: '🎉 Exercise Completed!',
          });
        }
      }
      
    } catch (error) {
      console.error('Error executing command:', error);
      socket.emit('error', `Error: ${error.message}`);
      socket.emit('output', 'Error executing command\r\n');
    }
  });

  socket.on('resize', (data) => {
    const { cols, rows } = data;
    console.log('Terminal resized:', cols, rows);
    // TODO: Resize sandbox terminal
  });

  socket.on('disconnect', () => {
    userSessions.delete(socket.id);
    console.log('Client disconnected:', socket.id);
  });
});

/**
 * Get exercise definition from JSON files
 * This is a temporary solution - in production, load from database
 */
function getExerciseDefinition(exerciseId) {
  // Parse exerciseId format: "level_X_exercise_Y"
  const match = exerciseId.match(/level_(\d+)_exercise_(\d+)/);
  if (!match) return null;

  const [, levelNum, exerciseNum] = match;
  
  // In a real app, load from DB or cache
  // For now, return a generic exercise structure
  const mockExercises = {
    'level_1_exercise_1': {
      title: 'Where Am I?',
      description: 'Print your current working directory',
      solution: 'pwd',
      points: 10,
      validationRules: { command: 'pwd' },
      hints: ['Use the pwd command', 'Type: pwd'],
    },
    'level_1_exercise_2': {
      title: 'List Files',
      description: 'List files in your directory',
      solution: 'ls',
      points: 10,
      validationRules: { expectedBehavior: 'lists_files' },
      hints: ['Use the ls command'],
    },
  };

  return mockExercises[exerciseId];
}

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

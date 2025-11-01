require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const { validateCommand, saveAttempt, updateProgress } = require('./services/commandValidator');
const sandboxExecutor = require('./services/sandboxExecutor');
const sessionManager = require('./services/sessionManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    sessions: sessionManager.getStats()
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const levelRoutes = require('./routes/levels');
const exerciseRoutes = require('./routes/exercises');
const progressRoutes = require('./routes/progress');

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/levels', levelRoutes);
app.use('/api/exercises', exerciseRoutes);
app.use('/api/progress', progressRoutes);

// Initialize session cleanup
sessionManager.initializeCleanupInterval();

// WebSocket handling for terminal
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Log all events for debugging
  socket.onAny((event, ...args) => {
    console.log(`Socket ${socket.id} event: ${event}`, args);
  });

  /**
   * Authenticate user and create session
   */
   socket.on('authenticate', async (data) => {
     console.log('Authenticate event received, keys:', Object.keys(data));
     console.log('Data:', JSON.stringify(data, null, 2));
     const { userId, levelId, exerciseId, containerId } = data;

     if (!userId || !containerId) {
       console.log('Missing auth data:', { userId, containerId });
       socket.emit('error', { message: 'Missing required authentication data' });
       return;
     }

     try {
       const session = await sessionManager.createSession(socket.id, {
         userId,
         levelId,
         exerciseId,
         containerId
       });

       socket.emit('authenticated', {
         message: 'Connected to game server',
         sessionId: socket.id,
         workDir: session.workDir
       });

       console.log(`User ${userId} authenticated on socket ${socket.id}`);
     } catch (error) {
       console.error('Authentication error:', error);
       socket.emit('error', { message: 'Failed to create session: ' + error.message });
     }
   });

  /**
   * Handle command execution
   */
  socket.on('command', async (data) => {
    console.log(`Command event received on socket ${socket.id}, data:`, data);
    const { command, exerciseId } = data;
    const session = sessionManager.getSession(socket.id);
    console.log(`Session lookup for ${socket.id}:`, session ? 'FOUND' : 'NOT FOUND');

    if (!session) {
      console.log(`ERROR: No session found for socket ${socket.id}`);
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    if (!command || typeof command !== 'string') {
      socket.emit('error', { message: 'Invalid command' });
      return;
    }

    const trimmedCommand = command.trim();
    console.log(`[${session.userId}] Command: ${trimmedCommand} (Exercise: ${exerciseId})`);

    try {
      // Validate command safety
      const safetyCheck = sandboxExecutor.validateCommandSafety(trimmedCommand);
      if (!safetyCheck.valid) {
        socket.emit('output', `$ ${trimmedCommand}\r\n`);
        socket.emit('output', `bash: ${safetyCheck.reason}\r\n`);
        socket.emit('command-result', {
          isCorrect: false,
          message: safetyCheck.reason,
          pointsEarned: 0,
          exitCode: -1
        });
        return;
      }

      // Echo the command
      socket.emit('output', `$ ${trimmedCommand}\r\n`);

      // Execute command in sandbox
      let executionResult;
      
      if (trimmedCommand.startsWith('cd ') || trimmedCommand === 'cd') {
        executionResult = await sandboxExecutor.executeInDirectory(
          session.containerId,
          trimmedCommand,
          session.workDir
        );

        // Update working directory if cd was successful
        if (executionResult.success && executionResult.newWorkDir) {
          sessionManager.updateWorkDir(socket.id, executionResult.newWorkDir);
          socket.emit('workdir-changed', { workDir: executionResult.newWorkDir });
        } else if (executionResult.stderr) {
          socket.emit('output', executionResult.stderr + '\r\n');
        }
      } else {
        // Execute normal command
        executionResult = await sandboxExecutor.executeInDirectory(
          session.containerId,
          trimmedCommand,
          session.workDir
        );

        // Send output to client
        if (executionResult.stdout) {
          socket.emit('output', executionResult.stdout + '\r\n');
        }
        if (executionResult.stderr && !executionResult.success) {
          socket.emit('output', `bash: ${executionResult.stderr}\r\n`);
        }
      }

      // Track attempt
      const attemptCount = sessionManager.incrementAttempt(socket.id);
      sessionManager.addCommandHistory(socket.id, trimmedCommand, executionResult);

      // Get exercise definition for validation
      const exercise = await getExerciseFromDB(exerciseId);
      if (!exercise) {
        socket.emit('error', { message: 'Exercise not found' });
        return;
      }

      // Validate command against exercise rules
      const validation = await validateCommand(trimmedCommand, exercise, {
        exitCode: executionResult.exitCode,
        stdout: executionResult.stdout,
        stderr: executionResult.stderr
      });

      // Save attempt to database
      await saveAttempt(session.userId, exerciseId, trimmedCommand, validation.isCorrect, {
        output: executionResult.stdout,
        error: executionResult.stderr,
        exitCode: executionResult.exitCode
      });

      // Emit command result
      socket.emit('command-result', {
        isCorrect: validation.isCorrect,
        message: validation.feedback,
        pointsEarned: validation.isCorrect ? exercise.points : 0,
        attempt: attemptCount,
        exitCode: executionResult.exitCode
      });

      // If correct, update progress
      if (validation.isCorrect) {
        const isNewCompletion = await updateProgress(
          session.userId,
          exerciseId,
          exercise.points,
          {
            hints_used: sessionManager.getSessionSummary(socket.id).hintUsed ? 1 : 0
          }
        );

        if (isNewCompletion) {
          socket.emit('exercise-completed', {
            pointsEarned: exercise.points,
            message: '🎉 Exercise Completed!',
            totalPoints: await getUserTotalPoints(session.userId)
          });
        }
      }

    } catch (error) {
      console.error('Error executing command:', error);
      socket.emit('error', { message: `Error: ${error.message}` });
      socket.emit('output', `bash: error: ${error.message}\r\n`);
    }
  });

  /**
   * Handle terminal resize
   */
  socket.on('resize', (data) => {
    const { cols, rows } = data;
    const session = sessionManager.getSession(socket.id);
    
    if (session) {
      console.log(`Terminal resized for ${session.userId}: ${cols}x${rows}`);
      // Future: can be used to format output appropriately
    }
  });

  /**
   * Request hint for exercise
   */
  socket.on('request-hint', (data) => {
    const { exerciseId, hintIndex = 0 } = data;
    const session = sessionManager.getSession(socket.id);

    if (!session) {
      socket.emit('error', { message: 'Not authenticated' });
      return;
    }

    // Mark hint as used
    sessionManager.markHintUsed(socket.id);

    // Get hint from database (in real implementation)
    socket.emit('hint', {
      exerciseId,
      hint: `Hint ${hintIndex + 1}: Check the exercise description for clues`,
      hintIndex
    });
  });

  /**
   * Get current session info
   */
  socket.on('session-info', () => {
    const session = sessionManager.getSession(socket.id);
    
    if (session) {
      const summary = sessionManager.getSessionSummary(socket.id);
      socket.emit('session-info', summary);
    }
  });

  /**
   * Handle disconnect
   */
  socket.on('disconnect', async () => {
    const session = sessionManager.getSession(socket.id);
    if (session) {
      console.log(`Client disconnected: ${socket.id} (user: ${session.userId})`);
      // Persist any final session data
      await sessionManager.persistSession(socket.id);
    }
    
    await sessionManager.endSession(socket.id);
  });

  /**
   * Handle errors
   */
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

/**
 * Get exercise from database
 */
async function getExerciseFromDB(exerciseId) {
  try {
    const result = await pool.query(
      'SELECT * FROM exercises WHERE id = $1',
      [exerciseId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching exercise:', error);
    return null;
  }
}

/**
 * Get user total points
 */
async function getUserTotalPoints(userId) {
  try {
    const result = await pool.query(
      'SELECT total_points FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0]?.total_points || 0;
  } catch (error) {
    console.error('Error fetching user points:', error);
    return 0;
  }
}

/**
 * Enhanced saveAttempt function
 */
async function saveAttemptWithOutput(userId, exerciseId, command, isCorrect, details = {}) {
  try {
    await pool.query(
      `INSERT INTO exercise_attempts 
       (user_id, exercise_id, command_entered, is_correct, error_message, attempted_at) 
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [userId, exerciseId, command, isCorrect, details.error || null]
    );
  } catch (error) {
    console.error('Error saving attempt:', error);
    throw error;
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await sessionManager.cleanupStaleSessions();
  await pool.end();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Session cleanup interval: ${process.env.SESSION_CLEANUP_INTERVAL || 5 * 60 * 1000}ms`);
});

// Export for testing
module.exports = { app, server, io, pool };

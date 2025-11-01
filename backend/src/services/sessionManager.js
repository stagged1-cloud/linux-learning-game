/**
 * Session Manager Service
 * Manages user sessions, sandbox containers, and working directories
 */

const { Pool } = require('pg');
const sandboxExecutor = require('./sandboxExecutor');

// Sandbox configuration
const SANDBOX_HOME = '/home/student';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// In-memory session store
// Structure: socketId -> { userId, levelId, exerciseId, containerId, workDir, createdAt }
const sessionStore = new Map();

// User to session mapping for quick lookup
const userSessions = new Map(); // userId -> Set<socketId>

/**
 * Create a new session
 * @param {string} socketId - Socket.io connection ID
 * @param {object} sessionData - { userId, levelId, exerciseId, containerId }
 * @returns {Promise<object>} Session object
 */
async function createSession(socketId, sessionData) {
  const {
    userId,
    levelId,
    exerciseId,
    containerId
  } = sessionData;

  // Verify container is healthy before starting session
  const isHealthy = await sandboxExecutor.isContainerHealthy(containerId);
  if (!isHealthy) {
    throw new Error(`Container ${containerId} is not healthy`);
  }

  const session = {
    socketId,
    userId,
    levelId,
    exerciseId,
    containerId,
    workDir: SANDBOX_HOME,
    commandHistory: [],
    createdAt: Date.now(),
    lastActivity: Date.now(),
    attempt: 0,
    hintUsed: false
  };

  sessionStore.set(socketId, session);

  // Track user sessions
  if (!userSessions.has(userId)) {
    userSessions.set(userId, new Set());
  }
  userSessions.get(userId).add(socketId);

  console.log(`Session created: ${socketId} for user ${userId}`);
  return session;
}

/**
 * Get session by socket ID
 * @param {string} socketId - Socket.io connection ID
 * @returns {object|null} Session object or null
 */
function getSession(socketId) {
  const session = sessionStore.get(socketId);
  if (session) {
    session.lastActivity = Date.now();
  }
  return session || null;
}

/**
 * Get all sessions for a user
 * @param {string} userId - User ID
 * @returns {array} Array of session objects
 */
function getUserSessions(userId) {
  const socketIds = userSessions.get(userId) || new Set();
  return Array.from(socketIds)
    .map(socketId => sessionStore.get(socketId))
    .filter(s => s !== undefined);
}

/**
 * Update session working directory
 * @param {string} socketId - Socket.io connection ID
 * @param {string} newWorkDir - New working directory
 * @returns {boolean} Success
 */
function updateWorkDir(socketId, newWorkDir) {
  const session = getSession(socketId);
  if (!session) {
    return false;
  }
  session.workDir = newWorkDir;
  return true;
}

/**
 * Add command to session history
 * @param {string} socketId - Socket.io connection ID
 * @param {string} command - Command executed
 * @param {object} result - Execution result
 */
function addCommandHistory(socketId, command, result) {
  const session = getSession(socketId);
  if (!session) {
    return;
  }

  session.commandHistory.push({
    command,
    exitCode: result.exitCode,
    timestamp: Date.now(),
    success: result.success
  });

  // Keep only last 100 commands
  if (session.commandHistory.length > 100) {
    session.commandHistory.shift();
  }
}

/**
 * Increment attempt counter
 * @param {string} socketId - Socket.io connection ID
 * @returns {number} New attempt count
 */
function incrementAttempt(socketId) {
  const session = getSession(socketId);
  if (!session) {
    return 0;
  }
  return ++session.attempt;
}

/**
 * Mark hint as used
 * @param {string} socketId - Socket.io connection ID
 */
function markHintUsed(socketId) {
  const session = getSession(socketId);
  if (!session) {
    return;
  }
  session.hintUsed = true;
}

/**
 * Get session summary
 * @param {string} socketId - Socket.io connection ID
 * @returns {object} Session summary
 */
function getSessionSummary(socketId) {
  const session = getSession(socketId);
  if (!session) {
    return null;
  }

  return {
    socketId: session.socketId,
    userId: session.userId,
    levelId: session.levelId,
    exerciseId: session.exerciseId,
    workDir: session.workDir,
    attempt: session.attempt,
    hintUsed: session.hintUsed,
    commandCount: session.commandHistory.length,
    sessionDuration: Date.now() - session.createdAt,
    lastActivity: Date.now() - session.lastActivity
  };
}

/**
 * Persist session data to database
 * @param {string} socketId - Socket.io connection ID
 */
async function persistSession(socketId) {
  const session = getSession(socketId);
  if (!session) {
    return;
  }

  try {
    // Save command history (we already have the exercise_attempts table)
    for (const cmd of session.commandHistory) {
      // Only save first execution of each command
      // Additional saves would be duplicate attempts
    }

    // Could add more persistence logic here
  } catch (error) {
    console.error('Error persisting session:', error);
  }
}

/**
 * End session and cleanup
 * @param {string} socketId - Socket.io connection ID
 * @returns {Promise<void>}
 */
async function endSession(socketId) {
  const session = getSession(socketId);
  if (!session) {
    return;
  }

  try {
    // Cleanup resources
    await sandboxExecutor.cleanup(session.containerId);

    // Remove from session store
    sessionStore.delete(socketId);

    // Remove from user sessions
    const userSocketIds = userSessions.get(session.userId);
    if (userSocketIds) {
      userSocketIds.delete(socketId);
      if (userSocketIds.size === 0) {
        userSessions.delete(session.userId);
      }
    }

    console.log(`Session ended: ${socketId}`);
  } catch (error) {
    console.error('Error ending session:', error);
  }
}

/**
 * Cleanup stale sessions (older than 30 minutes)
 */
async function cleanupStaleSessions() {
  const maxAge = 30 * 60 * 1000; // 30 minutes
  const now = Date.now();

  for (const [socketId, session] of sessionStore.entries()) {
    if (now - session.lastActivity > maxAge) {
      console.log(`Cleaning up stale session: ${socketId}`);
      await endSession(socketId);
    }
  }
}

/**
 * Get session statistics
 * @returns {object} Stats
 */
function getStats() {
  return {
    activeSessions: sessionStore.size,
    activeUsers: userSessions.size,
    totalCommands: Array.from(sessionStore.values()).reduce(
      (sum, session) => sum + session.commandHistory.length,
      0
    )
  };
}

/**
 * Initialize session cleanup interval
 */
function initializeCleanupInterval() {
  const cleanupInterval = parseInt(process.env.SESSION_CLEANUP_INTERVAL) || 5 * 60 * 1000; // 5 minutes default
  
  setInterval(() => {
    cleanupStaleSessions().catch(error => {
      console.error('Error during session cleanup:', error);
    });
  }, cleanupInterval);

  console.log(`Session cleanup interval initialized: ${cleanupInterval}ms`);
}

/**
 * Reset all sessions (for testing)
 */
function resetSessions() {
  sessionStore.clear();
  userSessions.clear();
}

module.exports = {
  createSession,
  getSession,
  getUserSessions,
  updateWorkDir,
  addCommandHistory,
  incrementAttempt,
  markHintUsed,
  getSessionSummary,
  persistSession,
  endSession,
  cleanupStaleSessions,
  getStats,
  initializeCleanupInterval,
  resetSessions
};

/**
 * Command Validator Service
 * Validates user commands against exercise requirements
 */

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Validate a command against exercise rules
 * @param {string} command - The command entered by user
 * @param {object} exercise - The exercise definition from JSON
 * @param {object} executionResult - Actual execution result { stdout, stderr, exitCode }
 * @returns {object} Validation result
 */
async function validateCommand(command, exercise, executionResult = {}) {
  if (!exercise) {
    return {
      isCorrect: false,
      feedback: 'Exercise not found',
    };
  }

  const trimmedCommand = command.trim();
  // Handle both camelCase and snake_case
  const validationRules = exercise.validationRules || exercise.validation_rules;

  if (!validationRules) {
    console.error('No validation rules found for exercise:', exercise);
    return {
      isCorrect: false,
      feedback: 'No validation rules defined for this exercise',
    };
  }

  // Exact command match
  if (validationRules.command) {
    const isCorrect = trimmedCommand === validationRules.command;
    return {
      isCorrect,
      command: validationRules.command,
      feedback: isCorrect 
        ? `✓ Correct! ${exercise.description}`
        : `✗ Not quite. Expected: ${validationRules.command}`,
    };
  }

  // Pattern-based validation
  if (validationRules.pattern) {
    const regex = new RegExp(validationRules.pattern);
    const isCorrect = regex.test(trimmedCommand);
    return {
      isCorrect,
      feedback: isCorrect
        ? `✓ Correct!`
        : `✗ Command doesn't match the expected pattern`,
    };
  }

  // Behavior-based validation (simple checks)
  if (validationRules.expectedBehavior) {
    return validateBehavior(trimmedCommand, validationRules.expectedBehavior, exercise);
  }

  // Default: check if command is correct
  const isCorrect = trimmedCommand === exercise.solution;
  return {
    isCorrect,
    feedback: isCorrect 
      ? `✓ Correct!`
      : `✗ Try again. Hint: ${exercise.hints[0]}`,
  };
}

/**
 * Validate behavioral expectations (what the command should do)
 */
function validateBehavior(command, behavior, exercise) {
  const cmd = command.toLowerCase().trim();

  const behaviors = {
    lists_files: {
      keywords: ['ls'],
      check: (c) => c.includes('ls') && !c.includes('rm') && !c.includes('delete'),
    },
    shows_hidden_files: {
      keywords: ['ls', '-a'],
      check: (c) => c.includes('ls') && c.includes('-a'),
    },
    creates_file: {
      keywords: ['touch', 'echo', '>', 'cat'],
      check: (c) => /^(touch|echo|cat)/.test(c) || c.includes('>>') || c.includes('>'),
    },
    removes_file: {
      keywords: ['rm'],
      check: (c) => c.includes('rm') && !c.includes('rmdir'),
    },
    changes_directory: {
      keywords: ['cd'],
      check: (c) => c.startsWith('cd ') || c === 'cd',
    },
    shows_file_content: {
      keywords: ['cat', 'less', 'more', 'head', 'tail'],
      check: (c) => ['cat', 'less', 'more', 'head', 'tail'].some(k => c.startsWith(k)),
    },
    finds_files: {
      keywords: ['find', 'locate'],
      check: (c) => c.startsWith('find') || c.startsWith('locate'),
    },
    copies_file: {
      keywords: ['cp'],
      check: (c) => c.startsWith('cp'),
    },
    moves_file: {
      keywords: ['mv'],
      check: (c) => c.startsWith('mv'),
    },
  };

  const behaviorDef = behaviors[behavior];
  if (!behaviorDef) {
    return {
      isCorrect: false,
      feedback: 'Unknown behavior validation type',
    };
  }

  const isCorrect = behaviorDef.check(cmd);
  return {
    isCorrect,
    feedback: isCorrect
      ? `✓ Correct! ${exercise.title}`
      : `✗ Try a different command. Hint: ${exercise.hints[0]}`,
  };
}

/**
 * Get exercise from database
 */
async function getExercise(exerciseId) {
  try {
    const result = await pool.query(
      'SELECT * FROM exercises WHERE id = $1',
      [exerciseId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error fetching exercise:', error);
    throw error;
  }
}

/**
 * Save command execution attempt
 */
async function saveAttempt(userId, exerciseId, command, isCorrect, details = {}) {
  try {
    // Remove null bytes and other problematic characters for PostgreSQL
    const sanitize = (str) => str ? str.replace(/\0/g, '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') : null;
    
    await pool.query(
      `INSERT INTO exercise_attempts 
       (user_id, exercise_id, command_entered, command_output, command_error, 
        exit_code, is_correct, error_message, attempted_at) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)`,
      [
        userId, 
        exerciseId, 
        sanitize(command), 
        sanitize(details.output),
        sanitize(details.error),
        details.exitCode || null,
        isCorrect,
        sanitize(details.errorMessage)
      ]
    );
  } catch (error) {
    console.error('Error saving attempt:', error);
    throw error;
  }
}

/**
 * Update user progress for a completed exercise
 */
async function updateProgress(userId, exerciseId, pointsEarned, details = {}) {
  try {
    // Get exercise details
    const exercise = await pool.query(
      'SELECT level_id FROM exercises WHERE id = $1',
      [exerciseId]
    );

    if (exercise.rows.length === 0) {
      throw new Error('Exercise not found');
    }

    const levelId = exercise.rows[0].level_id;

    // Check if already completed
    const existing = await pool.query(
      'SELECT * FROM user_progress WHERE user_id = $1 AND exercise_id = $2',
      [userId, exerciseId]
    );

    if (existing.rows.length === 0) {
      // New completion
      await pool.query(
        `INSERT INTO user_progress 
         (user_id, level_id, exercise_id, is_completed, attempts, completed_at, points_earned, hints_used) 
         VALUES ($1, $2, $3, true, 1, CURRENT_TIMESTAMP, $4, $5)`,
        [userId, levelId, exerciseId, pointsEarned, details.hints_used || 0]
      );
    } else if (!existing.rows[0].is_completed) {
      // Mark as completed
      await pool.query(
        `UPDATE user_progress 
         SET is_completed = true, completed_at = CURRENT_TIMESTAMP, 
             points_earned = $1, attempts = attempts + 1, hints_used = $3
         WHERE user_id = $2 AND exercise_id = $4`,
        [pointsEarned, userId, details.hints_used || 0, exerciseId]
      );
    } else {
      // Already completed, just increment attempts
      await pool.query(
        `UPDATE user_progress 
         SET attempts = attempts + 1 
         WHERE user_id = $1 AND exercise_id = $2`,
        [userId, exerciseId]
      );
      return false; // Not a new completion
    }

    // Update user total points
    await pool.query(
      'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
      [pointsEarned, userId]
    );

    return true; // New completion
  } catch (error) {
    console.error('Error updating progress:', error);
    throw error;
  }
}

module.exports = {
  validateCommand,
  getExercise,
  saveAttempt,
  updateProgress,
};

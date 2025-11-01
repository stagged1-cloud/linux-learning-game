const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const authMiddleware = require('../middleware/auth');
const { getHint, getExplanation } = require('../services/groqAI');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Submit exercise attempt
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const { exerciseId, command, isCorrect } = req.body;

    // Record attempt
    await pool.query(
      'INSERT INTO exercise_attempts (user_id, exercise_id, command_entered, is_correct) VALUES ($1, $2, $3, $4)',
      [req.userId, exerciseId, command, isCorrect]
    );

    if (isCorrect) {
      // Check if already completed
      const existingProgress = await pool.query(
        'SELECT * FROM user_progress WHERE user_id = $1 AND exercise_id = $2',
        [req.userId, exerciseId]
      );

      if (existingProgress.rows.length === 0 || !existingProgress.rows[0].is_completed) {
        // Get exercise details
        const exerciseResult = await pool.query(
          'SELECT points, level_id FROM exercises WHERE id = $1',
          [exerciseId]
        );

        const exercise = exerciseResult.rows[0];

        // Update or create progress
        if (existingProgress.rows.length === 0) {
          await pool.query(
            `INSERT INTO user_progress 
            (user_id, level_id, exercise_id, is_completed, attempts, completed_at, points_earned) 
            VALUES ($1, $2, $3, true, 1, CURRENT_TIMESTAMP, $4)`,
            [req.userId, exercise.level_id, exerciseId, exercise.points]
          );
        } else {
          await pool.query(
            `UPDATE user_progress 
            SET is_completed = true, completed_at = CURRENT_TIMESTAMP, 
                points_earned = $1, attempts = attempts + 1 
            WHERE user_id = $2 AND exercise_id = $3`,
            [exercise.points, req.userId, exerciseId]
          );
        }

        // Update user total points
        await pool.query(
          'UPDATE users SET total_points = total_points + $1 WHERE id = $2',
          [exercise.points, req.userId]
        );

        res.json({ 
          success: true, 
          message: 'Exercise completed!', 
          pointsEarned: exercise.points 
        });
      } else {
        res.json({ 
          success: true, 
          message: 'Already completed this exercise' 
        });
      }
    } else {
      // Just increment attempts
      const existingProgress = await pool.query(
        'SELECT * FROM user_progress WHERE user_id = $1 AND exercise_id = $2',
        [req.userId, exerciseId]
      );

      if (existingProgress.rows.length > 0) {
        await pool.query(
          'UPDATE user_progress SET attempts = attempts + 1 WHERE user_id = $1 AND exercise_id = $2',
          [req.userId, exerciseId]
        );
      }

      res.json({ success: false, message: 'Incorrect. Try again!' });
    }
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get static hints (fallback)
router.get('/:exerciseId/hints', authMiddleware, async (req, res) => {
  try {
    const { exerciseId } = req.params;

    const result = await pool.query(
      'SELECT hints FROM exercises WHERE id = $1',
      [exerciseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Exercise not found' });
    }

    const hints = result.rows[0].hints || [];
    
    // Track hint usage
    await pool.query(
      `INSERT INTO user_progress (user_id, exercise_id, hints_used, level_id) 
       VALUES ($1, $2, 1, (SELECT level_id FROM exercises WHERE id = $2))
       ON CONFLICT (user_id, exercise_id) 
       DO UPDATE SET hints_used = user_progress.hints_used + 1`,
      [req.userId, exerciseId]
    );

    res.json({ hints });
  } catch (error) {
    console.error('Hint fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get AI hint from Groq
router.get('/:exerciseId/ai-hint', authMiddleware, async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const { userCommand } = req.query;

    // In a real app, you'd load this from the database
    // For now, create a mock exercise
    const exercise = {
      title: 'Exercise ' + exerciseId,
      description: 'Complete the Linux exercise',
      solution: 'pwd',
      hints: ['Try using pwd'],
    };

    const aiHint = await getHint(exercise, userCommand);

    // Track hint usage
    await pool.query(
      `INSERT INTO user_progress (user_id, exercise_id, hints_used, level_id) 
       VALUES ($1, $2, 1, (SELECT level_id FROM exercises WHERE id = $2))
       ON CONFLICT (user_id, exercise_id) 
       DO UPDATE SET hints_used = user_progress.hints_used + 1`,
      [req.userId, exerciseId]
    );

    res.json({ hint: aiHint });
  } catch (error) {
    console.error('AI hint fetch error:', error);
    // Fallback to static hint
    res.json({ hint: 'Try a different approach!' });
  }
});

// Get explanation for exercise
router.get('/:exerciseId/explanation', authMiddleware, async (req, res) => {
  try {
    const { exerciseId } = req.params;

    const exercise = {
      title: 'Exercise ' + exerciseId,
      description: 'Complete the Linux exercise',
      solution: 'pwd',
    };

    const explanation = await getExplanation(exercise);
    res.json({ explanation });
  } catch (error) {
    console.error('Explanation fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

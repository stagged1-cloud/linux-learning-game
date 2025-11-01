const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = require('jsonwebtoken').verify(
      token,
      process.env.JWT_SECRET || 'secret'
    );
    req.userId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * GET /api/progress/user
 * Get user statistics and overall progress
 */
router.get('/user', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    // Get user info
    const userResult = await pool.query(
      `SELECT id, username, email, total_points, current_level, created_at, last_login
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Get levels completed
    const levelsCompletedResult = await pool.query(
      `SELECT COUNT(DISTINCT level_id) as count
       FROM user_progress 
       WHERE user_id = $1 AND is_completed = true`,
      [userId]
    );
    const levelsCompleted = levelsCompletedResult.rows[0].count;

    // Get exercises completed
    const exercisesCompletedResult = await pool.query(
      `SELECT COUNT(DISTINCT exercise_id) as count
       FROM user_progress 
       WHERE user_id = $1 AND is_completed = true`,
      [userId]
    );
    const exercisesCompleted = exercisesCompletedResult.rows[0].count;

    // Get total time spent (in seconds)
    const timeSpentResult = await pool.query(
      `SELECT COALESCE(SUM(time_spent_seconds), 0) as total
       FROM user_progress 
       WHERE user_id = $1`,
      [userId]
    );
    const timeSpentSeconds = timeSpentResult.rows[0].total;

    // Get leaderboard rank
    const rankResult = await pool.query(
      `SELECT rank FROM leaderboard WHERE id = $1`,
      [userId]
    );
    const leaderboardRank = rankResult.rows.length > 0 ? rankResult.rows[0].rank : null;

    // Get average attempts per exercise
    const avgAttemptsResult = await pool.query(
      `SELECT AVG(attempts) as avg_attempts
       FROM user_progress 
       WHERE user_id = $1 AND is_completed = true`,
      [userId]
    );
    const avgAttemptsPerExercise = avgAttemptsResult.rows[0].avg_attempts || 0;

    // Get total hints used
    const hintsUsedResult = await pool.query(
      `SELECT COALESCE(SUM(hints_used), 0) as total
       FROM user_progress 
       WHERE user_id = $1`,
      [userId]
    );
    const hintsUsed = hintsUsedResult.rows[0].total;

    // Get perfect scores (completed without hints)
    const perfectScoresResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM user_progress 
       WHERE user_id = $1 AND is_completed = true AND hints_used = 0`,
      [userId]
    );
    const perfectScores = perfectScoresResult.rows[0].count;

    // Calculate success rate
    const totalAttemptsResult = await pool.query(
      `SELECT COUNT(*) as total_exercises
       FROM user_progress 
       WHERE user_id = $1`,
      [userId]
    );
    const totalExercises = totalAttemptsResult.rows[0].total_exercises;
    const successRate = totalExercises > 0 
      ? Math.round((exercisesCompleted / totalExercises) * 100)
      : 0;

    // Calculate current streak
    const streakResult = await pool.query(
      `SELECT COUNT(DISTINCT DATE(completed_at)) as streak
       FROM user_progress 
       WHERE user_id = $1 
       AND completed_at >= NOW() - INTERVAL '30 days'
       AND is_completed = true
       GROUP BY user_id`,
      [userId]
    );
    const currentStreak = streakResult.rows.length > 0 ? streakResult.rows[0].streak : 0;

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      totalPoints: user.total_points,
      currentLevel: user.current_level,
      createdAt: user.created_at,
      lastLogin: user.last_login,
      levelsCompleted: parseInt(levelsCompleted),
      exercisesCompleted: parseInt(exercisesCompleted),
      timeSpentSeconds: parseInt(timeSpentSeconds),
      leaderboardRank,
      avgAttemptsPerExercise: parseFloat(avgAttemptsPerExercise.toFixed(1)),
      hintsUsed: parseInt(hintsUsed),
      perfectScores: parseInt(perfectScores),
      successRate,
      currentStreak: parseInt(currentStreak),
    });
  } catch (err) {
    console.error('Error fetching user stats:', err);
    res.status(500).json({ error: 'Failed to fetch user stats' });
  }
});

/**
 * GET /api/progress/levels
 * Get progress for each level
 */
router.get('/levels', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT 
         l.id,
         l.level_number,
         l.title,
         COUNT(e.id) as total_exercises,
         COUNT(CASE WHEN up.is_completed = true THEN 1 END) as exercises_completed
       FROM levels l
       LEFT JOIN exercises e ON l.id = e.level_id
       LEFT JOIN user_progress up ON e.id = up.exercise_id AND up.user_id = $1
       WHERE l.is_published = true
       GROUP BY l.id, l.level_number, l.title
       ORDER BY l.level_number ASC`,
      [userId]
    );

    const levelProgress = result.rows.map(row => ({
      id: row.id,
      levelNumber: row.level_number,
      title: row.title,
      totalExercises: parseInt(row.total_exercises),
      exercisesCompleted: parseInt(row.exercises_completed),
    }));

    res.json(levelProgress);
  } catch (err) {
    console.error('Error fetching level progress:', err);
    res.status(500).json({ error: 'Failed to fetch level progress' });
  }
});

/**
 * GET /api/progress/achievements/all
 * Get all available achievements
 */
router.get('/achievements/all', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, icon, criteria, points
       FROM achievements
       ORDER BY id ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching achievements:', err);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

/**
 * GET /api/progress/achievements
 * Get user's earned achievements
 */
router.get('/achievements', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT a.id, a.name, a.description, a.icon, a.criteria, a.points, ua.earned_at
       FROM user_achievements ua
       JOIN achievements a ON ua.achievement_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.earned_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching user achievements:', err);
    res.status(500).json({ error: 'Failed to fetch user achievements' });
  }
});

/**
 * GET /api/progress/recent-activity
 * Get user's recent completed exercises
 */
router.get('/recent-activity', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const limit = req.query.limit || 10;

    const result = await pool.query(
      `SELECT 
         e.title as exercise_title,
         l.level_number,
         up.points_earned,
         up.completed_at
       FROM user_progress up
       JOIN exercises e ON up.exercise_id = e.id
       JOIN levels l ON e.level_id = l.id
       WHERE up.user_id = $1 AND up.is_completed = true
       ORDER BY up.completed_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    const recentActivity = result.rows.map(row => ({
      exerciseTitle: row.exercise_title,
      levelNumber: row.level_number,
      pointsEarned: row.points_earned,
      completedAt: row.completed_at,
    }));

    res.json(recentActivity);
  } catch (err) {
    console.error('Error fetching recent activity:', err);
    res.status(500).json({ error: 'Failed to fetch recent activity' });
  }
});

/**
 * GET /api/progress/leaderboard
 * Get leaderboard data
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = req.query.limit || 100;

    const result = await pool.query(
      `SELECT rank, username, total_points, current_level, exercises_completed
       FROM leaderboard
       LIMIT $1`,
      [limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching leaderboard:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * POST /api/progress/achievement
 * Award an achievement to a user
 */
router.post('/achievement', verifyToken, async (req, res) => {
  try {
    const { achievementId } = req.body;
    const userId = req.userId;

    // Check if already earned
    const existingResult = await pool.query(
      `SELECT id FROM user_achievements 
       WHERE user_id = $1 AND achievement_id = $2`,
      [userId, achievementId]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Achievement already earned' });
    }

    // Insert new achievement
    const result = await pool.query(
      `INSERT INTO user_achievements (user_id, achievement_id)
       VALUES ($1, $2)
       RETURNING id, earned_at`,
      [userId, achievementId]
    );

    // Get achievement details
    const achievementResult = await pool.query(
      `SELECT points FROM achievements WHERE id = $1`,
      [achievementId]
    );

    if (achievementResult.rows.length > 0) {
      const points = achievementResult.rows[0].points;

      // Update user's total points
      await pool.query(
        `UPDATE users 
         SET total_points = total_points + $1
         WHERE id = $2`,
        [points, userId]
      );
    }

    res.json({
      success: true,
      achievementId,
      earnedAt: result.rows[0].earned_at,
    });
  } catch (err) {
    console.error('Error awarding achievement:', err);
    res.status(500).json({ error: 'Failed to award achievement' });
  }
});

/**
 * POST /api/progress/level-complete
 * Mark a level as completed and check for achievements
 */
router.post('/level-complete', verifyToken, async (req, res) => {
  try {
    const { levelId } = req.body;
    const userId = req.userId;

    // Get level number
    const levelResult = await pool.query(
      `SELECT level_number FROM levels WHERE id = $1`,
      [levelId]
    );

    if (levelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Level not found' });
    }

    const levelNumber = levelResult.rows[0].level_number;

    // Update user's current level
    await pool.query(
      `UPDATE users 
       SET current_level = GREATEST(current_level, $1)
       WHERE id = $2`,
      [levelNumber + 1, userId]
    );

    // Check for level-based achievements
    const achievementsToCheck = [];

    if (levelNumber >= 10 && levelNumber < 11) {
      achievementsToCheck.push(1); // Beginner
    } else if (levelNumber >= 20 && levelNumber < 21) {
      achievementsToCheck.push(2); // Intermediate
    } else if (levelNumber >= 30 && levelNumber < 31) {
      achievementsToCheck.push(3); // Advanced
    } else if (levelNumber >= 40 && levelNumber < 41) {
      achievementsToCheck.push(4); // Professional
    } else if (levelNumber >= 50) {
      achievementsToCheck.push(5); // Expert
    }

    const earnedAchievements = [];

    // Award applicable achievements
    for (const achievementId of achievementsToCheck) {
      const existingResult = await pool.query(
        `SELECT id FROM user_achievements 
         WHERE user_id = $1 AND achievement_id = $2`,
        [userId, achievementId]
      );

      if (existingResult.rows.length === 0) {
        await pool.query(
          `INSERT INTO user_achievements (user_id, achievement_id)
           VALUES ($1, $2)`,
          [userId, achievementId]
        );
        earnedAchievements.push(achievementId);
      }
    }

    res.json({
      success: true,
      earnedAchievements,
    });
  } catch (err) {
    console.error('Error marking level as complete:', err);
    res.status(500).json({ error: 'Failed to mark level as complete' });
  }
});

/**
 * POST /api/progress/check-achievements
 * Check and award achievements based on user progress
 */
router.post('/check-achievements', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const earnedAchievements = [];

    // Get user progress stats
    const statsResult = await pool.query(
      `SELECT 
         (SELECT COUNT(DISTINCT level_id) FROM user_progress WHERE user_id = $1 AND is_completed = true) as levels_completed,
         (SELECT COUNT(DISTINCT exercise_id) FROM user_progress WHERE user_id = $1 AND is_completed = true) as exercises_completed,
         (SELECT COUNT(*) FROM user_progress WHERE user_id = $1 AND is_completed = true AND hints_used = 0) as no_hint_completions,
         (SELECT MAX(attempts) FROM user_progress WHERE user_id = $1 AND is_completed = true) as max_attempts
       FROM users WHERE id = $1`,
      [userId]
    );

    if (statsResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const stats = statsResult.rows[0];

    // Achievement definitions
    const achievementsToCheck = [
      { id: 0, name: 'First Steps', condition: stats.exercises_completed >= 1 },
      { id: 1, name: 'Beginner', condition: stats.levels_completed >= 10 },
      { id: 2, name: 'Intermediate', condition: stats.levels_completed >= 20 },
      { id: 3, name: 'Advanced', condition: stats.levels_completed >= 30 },
      { id: 4, name: 'Professional', condition: stats.levels_completed >= 40 },
      { id: 5, name: 'Expert', condition: stats.levels_completed >= 50 },
      { id: 6, name: 'No Hints Needed', condition: stats.no_hint_completions >= 20 },
      { id: 7, name: 'Persistent', condition: stats.max_attempts >= 10 },
    ];

    // Check each achievement
    for (const achievement of achievementsToCheck) {
      if (achievement.condition) {
        const existingResult = await pool.query(
          `SELECT id FROM user_achievements 
           WHERE user_id = $1 AND achievement_id = $2`,
          [userId, achievement.id]
        );

        if (existingResult.rows.length === 0) {
          await pool.query(
            `INSERT INTO user_achievements (user_id, achievement_id)
             VALUES ($1, $2)`,
            [userId, achievement.id]
          );
          earnedAchievements.push(achievement.id);
        }
      }
    }

    res.json({
      success: true,
      earnedAchievements,
    });
  } catch (err) {
    console.error('Error checking achievements:', err);
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

module.exports = router;

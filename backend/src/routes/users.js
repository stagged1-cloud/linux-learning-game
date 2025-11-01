const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const authMiddleware = require('../middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, total_points, current_level, created_at FROM users WHERE id = $1',
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user progress
router.get('/progress', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        up.*,
        e.title as exercise_title,
        l.level_number,
        l.title as level_title
      FROM user_progress up
      JOIN exercises e ON up.exercise_id = e.id
      JOIN levels l ON up.level_id = l.id
      WHERE up.user_id = $1
      ORDER BY l.level_number, e.exercise_number`,
      [req.userId]
    );

    res.json({ progress: result.rows });
  } catch (error) {
    console.error('Progress fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM leaderboard LIMIT 100'
    );

    res.json({ leaderboard: result.rows });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

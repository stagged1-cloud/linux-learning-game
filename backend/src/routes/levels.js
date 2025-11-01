const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Get all levels
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM levels WHERE is_published = true ORDER BY level_number'
    );

    res.json({ levels: result.rows });
  } catch (error) {
    console.error('Levels fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single level
router.get('/:levelNumber', async (req, res) => {
  try {
    const { levelNumber } = req.params;

    const result = await pool.query(
      'SELECT * FROM levels WHERE level_number = $1 AND is_published = true',
      [levelNumber]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Level not found' });
    }

    res.json({ level: result.rows[0] });
  } catch (error) {
    console.error('Level fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get exercises for a level
router.get('/:levelNumber/exercises', async (req, res) => {
  try {
    const { levelNumber } = req.params;

    const levelResult = await pool.query(
      'SELECT id FROM levels WHERE level_number = $1',
      [levelNumber]
    );

    if (levelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Level not found' });
    }

    const levelId = levelResult.rows[0].id;

    const exercisesResult = await pool.query(
      'SELECT * FROM exercises WHERE level_id = $1 ORDER BY exercise_number',
      [levelId]
    );

    res.json({ exercises: exercisesResult.rows });
  } catch (error) {
    console.error('Exercises fetch error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

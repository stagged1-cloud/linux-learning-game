#!/usr/bin/env node

/**
 * Seed Exercises Script
 * 
 * Reads all exercise JSON files and populates the PostgreSQL database.
 * 
 * Usage: node backend/scripts/seed-exercises.js
 * 
 * Environment Variables:
 *   DATABASE_URL - PostgreSQL connection string
 *   LOG_LEVEL - 'debug', 'info', 'warn', 'error' (default: 'info')
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Configuration
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost/linux_learning_game';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const EXERCISES_DIR = path.join(__dirname, '../../exercises');
const DRY_RUN = process.env.DRY_RUN === 'true';

// Log levels
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLogLevel = LOG_LEVELS[LOG_LEVEL] || LOG_LEVELS.info;

// Logger utility
const logger = {
  debug: (msg) => currentLogLevel <= LOG_LEVELS.debug && console.log(`[DEBUG] ${msg}`),
  info: (msg) => currentLogLevel <= LOG_LEVELS.info && console.log(`[INFO] ${msg}`),
  warn: (msg) => currentLogLevel <= LOG_LEVELS.warn && console.warn(`[WARN] ${msg}`),
  error: (msg) => currentLogLevel <= LOG_LEVELS.error && console.error(`[ERROR] ${msg}`),
};

// Create pool with connection pooling
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Error handler for pool
pool.on('error', (err) => {
  logger.error(`Unexpected error on idle client: ${err.message}`);
});

/**
 * Validate exercise data structure
 */
function validateExercise(exercise, levelNumber, exerciseIndex) {
  const errors = [];

  if (!exercise.exerciseNumber) {
    errors.push(`Missing exerciseNumber`);
  }
  if (!exercise.title) {
    errors.push(`Missing title`);
  }
  if (!exercise.description) {
    errors.push(`Missing description`);
  }
  if (!exercise.validationRules) {
    errors.push(`Missing validationRules`);
  }
  if (typeof exercise.points !== 'number') {
    errors.push(`Invalid points (must be number), got: ${typeof exercise.points}`);
  }
  if (typeof exercise.difficultyStars !== 'number' || exercise.difficultyStars < 1 || exercise.difficultyStars > 5) {
    errors.push(`Invalid difficultyStars (must be 1-5), got: ${exercise.difficultyStars}`);
  }

  if (errors.length > 0) {
    logger.error(`Validation errors in Level ${levelNumber} Exercise ${exerciseIndex + 1}:`);
    errors.forEach(err => logger.error(`  - ${err}`));
    return false;
  }

  return true;
}

/**
 * Validate level data structure
 */
function validateLevel(levelData) {
  const errors = [];

  if (!levelData.level) {
    errors.push(`Missing 'level' object`);
    return errors;
  }

  const level = levelData.level;
  if (typeof level.levelNumber !== 'number') {
    errors.push(`Invalid levelNumber (must be number)`);
  }
  if (!level.title) {
    errors.push(`Missing level title`);
  }
  if (!level.description) {
    errors.push(`Missing level description`);
  }
  if (!level.difficulty) {
    errors.push(`Missing level difficulty`);
  }

  if (!Array.isArray(levelData.exercises)) {
    errors.push(`Missing or invalid 'exercises' array`);
    return errors;
  }

  if (levelData.exercises.length === 0) {
    errors.push(`No exercises defined`);
  }

  return errors;
}

/**
 * Get or create a level
 */
async function upsertLevel(client, levelData) {
  const { levelNumber, title, description, difficulty, estimatedTimeMinutes, pointsReward } = levelData.level;

  try {
    const result = await client.query(
      `INSERT INTO levels (level_number, title, description, difficulty, estimated_time_minutes, points_reward)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (level_number) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         difficulty = EXCLUDED.difficulty,
         estimated_time_minutes = EXCLUDED.estimated_time_minutes,
         points_reward = EXCLUDED.points_reward
       RETURNING id`,
      [levelNumber, title, description, difficulty, estimatedTimeMinutes, pointsReward]
    );

    return result.rows[0].id;
  } catch (err) {
    logger.error(`Failed to upsert level ${levelNumber}: ${err.message}`);
    throw err;
  }
}

/**
 * Insert or update an exercise
 */
async function upsertExercise(client, levelId, exercise, levelNumber) {
  const {
    exerciseNumber,
    title,
    description,
    initialSetup,
    validationRules,
    hints,
    solution,
    points,
    difficultyStars,
  } = exercise;

  try {
    const result = await client.query(
      `INSERT INTO exercises (
        level_id,
        exercise_number,
        title,
        description,
        initial_setup,
        validation_rules,
        hints,
        solution,
        points,
        difficulty_stars
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (level_id, exercise_number) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         initial_setup = EXCLUDED.initial_setup,
         validation_rules = EXCLUDED.validation_rules,
         hints = EXCLUDED.hints,
         solution = EXCLUDED.solution,
         points = EXCLUDED.points,
         difficulty_stars = EXCLUDED.difficulty_stars
       RETURNING id`,
      [
        levelId,
        exerciseNumber,
        title,
        description,
        initialSetup ? JSON.stringify(initialSetup) : null,
        JSON.stringify(validationRules),
        Array.isArray(hints) ? JSON.stringify(hints) : null,
        solution || null,
        points,
        difficultyStars,
      ]
    );

    return result.rows[0].id;
  } catch (err) {
    logger.error(`Failed to insert exercise ${exerciseNumber} for level ${levelNumber}: ${err.message}`);
    throw err;
  }
}

/**
 * Read and parse a level JSON file
 */
function readLevelFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    logger.error(`Failed to read/parse ${path.basename(filePath)}: ${err.message}`);
    return null;
  }
}

/**
 * Get all level files sorted by level number
 */
function getLevelFiles() {
  try {
    const files = fs.readdirSync(EXERCISES_DIR);
    return files
      .filter(f => f.match(/^level_\d+\.json$/))
      .sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)[0]);
        const numB = parseInt(b.match(/\d+/)[0]);
        return numA - numB;
      })
      .map(f => path.join(EXERCISES_DIR, f));
  } catch (err) {
    logger.error(`Failed to read exercises directory: ${err.message}`);
    return [];
  }
}

/**
 * Main seed function
 */
async function seedExercises() {
  const startTime = Date.now();
  let stats = {
    filesProcessed: 0,
    levelsCreated: 0,
    levelsUpdated: 0,
    exercisesCreated: 0,
    exercisesUpdated: 0,
    errorCount: 0,
  };

  logger.info('Starting exercise database seed...');
  logger.info(`Exercises directory: ${EXERCISES_DIR}`);
  logger.info(`Database URL: ${DATABASE_URL.replace(/:[^@]*@/, ':***@')}`);
  if (DRY_RUN) logger.warn('Running in DRY RUN mode - no changes will be made');

  const levelFiles = getLevelFiles();
  if (levelFiles.length === 0) {
    logger.error(`No level files found in ${EXERCISES_DIR}`);
    process.exit(1);
  }

  logger.info(`Found ${levelFiles.length} level files to process`);

  // Check database connection
  const client = await pool.connect();
  try {
    await client.query('SELECT NOW()');
    logger.info('Database connection successful');
  } catch (err) {
    logger.error(`Database connection failed: ${err.message}`);
    client.release();
    process.exit(1);
  }
  client.release();

  // Process each level file
  for (const filePath of levelFiles) {
    const fileName = path.basename(filePath);
    const levelData = readLevelFile(filePath);

    if (!levelData) {
      stats.errorCount++;
      continue;
    }

    // Validate level structure
    const validationErrors = validateLevel(levelData);
    if (validationErrors.length > 0) {
      logger.error(`${fileName} - Validation failed:`);
      validationErrors.forEach(err => logger.error(`  - ${err}`));
      stats.errorCount++;
      continue;
    }

    const levelNumber = levelData.level.levelNumber;
    logger.info(`Processing: ${fileName} (Level ${levelNumber})`);

    if (DRY_RUN) {
      stats.filesProcessed++;
      stats.exercisesCreated += levelData.exercises.length;
      continue;
    }

    const dbClient = await pool.connect();
    try {
      await dbClient.query('BEGIN');

      // Upsert level
      let levelId;
      try {
        levelId = await upsertLevel(dbClient, levelData);
        logger.debug(`  Level ${levelNumber} saved with ID ${levelId}`);
      } catch (err) {
        await dbClient.query('ROLLBACK');
        logger.error(`  Failed to save level: ${err.message}`);
        stats.errorCount++;
        dbClient.release();
        continue;
      }

      // Process exercises
      let exerciseCount = 0;
      let exerciseErrors = 0;

      for (let i = 0; i < levelData.exercises.length; i++) {
        const exercise = levelData.exercises[i];

        // Validate exercise
        if (!validateExercise(exercise, levelNumber, i)) {
          exerciseErrors++;
          continue;
        }

        try {
          await upsertExercise(dbClient, levelId, exercise, levelNumber);
          stats.exercisesCreated++;
          exerciseCount++;
          logger.debug(`  Exercise ${exercise.exerciseNumber}: "${exercise.title}"`);
        } catch (err) {
          exerciseErrors++;
          stats.errorCount++;
        }
      }

      if (exerciseErrors > 0) {
        logger.warn(`  ${exerciseErrors}/${levelData.exercises.length} exercises had errors`);
      }

      await dbClient.query('COMMIT');
      stats.filesProcessed++;
      logger.info(`  ✓ Level ${levelNumber}: ${exerciseCount}/${levelData.exercises.length} exercises loaded`);
    } catch (err) {
      try {
        await dbClient.query('ROLLBACK');
      } catch (rollbackErr) {
        logger.error(`  Rollback failed: ${rollbackErr.message}`);
      }
      logger.error(`  Transaction failed for ${fileName}: ${err.message}`);
      stats.errorCount++;
    } finally {
      dbClient.release();
    }
  }

  // Close pool
  await pool.end();

  // Print summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n========================================');
  console.log('Seed Completed');
  console.log('========================================');
  console.log(`Files Processed:     ${stats.filesProcessed}`);
  console.log(`Exercises Loaded:    ${stats.exercisesCreated}`);
  console.log(`Errors:              ${stats.errorCount}`);
  console.log(`Time Elapsed:        ${elapsed}s`);
  console.log('========================================\n');

  if (stats.errorCount > 0) {
    logger.error(`Seed completed with ${stats.errorCount} error(s)`);
    process.exit(1);
  } else {
    logger.info('Seed completed successfully');
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.warn('Received SIGINT, shutting down...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.warn('Received SIGTERM, shutting down...');
  await pool.end();
  process.exit(0);
});

// Run the seed
seedExercises().catch(err => {
  logger.error(`Unhandled error: ${err.message}`);
  pool.end();
  process.exit(1);
});

/**
 * Achievement Checker Service
 * Monitors user progress and automatically awards achievements
 */

const { Pool } = require('pg');

class AchievementChecker {
  constructor(io, pool) {
    this.io = io;
    this.pool = pool;
  }

  /**
   * Check for achievements when exercise is completed
   */
  async checkAchievementsOnExerciseComplete(userId, exerciseId) {
    try {
      const earnedAchievements = [];

      // Get user progress stats
      const statsResult = await this.pool.query(
        `SELECT 
           (SELECT COUNT(DISTINCT level_id) FROM user_progress WHERE user_id = $1 AND is_completed = true) as levels_completed,
           (SELECT COUNT(DISTINCT exercise_id) FROM user_progress WHERE user_id = $1 AND is_completed = true) as exercises_completed,
           (SELECT COUNT(*) FROM user_progress WHERE user_id = $1 AND is_completed = true AND hints_used = 0) as no_hint_completions,
           (SELECT MAX(attempts) FROM user_progress WHERE user_id = $1 AND is_completed = true) as max_attempts,
           (SELECT COALESCE(SUM(time_spent_seconds), 0) FROM user_progress WHERE user_id = $1) as total_time_seconds
         FROM users WHERE id = $1`,
        [userId]
      );

      if (statsResult.rows.length === 0) {
        return earnedAchievements;
      }

      const stats = statsResult.rows[0];

      // Get current user rank for leaderboard achievement
      const rankResult = await this.pool.query(
        `SELECT rank FROM leaderboard WHERE id = $1`,
        [userId]
      );
      const userRank = rankResult.rows.length > 0 ? rankResult.rows[0].rank : null;

      // Achievement definitions with conditions
      const achievementsToCheck = [
        {
          id: 0,
          name: 'First Steps',
          condition: stats.exercises_completed >= 1,
        },
        {
          id: 1,
          name: 'Beginner',
          condition: stats.levels_completed >= 10,
        },
        {
          id: 2,
          name: 'Intermediate',
          condition: stats.levels_completed >= 20,
        },
        {
          id: 3,
          name: 'Advanced',
          condition: stats.levels_completed >= 30,
        },
        {
          id: 4,
          name: 'Professional',
          condition: stats.levels_completed >= 40,
        },
        {
          id: 5,
          name: 'Expert',
          condition: stats.levels_completed >= 50,
        },
        {
          id: 6,
          name: 'Speed Demon',
          condition: await this.checkSpeedDemon(userId),
        },
        {
          id: 7,
          name: 'No Hints Needed',
          condition: stats.no_hint_completions >= 20,
        },
        {
          id: 8,
          name: 'Persistent',
          condition: stats.max_attempts >= 10,
        },
        {
          id: 9,
          name: 'Leaderboard Top 10',
          condition: userRank && userRank <= 10,
        },
        {
          id: 11,
          name: 'Solo Master',
          condition: stats.no_hint_completions >= 50,
        },
        {
          id: 17,
          name: 'Dedicated Learner',
          condition: stats.total_time_seconds >= 36000, // 10 hours
        },
      ];

      // Check each achievement
      for (const achievement of achievementsToCheck) {
        if (achievement.condition) {
          const existingResult = await this.pool.query(
            `SELECT id FROM user_achievements 
             WHERE user_id = $1 AND achievement_id = $2`,
            [userId, achievement.id]
          );

          if (existingResult.rows.length === 0) {
            // Award achievement
            await this.awardAchievement(userId, achievement.id);
            earnedAchievements.push(achievement);

            // Emit achievement unlocked event
            this.io.emit('achievement-unlocked', {
              userId,
              achievementId: achievement.id,
              achievementName: achievement.name,
              timestamp: new Date(),
            });
          }
        }
      }

      return earnedAchievements;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Check for speed demon achievement
   */
  async checkSpeedDemon(userId) {
    try {
      const result = await this.pool.query(
        `SELECT COUNT(*) as fast_count
         FROM user_progress 
         WHERE user_id = $1 
         AND is_completed = true 
         AND time_spent_seconds < 300`, // 5 minutes
        [userId]
      );
      return result.rows[0].fast_count >= 10;
    } catch (error) {
      console.error('Error checking speed demon:', error);
      return false;
    }
  }

  /**
   * Award an achievement to a user
   */
  async awardAchievement(userId, achievementId) {
    try {
      // Insert new achievement
      await this.pool.query(
        `INSERT INTO user_achievements (user_id, achievement_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [userId, achievementId]
      );

      // Get achievement points
      const achievementResult = await this.pool.query(
        `SELECT points FROM achievements WHERE id = $1`,
        [achievementId]
      );

      if (achievementResult.rows.length > 0) {
        const points = achievementResult.rows[0].points;

        // Update user's total points
        await this.pool.query(
          `UPDATE users 
           SET total_points = total_points + $1
           WHERE id = $2`,
          [points, userId]
        );
      }
    } catch (error) {
      console.error('Error awarding achievement:', error);
      throw error;
    }
  }

  /**
   * Check for streak-based achievements
   */
  async checkStreakAchievements(userId) {
    try {
      const result = await this.pool.query(
        `SELECT COUNT(DISTINCT DATE(completed_at)) as consecutive_days
         FROM user_progress 
         WHERE user_id = $1 
         AND completed_at >= NOW() - INTERVAL '30 days'
         AND is_completed = true`,
        [userId]
      );

      const streak = result.rows[0].consecutive_days;

      if (streak >= 7) {
        const existingResult = await this.pool.query(
          `SELECT id FROM user_achievements 
           WHERE user_id = $1 AND achievement_id = 18`,
          [userId]
        );

        if (existingResult.rows.length === 0) {
          await this.awardAchievement(userId, 18);
          this.io.emit('achievement-unlocked', {
            userId,
            achievementId: 18,
            achievementName: '7-Day Streak',
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Error checking streak achievements:', error);
    }
  }

  /**
   * Check for perfect level completion (all exercises perfect)
   */
  async checkPerfectLevelAchievement(userId, levelId) {
    try {
      const result = await this.pool.query(
        `SELECT COUNT(*) as total_exercises,
                COUNT(CASE WHEN hints_used = 0 AND attempts = 1 THEN 1 END) as perfect_count
         FROM user_progress up
         JOIN exercises e ON up.exercise_id = e.id
         WHERE up.user_id = $1 AND e.level_id = $2 AND up.is_completed = true`,
        [userId, levelId]
      );

      const { total_exercises, perfect_count } = result.rows[0];

      if (total_exercises > 0 && total_exercises === perfect_count) {
        const existingResult = await this.pool.query(
          `SELECT id FROM user_achievements 
           WHERE user_id = $1 AND achievement_id = 11`,
          [userId]
        );

        if (existingResult.rows.length === 0) {
          await this.awardAchievement(userId, 11);
          this.io.emit('achievement-unlocked', {
            userId,
            achievementId: 11,
            achievementName: 'Perfect Score',
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Error checking perfect level achievement:', error);
    }
  }

  /**
   * Check if user earned completionist achievement
   */
  async checkCompletiontistAchievement(userId) {
    try {
      const result = await this.pool.query(
        `SELECT COUNT(*) as earned_count
         FROM user_achievements
         WHERE user_id = $1`,
        [userId]
      );

      const earnedCount = result.rows[0].earned_count;

      if (earnedCount >= 20) {
        const existingResult = await this.pool.query(
          `SELECT id FROM user_achievements 
           WHERE user_id = $1 AND achievement_id = 19`,
          [userId]
        );

        if (existingResult.rows.length === 0) {
          await this.awardAchievement(userId, 19);
          this.io.emit('achievement-unlocked', {
            userId,
            achievementId: 19,
            achievementName: 'Completionist',
            timestamp: new Date(),
          });
        }
      }
    } catch (error) {
      console.error('Error checking completionist achievement:', error);
    }
  }
}

module.exports = AchievementChecker;

-- PostgreSQL Database Schema for Linux Learning Game

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    total_points INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

-- Levels table
CREATE TABLE IF NOT EXISTS levels (
    id SERIAL PRIMARY KEY,
    level_number INTEGER UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'professional', 'expert')),
    estimated_time_minutes INTEGER,
    points_reward INTEGER DEFAULT 100,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exercises table
CREATE TABLE IF NOT EXISTS exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    level_id INTEGER REFERENCES levels(id) ON DELETE CASCADE,
    exercise_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    initial_setup JSONB,
    validation_rules JSONB NOT NULL,
    hints JSONB,
    solution TEXT,
    points INTEGER DEFAULT 10,
    difficulty_stars INTEGER CHECK (difficulty_stars BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(level_id, exercise_number)
);

-- User progress tracking
CREATE TABLE IF NOT EXISTS user_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    level_id INTEGER REFERENCES levels(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    attempts INTEGER DEFAULT 0,
    hints_used INTEGER DEFAULT 0,
    completed_at TIMESTAMP,
    time_spent_seconds INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, exercise_id)
);

-- Exercise attempts (for analytics)
CREATE TABLE IF NOT EXISTS exercise_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
    command_entered TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    error_message TEXT,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Achievements/Badges
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    criteria JSONB NOT NULL,
    points INTEGER DEFAULT 50,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);

-- Leaderboard (materialized view for performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard AS
SELECT 
    u.id,
    u.username,
    u.total_points,
    u.current_level,
    COUNT(DISTINCT up.exercise_id) as exercises_completed,
    RANK() OVER (ORDER BY u.total_points DESC) as rank
FROM users u
LEFT JOIN user_progress up ON u.id = up.user_id AND up.is_completed = true
WHERE u.is_active = true
GROUP BY u.id, u.username, u.total_points, u.current_level
ORDER BY u.total_points DESC
LIMIT 100;

-- Refresh leaderboard index
CREATE UNIQUE INDEX IF NOT EXISTS leaderboard_user_id_idx ON leaderboard (id);

-- Phase 2: File Analysis tables
CREATE TABLE IF NOT EXISTS file_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size_bytes INTEGER,
    file_hash VARCHAR(64),
    analysis_status VARCHAR(20) CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
    llm_responses JSONB,
    consensus_result JSONB,
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_level_id ON user_progress(level_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_completed ON user_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_user_id ON exercise_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_exercise_id ON exercise_attempts(exercise_id);
CREATE INDEX IF NOT EXISTS idx_file_analyses_user_id ON file_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_file_analyses_status ON file_analyses(analysis_status);

-- Seed initial achievements
INSERT INTO achievements (name, description, icon, criteria, points) VALUES
('First Steps', 'Complete your first exercise', '🎯', '{"exercises_completed": 1}', 50),
('Beginner', 'Complete Level 1-10', '🌟', '{"levels_completed": 10}', 100),
('Intermediate', 'Complete Level 11-20', '⭐', '{"levels_completed": 20}', 200),
('Advanced', 'Complete Level 21-30', '🔥', '{"levels_completed": 30}', 300),
('Professional', 'Complete Level 31-40', '💎', '{"levels_completed": 40}', 400),
('Expert', 'Complete all 50 levels', '👑', '{"levels_completed": 50}', 500),
('Speed Demon', 'Complete 10 exercises in under 5 minutes each', '⚡', '{"fast_completions": 10}', 150),
('No Hints Needed', 'Complete 20 exercises without using hints', '🧠', '{"no_hint_completions": 20}', 250),
('Persistent', 'Attempt the same exercise 10 times before succeeding', '💪', '{"max_attempts": 10}', 100),
('Leaderboard Top 10', 'Reach top 10 on the leaderboard', '🏆', '{"leaderboard_rank": 10}', 300)
ON CONFLICT (name) DO NOTHING;

-- Create function to update leaderboard
CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update user's updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_progress_updated_at
BEFORE UPDATE ON user_progress
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

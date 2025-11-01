-- Migration: Add Command Execution Fields
-- This migration adds support for storing actual command output and execution details
-- Run this after deploying the new command execution system

-- Add new columns to exercise_attempts table
ALTER TABLE exercise_attempts 
ADD COLUMN IF NOT EXISTS command_output TEXT;

ALTER TABLE exercise_attempts 
ADD COLUMN IF NOT EXISTS command_error TEXT;

ALTER TABLE exercise_attempts 
ADD COLUMN IF NOT EXISTS exit_code INTEGER;

-- Create index for faster queries on exit codes
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_exit_code 
ON exercise_attempts(exit_code);

-- Create index for faster queries on incorrect commands (for analytics)
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_incorrect 
ON exercise_attempts(is_correct) WHERE is_correct = false;

-- Add index for command text search (if using full-text search)
CREATE INDEX IF NOT EXISTS idx_exercise_attempts_command 
ON exercise_attempts USING GIN(to_tsvector('english', command_entered));

-- Ensure hints_used column exists in user_progress
ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS hints_used INTEGER DEFAULT 0;

-- Create index for hints_used tracking
CREATE INDEX IF NOT EXISTS idx_user_progress_hints_used 
ON user_progress(hints_used) WHERE hints_used > 0;

-- Create materialized view for command analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS command_analytics AS
SELECT 
    ea.exercise_id,
    COUNT(*) as total_attempts,
    COUNT(CASE WHEN ea.is_correct THEN 1 END) as correct_attempts,
    COUNT(CASE WHEN ea.exit_code = 0 THEN 1 END) as successful_executions,
    COUNT(CASE WHEN ea.exit_code != 0 THEN 1 END) as failed_executions,
    AVG(CASE WHEN ea.is_correct THEN 1 ELSE 0 END) as success_rate,
    COUNT(DISTINCT ea.user_id) as unique_users,
    MAX(ea.attempted_at) as last_attempted
FROM exercise_attempts ea
GROUP BY ea.exercise_id;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_command_analytics_exercise_id 
ON command_analytics(exercise_id);

-- Create view for user command history
CREATE OR REPLACE VIEW user_command_history AS
SELECT 
    ea.user_id,
    ea.exercise_id,
    ea.command_entered,
    ea.is_correct,
    ea.exit_code,
    ea.attempted_at,
    ROW_NUMBER() OVER (PARTITION BY ea.user_id, ea.exercise_id ORDER BY ea.attempted_at DESC) as attempt_number
FROM exercise_attempts ea
ORDER BY ea.user_id, ea.attempted_at DESC;

-- Create function to get command history for a user
CREATE OR REPLACE FUNCTION get_user_command_history(p_user_id UUID, p_limit INT DEFAULT 50)
RETURNS TABLE (
    exercise_id UUID,
    command TEXT,
    is_correct BOOLEAN,
    exit_code INT,
    attempted_at TIMESTAMP,
    attempt_number BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ea.exercise_id,
        ea.command_entered,
        ea.is_correct,
        ea.exit_code,
        ea.attempted_at,
        ROW_NUMBER() OVER (PARTITION BY ea.exercise_id ORDER BY ea.attempted_at DESC)
    FROM exercise_attempts ea
    WHERE ea.user_id = p_user_id
    ORDER BY ea.attempted_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to refresh command analytics
CREATE OR REPLACE FUNCTION refresh_command_analytics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY command_analytics;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh analytics on new attempts
CREATE OR REPLACE FUNCTION trigger_refresh_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Could be called asynchronously in production
    -- For now, just return
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Uncomment to enable automatic analytics refresh (may impact performance)
-- CREATE TRIGGER exercise_attempts_refresh_analytics
-- AFTER INSERT ON exercise_attempts
-- FOR EACH STATEMENT
-- EXECUTE FUNCTION trigger_refresh_analytics();

-- Create function to get exercise difficulty (based on attempt data)
CREATE OR REPLACE FUNCTION calculate_exercise_difficulty(p_exercise_id UUID)
RETURNS DECIMAL AS $$
DECLARE
    v_success_rate DECIMAL;
    v_avg_attempts INT;
BEGIN
    SELECT 
        COALESCE(AVG(CASE WHEN ea.is_correct THEN 0 ELSE 1 END), 0.5) INTO v_success_rate
    FROM exercise_attempts ea
    WHERE ea.exercise_id = p_exercise_id AND ea.is_correct = true;
    
    SELECT 
        COALESCE(AVG(up.attempts), 1) INTO v_avg_attempts
    FROM user_progress up
    WHERE up.exercise_id = p_exercise_id AND up.is_completed = true;
    
    -- Difficulty score: combination of success rate and average attempts
    RETURN (1.0 - v_success_rate) * 5.0 + (LEAST(v_avg_attempts, 10.0) / 10.0) * 5.0;
END;
$$ LANGUAGE plpgsql;

-- Create index for faster exercise lookups
CREATE INDEX IF NOT EXISTS idx_user_progress_exercise_user 
ON user_progress(exercise_id, user_id);

-- Grant view permissions
GRANT SELECT ON command_analytics TO postgres;
GRANT SELECT ON user_command_history TO postgres;

-- Add comments for documentation
COMMENT ON COLUMN exercise_attempts.command_output IS 'Actual stdout from command execution';
COMMENT ON COLUMN exercise_attempts.command_error IS 'Actual stderr from command execution';
COMMENT ON COLUMN exercise_attempts.exit_code IS 'Exit code from command (0 = success)';
COMMENT ON TABLE command_analytics IS 'Materialized view tracking command execution statistics per exercise';
COMMENT ON FUNCTION get_user_command_history(UUID, INT) IS 'Returns command history for a specific user';
COMMENT ON FUNCTION calculate_exercise_difficulty(UUID) IS 'Calculates difficulty score based on user attempt data';

-- Summary of changes
/*
Migration Summary:
1. Added command_output, command_error, exit_code columns to exercise_attempts
2. Added hints_used to user_progress (already exists, but ensuring indexed)
3. Created command_analytics materialized view for analytics
4. Created user_command_history view for easy access
5. Created helper functions for analytics and difficulty calculation
6. Created performance indexes for common queries

These changes enable:
- Storing actual command output for learning analytics
- Better tracking of user progress and hints used
- Analytics on command execution success rates
- Performance optimization for analytics queries
*/

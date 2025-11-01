# Backend Scripts

## Seed Exercises Script

Populates the PostgreSQL database with all exercises from the `/exercises` directory.

### Prerequisites

1. PostgreSQL database running and accessible
2. Database schema initialized (run `schema.sql` first if needed)
3. `.env` file configured with `DATABASE_URL`
4. Node.js dependencies installed (`npm install`)

### Usage

#### Standard Seed (Makes changes to database)
```bash
npm run seed:exercises
```

#### Dry Run (Preview changes without making them)
```bash
npm run seed:exercises:dry
```

#### Direct Node Execution
```bash
node backend/scripts/seed-exercises.js
```

### Configuration

The script respects the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://localhost/linux_learning_game` | PostgreSQL connection string |
| `LOG_LEVEL` | `info` | Logging level: `debug`, `info`, `warn`, `error` |
| `DRY_RUN` | `false` | Set to `true` to preview changes without applying them |

### Example Usage

```bash
# Standard seed with default logging
npm run seed:exercises

# Dry run to preview what will happen
npm run seed:exercises:dry

# Seed with debug logging
LOG_LEVEL=debug npm run seed:exercises

# Seed with custom database
DATABASE_URL=postgresql://user:pass@host:5432/db npm run seed:exercises
```

### What the Script Does

1. **Connects** to the PostgreSQL database
2. **Discovers** all `level_*.json` files in `/exercises` directory
3. **Validates** each level and exercise structure
4. **Upserts** levels into the `levels` table
5. **Upserts** exercises into the `exercises` table
6. **Handles** conflicts gracefully (updates existing records)
7. **Reports** progress and statistics

### Data Structure

The script expects JSON files with this structure:

```json
{
  "level": {
    "levelNumber": 1,
    "title": "Level Title",
    "description": "Level description",
    "difficulty": "beginner|intermediate|advanced|professional|expert",
    "estimatedTimeMinutes": 15,
    "pointsReward": 100
  },
  "exercises": [
    {
      "exerciseNumber": 1,
      "title": "Exercise Title",
      "description": "What the user needs to do",
      "initialSetup": {
        "directory": "/home/student",
        "files": ["file1.txt"],
        "subdirectories": ["dir1"]
      },
      "validationRules": {
        "command": "pwd",
        "expectedOutput": "/home/student"
      },
      "hints": [
        "First hint",
        "Second hint",
        "Third hint"
      ],
      "solution": "pwd",
      "points": 10,
      "difficultyStars": 1
    }
  ]
}
```

### Validation Rules

The script validates:

- **Level structure**: All required fields present
- **Exercise structure**: All required fields present
- **Data types**: Correct types for points, difficulty stars, etc.
- **Difficulty stars**: Integer between 1-5
- **Points**: Must be a number

### Output

The script produces:

1. **Console output**: Real-time progress during processing
2. **Summary table**: Final statistics after completion
3. **Exit code**: 0 on success, 1 on errors

#### Example Output
```
[INFO] Starting exercise database seed...
[INFO] Database URL: postgresql://***@localhost:5432/linux_game
[INFO] Found 51 level files to process
[INFO] Database connection successful
[INFO] Processing: level_01.json (Level 1)
[INFO]   ✓ Level 1: 5/5 exercises loaded
[INFO] Processing: level_02.json (Level 2)
[INFO]   ✓ Level 2: 5/5 exercises loaded
...

========================================
Seed Completed
========================================
Files Processed:     51
Exercises Loaded:    255
Errors:              0
Time Elapsed:        12.34s
========================================
```

### Error Handling

The script handles:

- **Missing files**: Logs and continues
- **Parse errors**: Validates JSON before processing
- **Connection errors**: Fails fast with clear error message
- **Validation errors**: Logs specific validation issues
- **Database errors**: Rolls back transaction on failure
- **Graceful shutdown**: Properly closes connections on SIGINT/SIGTERM

### Idempotency

The script is **fully idempotent** - it's safe to run multiple times:

- Uses `ON CONFLICT ... DO UPDATE` for upserts
- Existing levels are updated, not duplicated
- Existing exercises are updated, not duplicated
- No side effects from re-running

### Performance

- **Connection pooling**: Max 10 concurrent connections
- **Batch operations**: Uses transactions for consistency
- **Typical speed**: ~1-2 seconds for all 51 levels (255+ exercises)

### Troubleshooting

#### "Database connection failed"
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL is running
- Ensure credentials are correct

#### "No level files found"
- Verify `/exercises` directory exists
- Check files are named `level_*.json`

#### "Validation failed"
- Check JSON syntax in level files
- Verify all required fields present
- Check data types match schema

#### Permission errors
- Ensure database user has INSERT/UPDATE permissions
- Check PostgreSQL role has correct grants

### Development Tips

```bash
# Preview changes with dry run
npm run seed:exercises:dry

# Debug specific issues
LOG_LEVEL=debug npm run seed:exercises

# Check database after seeding
psql $DATABASE_URL -c "SELECT COUNT(*) FROM levels;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM exercises;"
```

### Database Verification

After seeding, verify the data:

```bash
# Check levels
psql $DATABASE_URL << EOF
SELECT level_number, title, COUNT(e.id) as exercise_count
FROM levels l
LEFT JOIN exercises e ON l.id = e.level_id
GROUP BY l.level_number, l.title
ORDER BY l.level_number;
EOF

# Check total exercises
psql $DATABASE_URL -c "SELECT COUNT(*) FROM exercises;"

# Sample exercise
psql $DATABASE_URL -c "SELECT title, points, difficulty_stars FROM exercises LIMIT 5;"
```

### Integration with CI/CD

To include in CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Seed exercises
  run: npm run seed:exercises
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Rollback

To remove all seeded data:

```bash
psql $DATABASE_URL << EOF
DELETE FROM user_progress;
DELETE FROM exercise_attempts;
DELETE FROM exercises;
DELETE FROM levels;
EOF
```

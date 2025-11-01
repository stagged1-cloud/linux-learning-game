# Seed Script Usage Guide

## Installation

```bash
cd backend
npm install
```

## Quick Commands

```bash
# Preview what will be inserted (no changes)
npm run seed:exercises:dry

# Actually seed the database
npm run seed:exercises

# Seed with debug logging
LOG_LEVEL=debug npm run seed:exercises

# Direct execution
node scripts/seed-exercises.js
```

## Environment Setup

1. Create `.env` file in root directory:
```bash
DATABASE_URL=postgresql://postgres:password@localhost:5432/linux_game
LOG_LEVEL=info
```

2. Ensure PostgreSQL is running:
```bash
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql
```

3. Create and initialize database:
```bash
createdb linux_game
psql linux_game < backend/schema.sql
```

## What It Does

- Reads all `level_*.json` files from `/exercises` directory
- Validates each level and exercise
- Creates level records in `levels` table
- Creates exercise records in `exercises` table
- Handles conflicts gracefully (idempotent)
- Logs progress and errors
- Supports dry-run mode

## Key Features

✅ Fully idempotent (safe to run multiple times)
✅ Connection pooling for efficiency
✅ Transaction support with rollback
✅ Comprehensive validation
✅ Multiple log levels (debug, info, warn, error)
✅ Graceful error handling
✅ Progress tracking

## Example Output

```
[INFO] Starting exercise database seed...
[INFO] Database URL: postgresql://***@localhost:5432/linux_game
[INFO] Found 51 level files to process
[INFO] Database connection successful
[INFO] Processing: level_01.json (Level 1)
[INFO]   ✓ Level 1: 5/5 exercises loaded
[INFO] Processing: level_02.json (Level 2)
[INFO]   ✓ Level 2: 5/5 exercises loaded

========================================
Seed Completed
========================================
Files Processed:     51
Exercises Loaded:    255
Errors:              0
Time Elapsed:        2.45s
========================================
```

## Verification

```bash
# Check number of levels
psql -d linux_game -c "SELECT COUNT(*) FROM levels;"

# Check number of exercises
psql -d linux_game -c "SELECT COUNT(*) FROM exercises;"

# List first 5 levels
psql -d linux_game << EOF
SELECT level_number, title, COUNT(e.id) as exercises
FROM levels l
LEFT JOIN exercises e ON l.id = e.level_id
GROUP BY l.level_number, l.title
ORDER BY l.level_number
LIMIT 5;

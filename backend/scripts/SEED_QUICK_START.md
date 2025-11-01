# Quick Start: Seeding Exercises

## One-Time Setup

1. **Ensure PostgreSQL is running**
   ```bash
   # On macOS with Homebrew
   brew services start postgresql
   
   # On Linux
   sudo systemctl start postgresql
   ```

2. **Create the database (if not exists)**
   ```bash
   createdb linux_game
   ```

3. **Initialize the schema**
   ```bash
   psql linux_game < backend/schema.sql
   ```

4. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

5. **Set up .env file**
   ```bash
   cp .env.example .env
   # Edit .env and set DATABASE_URL
   ```

## Seed the Exercises

### Option 1: Preview First (Recommended)
```bash
npm run seed:exercises:dry
```
Output shows what will be inserted without making changes.

### Option 2: Actually Seed
```bash
npm run seed:exercises
```
Populates the database with all exercises from `/exercises`.

## Verify Success

```bash
# Check levels count
psql $DATABASE_URL -c "SELECT COUNT(*) as levels FROM levels;"

# Check exercises count
psql $DATABASE_URL -c "SELECT COUNT(*) as exercises FROM exercises;"

# List levels
psql $DATABASE_URL -c "
  SELECT level_number, title, COUNT(e.id) as exercises
  FROM levels l
  LEFT JOIN exercises e ON l.id = e.level_id
  GROUP BY l.level_number, l.title
  ORDER BY l.level_number
  LIMIT 10;
"
```

## Common Commands

```bash
# Standard seed with normal logging
npm run seed:exercises

# Dry run (no changes)
npm run seed:exercises:dry

# Seed with debug output
LOG_LEVEL=debug npm run seed:exercises

# Seed with custom database
DATABASE_URL=postgresql://user:pass@host:5432/db npm run seed:exercises

# Direct execution
node scripts/seed-exercises.js
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Database connection failed" | Check `DATABASE_URL` in `.env` |
| "No level files found" | Verify `/exercises` directory exists |
| "Permission denied" | Run `chmod +x scripts/seed-exercises.js` |
| Parse errors | Check JSON syntax in `/exercises/level_*.json` |

## What Gets Inserted

- **51 levels** (level 0-50)
- **255+ exercises** (5 per level)
- All exercise metadata (hints, validation rules, solutions, points)
- Proper relationships between levels and exercises

## Safety

The script is **completely safe to run multiple times**:
- Uses `ON CONFLICT ... DO UPDATE` (upserts)
- Existing data is updated, not duplicated
- Full transaction support with rollback on errors
- No data loss

---

For detailed documentation, see [README.md](README.md)

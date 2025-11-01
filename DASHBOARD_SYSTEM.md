# Dashboard & Achievement System Documentation

## Overview

The Dashboard and Achievement System provides comprehensive progress tracking, user statistics, and motivational achievements for the Linux Learning Game. It includes:

- **User Dashboard**: Displays overall progress, statistics, and leaderboard position
- **Achievement System**: 20 different achievements/badges that unlock based on progress
- **Real-time Updates**: WebSocket integration for live progress updates
- **Leaderboard**: Rankings based on total points earned

## Components

### Frontend Components

#### 1. `DashboardPage.tsx`
Main dashboard page that displays all user statistics and progress.

**Features:**
- User profile card with avatar and rank badge
- Overall progress bar (0-50 levels)
- Detailed level-by-level progress with progress bars
- Statistics including:
  - Average attempts per exercise
  - Total hints used
  - Perfect scores (exercises completed without hints)
  - Success rate (%)
  - Current streak (days)
- Achievement badges grid
- Recent activity feed (last 10 completed exercises)
- Top 5 leaderboard snippet

**Props:** None (uses `useDashboard` hook)

**Styling:** Tailwind CSS with gradient backgrounds and dark theme

#### 2. `AchievementBadge.tsx`
Individual achievement badge component with tooltip.

**Props:**
```typescript
interface AchievementBadgeProps {
  achievement: Achievement;
  earned: boolean;
  progress?: {
    current: number;
    target: number;
  };
}
```

**Features:**
- Large, visually appealing badge design
- Emoji icons for quick identification
- Tooltip showing:
  - Achievement name and description
  - Unlock condition/progress
  - Points reward
- Progress ring for locked achievements
- Hover animations and scale effects

**Styling:** Gradient backgrounds, shadows, smooth transitions

#### 3. `LeaderboardSnippet.tsx`
Displays top players in a card-based layout.

**Props:**
```typescript
interface LeaderboardSnippetProps {
  leaderboard: LeaderboardEntry[];
}
```

**Features:**
- Medal badges (🥇 🥈 🥉 🎖️) for top 3
- User ranking with points and level info
- Colored backgrounds for top players
- Link to full leaderboard

**Styling:** Rank-based color gradient backgrounds

### Frontend Hooks

#### `useDashboard.ts`
Custom React hook for managing all dashboard data.

**Returns:**
```typescript
{
  userStats: UserStats | null;
  levelProgress: LevelProgressItem[];
  achievements: Achievement[];
  earnedAchievements: Achievement[];
  recentActivity: RecentActivityItem[];
  leaderboardTop5: LeaderboardEntry[];
  loading: boolean;
  error: string | null;
  refetch: {
    userStats: () => Promise<void>;
    levelProgress: () => Promise<void>;
    achievements: () => Promise<void>;
    earnedAchievements: () => Promise<void>;
    recentActivity: () => Promise<void>;
    leaderboard: () => Promise<void>;
  };
}
```

**Features:**
- Fetches all dashboard data on mount
- Real-time WebSocket integration
- Automatic updates on:
  - Achievement unlocked
  - Exercise completed
  - Leaderboard updated
- Refetch functions for manual updates
- Error handling and loading states

**API Endpoints Used:**
- `GET /api/progress/user` - User statistics
- `GET /api/progress/levels` - Level progress
- `GET /api/progress/achievements/all` - All achievements
- `GET /api/progress/achievements` - Earned achievements
- `GET /api/progress/recent-activity` - Recent activity
- `GET /api/progress/leaderboard` - Leaderboard data

### Backend Routes

#### `progress.js`

**GET `/api/progress/user`** (Protected)
Returns comprehensive user statistics.

**Response:**
```json
{
  "id": "uuid",
  "username": "string",
  "email": "string",
  "totalPoints": 1500,
  "currentLevel": 15,
  "createdAt": "2025-01-01T00:00:00Z",
  "lastLogin": "2025-01-05T10:30:00Z",
  "levelsCompleted": 10,
  "exercisesCompleted": 87,
  "timeSpentSeconds": 43200,
  "leaderboardRank": 42,
  "avgAttemptsPerExercise": 1.5,
  "hintsUsed": 25,
  "perfectScores": 62,
  "successRate": 95,
  "currentStreak": 5
}
```

**GET `/api/progress/levels`** (Protected)
Returns progress for each level.

**Response:**
```json
[
  {
    "id": 1,
    "levelNumber": 1,
    "title": "Getting Started",
    "totalExercises": 5,
    "exercisesCompleted": 5
  }
]
```

**GET `/api/progress/achievements/all`**
Returns all available achievements in the system.

**Response:**
```json
[
  {
    "id": 0,
    "name": "First Steps",
    "description": "Complete your first exercise",
    "icon": "🎯",
    "criteria": { "exercises_completed": 1 },
    "points": 50
  }
]
```

**GET `/api/progress/achievements`** (Protected)
Returns only achievements the user has earned.

**Response:**
```json
[
  {
    "id": 0,
    "name": "First Steps",
    "description": "Complete your first exercise",
    "icon": "🎯",
    "criteria": { "exercises_completed": 1 },
    "points": 50,
    "earnedAt": "2025-01-01T05:00:00Z"
  }
]
```

**GET `/api/progress/recent-activity`** (Protected)
Returns user's 10 most recent completed exercises.

**Query Parameters:**
- `limit` (optional): Number of items to return (default: 10)

**Response:**
```json
[
  {
    "exerciseTitle": "List Files",
    "levelNumber": 1,
    "pointsEarned": 10,
    "completedAt": "2025-01-05T10:30:00Z"
  }
]
```

**GET `/api/progress/leaderboard`**
Returns top players on the leaderboard.

**Query Parameters:**
- `limit` (optional): Number of players to return (default: 100)

**Response:**
```json
[
  {
    "rank": 1,
    "username": "pro_hacker",
    "totalPoints": 5000,
    "currentLevel": 50,
    "exercisesCompleted": 250
  }
]
```

**POST `/api/progress/achievement`** (Protected)
Awards an achievement to a user.

**Request Body:**
```json
{
  "achievementId": 0
}
```

**Response:**
```json
{
  "success": true,
  "achievementId": 0,
  "earnedAt": "2025-01-05T10:30:00Z"
}
```

**POST `/api/progress/level-complete`** (Protected)
Marks a level as completed and checks for achievements.

**Request Body:**
```json
{
  "levelId": 1
}
```

**Response:**
```json
{
  "success": true,
  "earnedAchievements": [1, 2]
}
```

**POST `/api/progress/check-achievements`** (Protected)
Checks and awards all applicable achievements based on current progress.

**Response:**
```json
{
  "success": true,
  "earnedAchievements": [0, 1, 3]
}
```

## Achievements System

### Available Achievements

1. **First Steps** (🎯)
   - Requirement: Complete 1 exercise
   - Points: 50

2. **Beginner** (🌟)
   - Requirement: Complete 10 levels
   - Points: 100

3. **Intermediate** (⭐)
   - Requirement: Complete 20 levels
   - Points: 200

4. **Advanced** (🔥)
   - Requirement: Complete 30 levels
   - Points: 300

5. **Professional** (💎)
   - Requirement: Complete 40 levels
   - Points: 400

6. **Expert** (👑)
   - Requirement: Complete all 50 levels
   - Points: 500

7. **Speed Demon** (⚡)
   - Requirement: Complete 10 exercises in under 5 minutes each
   - Points: 150

8. **No Hints Needed** (🧠)
   - Requirement: Complete 20 exercises without using hints
   - Points: 250

9. **Persistent** (💪)
   - Requirement: Attempt the same exercise 10 times before succeeding
   - Points: 100

10. **Leaderboard Top 10** (🏆)
    - Requirement: Reach top 10 on leaderboard
    - Points: 300

11. **First Level Complete** (🎁)
    - Requirement: Complete an entire level
    - Points: 75

12. **Perfect Score** (✨)
    - Requirement: Complete a level with 100% accuracy on first try
    - Points: 200

13. **Hint Master** (🔓)
    - Requirement: Use 50 hints throughout journey
    - Points: 50

14. **Solo Master** (🎪)
    - Requirement: Complete 50 exercises without using any hints
    - Points: 350

15. **Speed Runner** (🚀)
    - Requirement: Complete 5 exercises in under 2 minutes each
    - Points: 120

16. **Breakthrough** (💡)
    - Requirement: Complete 5 exercises in a row without any mistakes
    - Points: 180

17. **Comeback Kid** (📈)
    - Requirement: Fail an exercise 5 times then finally complete it
    - Points: 90

18. **Dedicated Learner** (⏱️)
    - Requirement: Spend 10+ hours in the learning game
    - Points: 200

19. **7-Day Streak** (🔥)
    - Requirement: Complete exercises for 7 consecutive days
    - Points: 150

20. **Completionist** (🌈)
    - Requirement: Earn all available achievements
    - Points: 1000

### Backend Service

#### `AchievementChecker.ts`
Autonomous service for checking and awarding achievements.

**Methods:**

`checkAchievementsOnExerciseComplete(userId: string, exerciseId: string)`
- Called automatically after exercise completion
- Checks all applicable achievements
- Emits WebSocket events for unlocked achievements

`checkStreakAchievements(userId: string)`
- Checks 7-day streak achievement
- Called on exercise completion if applicable

`checkPerfectLevelAchievement(userId: string, levelId: number)`
- Checks if level was completed perfectly
- Called when level is marked complete

`checkCompletiontistAchievement(userId: string)`
- Checks if user earned all achievements
- Called periodically or on achievement award

### WebSocket Events

**Server → Client:**

`achievement-unlocked`
```json
{
  "userId": "uuid",
  "achievementId": 0,
  "achievementName": "First Steps",
  "timestamp": "2025-01-05T10:30:00Z"
}
```

`exercise-completed`
```json
{
  "userId": "uuid",
  "exerciseId": "uuid",
  "pointsEarned": 10,
  "totalPoints": 1500
}
```

`leaderboard-updated`
```json
{
  "timestamp": "2025-01-05T10:30:00Z"
}
```

## Database Schema

### Key Tables

**users**
- Stores user account information
- Updated with total_points and current_level

**user_progress**
- Tracks completion status of each exercise
- Records attempts, hints used, time spent
- Supports achievement calculation

**achievements**
- Defines all available achievements
- Includes criteria in JSONB format
- Points reward system

**user_achievements**
- Junction table for user-achievement relationship
- Tracks when achievement was earned
- UNIQUE constraint prevents duplicate awards

**leaderboard** (Materialized View)
- Refreshed after user progress updates
- Ranks users by total_points
- Includes exercises_completed count

## Integration Points

### With Exercise System
- Achievement checker runs after exercise completion
- Automatically updates user stats
- Awards points for achievements

### With Leaderboard
- Leaderboard updated when user earns achievements
- Top 5 displayed on dashboard
- Real-time rank updates via WebSocket

### With Game Page
- Redirect to dashboard after level completion
- Display achievement notifications
- Update sidebar stats

## Real-time Updates

The system uses Socket.io for real-time dashboard updates:

1. **Connection**: Client connects with user ID
2. **Listen**: Client listens for achievement and leaderboard events
3. **Update**: Server broadcasts updates to all connected clients
4. **Refresh**: Dashboard automatically refetches data

## Performance Considerations

- **Caching**: Leaderboard materialized view for fast queries
- **Indexing**: Indexes on frequently queried columns
- **Pagination**: Recent activity limited to 10 items
- **Lazy Loading**: Components render with loading state
- **Debouncing**: WebSocket events debounced to prevent spam

## Future Enhancements

1. **Achievement Tiers**: Expand to 50+ achievements
2. **Team Leaderboards**: Group/class-based rankings
3. **Achievement Badges**: Shareable badges on social media
4. **Custom Challenges**: User-created achievement sets
5. **Analytics Dashboard**: Admin view of player statistics
6. **Seasonal Events**: Limited-time achievements
7. **Progression System**: Prestige/reset system for advanced players
8. **Mentor System**: Help other players and earn achievements

## Testing

### Unit Tests
```bash
npm run test -- useDashboard.test.ts
npm run test -- AchievementBadge.test.tsx
```

### Integration Tests
```bash
npm run test -- progress.routes.test.js
npm run test -- AchievementChecker.test.js
```

### E2E Tests
```bash
npm run test:e2e -- dashboard.spec.ts
```

## Troubleshooting

### Dashboard Not Loading
1. Check JWT token in localStorage
2. Verify API endpoints are responding
3. Check browser console for CORS errors
4. Ensure database is accessible

### Achievements Not Appearing
1. Check achievement criteria in `achievements.js`
2. Verify achievement checker is being called
3. Check `user_achievements` table for entries
4. Ensure user progress data is accurate

### Leaderboard Not Updating
1. Check materialized view refresh function
2. Verify user_progress updates are working
3. Check database for index issues
4. Verify WebSocket connection status

## API Integration Checklist

- [x] User stats endpoint implemented
- [x] Level progress endpoint implemented
- [x] Achievement endpoints implemented
- [x] Recent activity endpoint implemented
- [x] Leaderboard endpoint implemented
- [x] Achievement award endpoint implemented
- [x] WebSocket achievement events
- [x] Frontend hook implementation
- [x] Dashboard page component
- [x] Achievement badge component
- [x] Leaderboard snippet component

## Deployment

### Backend Setup
1. Ensure achievements table is seeded
2. Run migrations for leaderboard view
3. Set up Socket.io server
4. Configure environment variables

### Frontend Setup
1. Configure API base URL
2. Set up Socket.io connection URL
3. Build TypeScript
4. Deploy to production

### Database Setup
```sql
-- Run migrations in order
psql -f schema.sql -d database_name

-- Verify tables exist
\dt

-- Check leaderboard view
SELECT * FROM leaderboard LIMIT 5;
```

## Support

For issues or questions about the dashboard system:
1. Check this documentation
2. Review component prop types
3. Check browser console for errors
4. Review API response formats
5. Check database for data integrity

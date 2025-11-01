export interface User {
  id: string;
  username: string;
  email: string;
  totalPoints: number;
  currentLevel: number;
  createdAt: string;
  lastLogin?: string;
}

export interface Level {
  id: number;
  levelNumber: number;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'professional' | 'expert';
  estimatedTimeMinutes: number;
  pointsReward: number;
  isPublished: boolean;
}

export interface Exercise {
  id: string;
  levelId: number;
  exerciseNumber: number;
  title: string;
  description: string;
  initialSetup?: any;
  validationRules: any;
  hints?: string[];
  solution?: string;
  points: number;
  difficultyStars: number;
}

export interface UserProgress {
  id: string;
  userId: string;
  levelId: number;
  exerciseId: string;
  isCompleted: boolean;
  attempts: number;
  hintsUsed: number;
  completedAt?: string;
  timeSpentSeconds: number;
  pointsEarned: number;
}

export interface Achievement {
  id: number;
  name: string;
  description: string;
  icon: string;
  criteria: any;
  points: number;
  earnedAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  totalPoints: number;
  currentLevel: number;
  exercisesCompleted: number;
}

export interface UserStats {
  username: string;
  totalPoints: number;
  currentLevel: number;
  levelsCompleted: number;
  exercisesCompleted: number;
  timeSpentHours: number;
  leaderboardRank: number;
  joinDate: string;
  avgAttemptsPerExercise: number;
  hintsUsed: number;
  perfectScores: number;
  successRate: number;
  currentStreak: number;
}

export interface LevelProgressItem {
  levelNumber: number;
  title: string;
  totalExercises: number;
  exercisesCompleted: number;
}

export interface RecentActivityItem {
  exerciseTitle: string;
  levelNumber: number;
  points: number;
  timeAgo: string;
}

export interface TerminalCommand {
  command: string;
  output: string;
  isCorrect: boolean;
  timestamp: string;
}

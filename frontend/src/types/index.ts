export interface User {
  id: string;
  username: string;
  email: string;
  totalPoints: number;
  currentLevel: number;
  createdAt: string;
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
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  totalPoints: number;
  currentLevel: number;
  exercisesCompleted: number;
}

export interface TerminalCommand {
  command: string;
  output: string;
  isCorrect: boolean;
  timestamp: string;
}

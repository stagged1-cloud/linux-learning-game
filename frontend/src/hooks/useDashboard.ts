import { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Achievement, LeaderboardEntry } from '../types/index';
import apiClient from '../api/axios';

interface UserStats {
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

interface LevelProgressItem {
  levelNumber: number;
  title: string;
  totalExercises: number;
  exercisesCompleted: number;
}

interface RecentActivityItem {
  exerciseTitle: string;
  levelNumber: number;
  points: number;
  timeAgo: string;
}

export const useDashboard = () => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [levelProgress, setLevelProgress] = useState<LevelProgressItem[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [earnedAchievements, setEarnedAchievements] = useState<Achievement[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [leaderboardTop5, setLeaderboardTop5] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setSocket] = useState<Socket | null>(null);

  // Fetch user stats from backend
  const fetchUserStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/progress/user');

      setUserStats({
        username: response.data.username,
        totalPoints: response.data.totalPoints,
        currentLevel: response.data.currentLevel,
        levelsCompleted: response.data.levelsCompleted,
        exercisesCompleted: response.data.exercisesCompleted,
        timeSpentHours: Math.round(response.data.timeSpentSeconds / 3600),
        leaderboardRank: response.data.leaderboardRank,
        joinDate: new Date(response.data.createdAt).toLocaleDateString(),
        avgAttemptsPerExercise: response.data.avgAttemptsPerExercise,
        hintsUsed: response.data.hintsUsed,
        perfectScores: response.data.perfectScores,
        successRate: response.data.successRate,
        currentStreak: response.data.currentStreak,
      });
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
      setError('Failed to load user statistics');
    }
  }, []);

  // Fetch level progress from backend
  const fetchLevelProgress = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/progress/levels');

      setLevelProgress(
        response.data.map((level: any) => ({
          levelNumber: level.levelNumber,
          title: level.title,
          totalExercises: level.totalExercises,
          exercisesCompleted: level.exercisesCompleted,
        }))
      );
    } catch (err) {
      console.error('Failed to fetch level progress:', err);
    }
  }, []);

  // Fetch all achievements
  const fetchAchievements = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/progress/achievements/all');
      setAchievements(response.data);
    } catch (err) {
      console.error('Failed to fetch achievements:', err);
    }
  }, []);

  // Fetch earned achievements
  const fetchEarnedAchievements = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/progress/achievements');
      setEarnedAchievements(response.data);
    } catch (err) {
      console.error('Failed to fetch earned achievements:', err);
    }
  }, []);

  // Fetch recent activity
  const fetchRecentActivity = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/progress/recent-activity');

      setRecentActivity(
        response.data.map((activity: any) => ({
          exerciseTitle: activity.exerciseTitle,
          levelNumber: activity.levelNumber,
          points: activity.pointsEarned,
          timeAgo: formatTimeAgo(activity.completedAt),
        }))
      );
    } catch (err) {
      console.error('Failed to fetch recent activity:', err);
    }
  }, []);

  // Fetch leaderboard top 5
  const fetchLeaderboard = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/progress/leaderboard?limit=5');

      setLeaderboardTop5(
        response.data.map((entry: any) => ({
          rank: entry.rank,
          username: entry.username,
          totalPoints: entry.totalPoints,
          currentLevel: entry.currentLevel,
          exercisesCompleted: entry.exercisesCompleted,
        }))
      );
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  }, []);

  // Initialize WebSocket for real-time updates
  const initializeSocket = useCallback(() => {
    try {
      const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token'),
        },
      });

      newSocket.on('connect', () => {
        console.log('Dashboard WebSocket connected');
        newSocket.emit('authenticate', {
          userId: localStorage.getItem('userId'),
        });
      });

      // Listen for real-time updates
      newSocket.on('achievement-unlocked', (data) => {
        console.log('Achievement unlocked:', data);
        fetchEarnedAchievements();
        fetchUserStats();
      });

      newSocket.on('exercise-completed', (data) => {
        console.log('Exercise completed:', data);
        fetchUserStats();
        fetchLevelProgress();
        fetchRecentActivity();
      });

      newSocket.on('leaderboard-updated', () => {
        fetchLeaderboard();
      });

      newSocket.on('error', (err) => {
        console.error('WebSocket error:', err);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } catch (err) {
      console.error('Failed to initialize socket:', err);
    }
  }, [fetchEarnedAchievements, fetchUserStats, fetchLevelProgress, fetchRecentActivity, fetchLeaderboard]);

  // Load all data on mount
  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchUserStats(),
          fetchLevelProgress(),
          fetchAchievements(),
          fetchEarnedAchievements(),
          fetchRecentActivity(),
          fetchLeaderboard(),
        ]);
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
    initializeSocket();
  }, [
    fetchUserStats,
    fetchLevelProgress,
    fetchAchievements,
    fetchEarnedAchievements,
    fetchRecentActivity,
    fetchLeaderboard,
    initializeSocket,
  ]);

  return {
    userStats,
    levelProgress,
    achievements,
    earnedAchievements,
    recentActivity,
    leaderboardTop5,
    loading,
    error,
    refetch: {
      userStats: fetchUserStats,
      levelProgress: fetchLevelProgress,
      achievements: fetchAchievements,
      earnedAchievements: fetchEarnedAchievements,
      recentActivity: fetchRecentActivity,
      leaderboard: fetchLeaderboard,
    },
  };
};

// Helper function to format time ago
function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;

  return then.toLocaleDateString();
}
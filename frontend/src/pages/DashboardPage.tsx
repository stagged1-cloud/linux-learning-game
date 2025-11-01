import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDashboard } from '../hooks/useDashboard';
import AchievementBadge from '../components/AchievementBadge';
import LeaderboardSnippet from '../components/LeaderboardSnippet';

const DashboardPage: React.FC = () => {
  const {
    userStats,
    levelProgress,
    achievements,
    earnedAchievements,
    recentActivity,
    leaderboardTop5,
    loading,
    error,
  } = useDashboard();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-white text-xl">Loading your dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-red-400 text-xl">{error}</div>
      </div>
    );
  }

  const totalLevels = 50;
  const levelsCompleted = userStats?.levelsCompleted || 0;
  const overallProgress = (levelsCompleted / totalLevels) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-blue-100 mt-2">Track your progress and achievements</p>
          </div>
          <Link
            to="/game"
            className="px-6 py-3 bg-white text-purple-600 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-lg"
          >
            Continue Learning
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Profile Card */}
        <div className="bg-slate-800 rounded-lg shadow-xl p-8 mb-8 border border-slate-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2">{userStats?.username || 'Player'}</h2>
              <p className="text-slate-400 mb-6">Level {userStats?.currentLevel || 1} • Joined {userStats?.joinDate || 'Recently'}</p>
              
              {/* Key Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-700 rounded p-4 border border-slate-600">
                  <div className="text-sm text-slate-400">Total Points</div>
                  <div className="text-3xl font-bold text-yellow-400">{userStats?.totalPoints || 0}</div>
                </div>
                <div className="bg-slate-700 rounded p-4 border border-slate-600">
                  <div className="text-sm text-slate-400">Exercises Done</div>
                  <div className="text-3xl font-bold text-green-400">{userStats?.exercisesCompleted || 0}</div>
                </div>
                <div className="bg-slate-700 rounded p-4 border border-slate-600">
                  <div className="text-sm text-slate-400">Achievements</div>
                  <div className="text-3xl font-bold text-purple-400">{earnedAchievements?.length || 0}</div>
                </div>
                <div className="bg-slate-700 rounded p-4 border border-slate-600">
                  <div className="text-sm text-slate-400">Time Spent</div>
                  <div className="text-3xl font-bold text-blue-400">{userStats?.timeSpentHours || 0}h</div>
                </div>
              </div>
            </div>

            {/* Rank Badge */}
            <div className="mt-6 md:mt-0 md:ml-8 flex flex-col items-center">
              <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg border-4 border-yellow-300">
                <span className="text-6xl">🏆</span>
              </div>
              <div className="mt-4 text-center">
                <p className="text-slate-400 text-sm">Current Rank</p>
                <p className="text-3xl font-bold text-yellow-400">#{userStats?.leaderboardRank || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-slate-800 rounded-lg shadow-xl p-6 mb-8 border border-slate-700">
          <h3 className="text-2xl font-bold mb-4">Overall Progress</h3>
          <div className="mb-4">
            <div className="flex justify-between mb-2">
              <span className="text-lg">Levels: {levelsCompleted} / {totalLevels}</span>
              <span className="text-lg font-bold text-green-400">{Math.round(overallProgress)}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-4 overflow-hidden border border-slate-600">
              <div
                className="bg-gradient-to-r from-green-400 to-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${overallProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Level Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Detailed Level Progress */}
          <div className="bg-slate-800 rounded-lg shadow-xl p-6 border border-slate-700">
            <h3 className="text-2xl font-bold mb-6">Level Progress</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {levelProgress && levelProgress.length > 0 ? (
                levelProgress.map((level, idx) => (
                  <div key={idx} className="bg-slate-700 rounded p-3 border border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">Level {level.levelNumber}: {level.title}</span>
                      <span className="text-sm text-slate-400">{level.exercisesCompleted}/{level.totalExercises}</span>
                    </div>
                    <div className="w-full bg-slate-600 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-cyan-400 h-full rounded-full transition-all"
                        style={{ width: `${(level.exercisesCompleted / level.totalExercises) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">No level data available yet.</p>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-slate-800 rounded-lg shadow-xl p-6 border border-slate-700">
            <h3 className="text-2xl font-bold mb-6">Statistics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-slate-700 rounded border border-slate-600">
                <span className="text-slate-300">Average Attempts per Exercise</span>
                <span className="text-xl font-bold text-cyan-400">{userStats?.avgAttemptsPerExercise?.toFixed(1) || '0.0'}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700 rounded border border-slate-600">
                <span className="text-slate-300">Hints Used</span>
                <span className="text-xl font-bold text-amber-400">{userStats?.hintsUsed || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700 rounded border border-slate-600">
                <span className="text-slate-300">Perfect Scores (No Hints)</span>
                <span className="text-xl font-bold text-green-400">{userStats?.perfectScores || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700 rounded border border-slate-600">
                <span className="text-slate-300">Success Rate</span>
                <span className="text-xl font-bold text-purple-400">{userStats?.successRate || 0}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-slate-700 rounded border border-slate-600">
                <span className="text-slate-300">Streak (Days)</span>
                <span className="text-xl font-bold text-pink-400">{userStats?.currentStreak || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements Section */}
        <div className="bg-slate-800 rounded-lg shadow-xl p-6 mb-8 border border-slate-700">
          <h3 className="text-2xl font-bold mb-6">Achievements & Badges</h3>
          {earnedAchievements && earnedAchievements.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {earnedAchievements.map((achievement) => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  earned={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 text-lg">Start completing exercises to earn achievements!</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-slate-800 rounded-lg shadow-xl p-6 mb-8 border border-slate-700">
          <h3 className="text-2xl font-bold mb-6">Recent Activity</h3>
          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity, idx) => (
                <div key={idx} className="bg-slate-700 rounded p-4 border-l-4 border-green-400 border border-slate-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{activity.exerciseTitle}</p>
                      <p className="text-sm text-slate-400">Level {activity.levelNumber} • {activity.points} points</p>
                    </div>
                    <p className="text-slate-300 text-sm">{activity.timeAgo}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400">No recent activity yet. Start an exercise!</p>
          )}
        </div>

        {/* Leaderboard Snippet */}
        <div className="bg-slate-800 rounded-lg shadow-xl p-6 border border-slate-700">
          <h3 className="text-2xl font-bold mb-6">Top Players</h3>
          <LeaderboardSnippet leaderboard={leaderboardTop5 || []} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

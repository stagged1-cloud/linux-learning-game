import React from 'react';
import { LeaderboardEntry } from '../types/index';

interface LeaderboardSnippetProps {
  leaderboard: LeaderboardEntry[];
}

const LeaderboardSnippet: React.FC<LeaderboardSnippetProps> = ({ leaderboard }) => {
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '🎖️';
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 border-yellow-300';
      case 2:
        return 'bg-gradient-to-r from-slate-300 to-slate-500 border-slate-200';
      case 3:
        return 'bg-gradient-to-r from-orange-400 to-orange-600 border-orange-300';
      default:
        return 'bg-slate-700 border-slate-600';
    }
  };

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">Leaderboard data loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {leaderboard.map((entry, idx) => (
        <div
          key={idx}
          className={`${getRankColor(entry.rank)} rounded-lg p-4 border-2 transition-all hover:shadow-lg`}
        >
          <div className="flex items-center justify-between">
            {/* Rank and Username */}
            <div className="flex items-center space-x-4 flex-1">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-black bg-opacity-20">
                <span className="text-2xl">{getRankBadge(entry.rank)}</span>
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg">
                  #{entry.rank} - {entry.username}
                </p>
                <p className="text-sm opacity-75">
                  Level {entry.currentLevel} • {entry.exercisesCompleted} exercises
                </p>
              </div>
            </div>

            {/* Points */}
            <div className="text-right">
              <p className="text-2xl font-bold">{entry.totalPoints}</p>
              <p className="text-xs opacity-75">points</p>
            </div>
          </div>
        </div>
      ))}

      {/* See All Link */}
      <div className="pt-4 text-center">
        <a
          href="/leaderboard"
          className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
        >
          View Full Leaderboard →
        </a>
      </div>
    </div>
  );
};

export default LeaderboardSnippet;

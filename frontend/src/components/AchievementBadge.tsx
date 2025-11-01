import React, { useState } from 'react';
import { Achievement } from '../types/index';

interface AchievementBadgeProps {
  achievement: Achievement;
  earned: boolean;
  progress?: {
    current: number;
    target: number;
  };
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  achievement,
  earned,
  progress,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const progressPercentage = progress
    ? (progress.current / progress.target) * 100
    : earned
    ? 100
    : 0;

  const achievementEmoji: { [key: string]: string } = {
    '🎯': 'First Steps',
    '🌟': 'Beginner',
    '⭐': 'Intermediate',
    '🔥': 'Advanced',
    '💎': 'Professional',
    '👑': 'Expert',
    '⚡': 'Speed Demon',
    '🧠': 'No Hints Needed',
    '💪': 'Persistent',
    '🏆': 'Leaderboard Top 10',
    '🎁': 'First Level Complete',
    '🚀': 'Level Skipped',
    '✨': 'Perfect Score',
    '🔓': 'Hint Master',
    '📊': 'Statistician',
    '🎪': 'Completionist',
    '⏱️': 'Speed Runner',
    '🧩': 'Puzzle Solver',
    '💡': 'Breakthrough',
    '🌈': 'Rainbow Collector',
  };

  return (
    <div
      className="relative group cursor-help"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Badge Container */}
      <div
        className={`w-24 h-24 rounded-lg flex flex-col items-center justify-center transition-all transform group-hover:scale-110 ${
          earned
            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 shadow-lg shadow-yellow-500/50'
            : 'bg-slate-700 opacity-50 grayscale'
        }`}
      >
        {/* Achievement Icon */}
        <div className="text-4xl mb-1">{achievement.icon}</div>
        
        {/* Points Badge */}
        {earned && (
          <div className="text-xs font-bold text-white bg-black bg-opacity-50 px-2 py-1 rounded">
            +{achievement.points}
          </div>
        )}
      </div>

      {/* Progress Ring (if not earned) */}
      {!earned && progress && (
        <div className="absolute inset-0 rounded-lg">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
            {/* Background circle */}
            <circle
              cx="48"
              cy="48"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-slate-600"
            />
            {/* Progress circle */}
            <circle
              cx="48"
              cy="48"
              r="44"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${(2 * Math.PI * 44 * progressPercentage) / 100} ${2 * Math.PI * 44}`}
              className="text-blue-400 transition-all duration-300"
            />
          </svg>
          {/* Progress percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-slate-300">
              {Math.round(progressPercentage)}%
            </span>
          </div>
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-slate-700 rotate-45"></div>

          {/* Tooltip Content */}
          <div className="relative z-10">
            <h4 className="font-bold text-white mb-1">{achievement.name}</h4>
            <p className="text-sm text-slate-300 mb-2">{achievement.description}</p>

            {/* Unlock Condition */}
            {earned ? (
              <div className="flex items-center text-xs text-green-400 font-semibold">
                <span className="mr-1">✓</span> Unlocked
              </div>
            ) : progress ? (
              <div className="text-xs text-slate-400">
                <p>Progress: {progress.current} / {progress.target}</p>
                <div className="w-full bg-slate-700 rounded-full h-1 mt-1 overflow-hidden">
                  <div
                    className="bg-blue-400 h-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
              </div>
            ) : (
              <div className="flex items-center text-xs text-slate-400 font-semibold">
                <span className="mr-1">🔒</span> Locked
              </div>
            )}

            {/* Points Value */}
            <div className="mt-2 pt-2 border-t border-slate-700">
              <p className="text-xs text-yellow-400 font-semibold">
                Reward: {achievement.points} points
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AchievementBadge;

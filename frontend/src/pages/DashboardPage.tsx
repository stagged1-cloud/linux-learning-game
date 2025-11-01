import React from 'react';
import { Link } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  // Mock data - will be replaced with API calls
  const user = {
    username: 'Student',
    totalPoints: 0,
    currentLevel: 1,
  };

  const recentProgress = [
    { level: 1, exercise: 1, completed: false, points: 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link to="/" className="text-2xl font-bold text-blue-400">
            Linux Game
          </Link>
          <Link
            to="/game"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            Continue Learning
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Current Level</div>
            <div className="text-3xl font-bold text-blue-400">{user.currentLevel}</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Total Points</div>
            <div className="text-3xl font-bold text-green-400">{user.totalPoints}</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Completed</div>
            <div className="text-3xl font-bold text-yellow-400">0/250</div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-gray-400 text-sm mb-2">Achievements</div>
            <div className="text-3xl font-bold text-purple-400">0</div>
          </div>
        </div>

        {/* Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-3">
              {recentProgress.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between bg-gray-700 rounded p-4">
                  <div>
                    <div className="font-semibold">
                      Level {item.level} - Exercise {item.exercise}
                    </div>
                    <div className="text-sm text-gray-400">
                      {item.completed ? 'Completed' : 'In Progress'}
                    </div>
                  </div>
                  <div className="text-green-400 font-semibold">
                    {item.points} pts
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">Achievements</h2>
            <div className="text-center text-gray-500 py-8">
              <div className="text-6xl mb-4">🏆</div>
              <p>Complete your first exercise to earn achievements!</p>
            </div>
          </div>
        </div>

        {/* Level Progress */}
        <div className="bg-gray-800 rounded-lg p-6 mt-6">
          <h2 className="text-2xl font-semibold mb-4">Level Progress</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {Array.from({ length: 50 }, (_, i) => i + 1).map((level) => (
              <div
                key={level}
                className={`p-4 rounded text-center ${
                  level === 1
                    ? 'bg-blue-600'
                    : level < 1
                    ? 'bg-green-600'
                    : 'bg-gray-700'
                }`}
              >
                <div className="font-semibold">Level {level}</div>
                <div className="text-sm text-gray-300">
                  {level === 1 ? 'Current' : level < 1 ? 'Complete' : 'Locked'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

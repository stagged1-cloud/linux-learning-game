import React, { useState } from 'react';
import Terminal from '../components/Terminal';
import { Link } from 'react-router-dom';

const GamePage: React.FC = () => {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentExercise, setCurrentExercise] = useState(1);
  const [showHint, setShowHint] = useState(false);

  // Mock data - will be replaced with API calls
  const exercise = {
    id: '1',
    title: 'Your First Command',
    description: 'Use the "pwd" command to print your current working directory.',
    hints: [
      'The pwd command stands for "print working directory"',
      'Just type: pwd',
      'Remember to press Enter after typing the command'
    ],
    points: 10,
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-2xl font-bold text-blue-400">
              Linux Game
            </Link>
            <div className="text-sm text-gray-400">
              Level {currentLevel} - Exercise {currentExercise}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-400">
              Points: <span className="text-green-400 font-semibold">0</span>
            </div>
            <Link
              to="/dashboard"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-sm"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Exercise Panel */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-2xl font-bold mb-4 text-blue-400">
                {exercise.title}
              </h2>
              <p className="text-gray-300 mb-6">
                {exercise.description}
              </p>
              
              <div className="space-y-4">
                <button
                  onClick={() => setShowHint(!showHint)}
                  className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded transition-colors"
                >
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </button>

                {showHint && (
                  <div className="bg-gray-700 rounded p-4">
                    <p className="text-sm text-yellow-300">
                      💡 {exercise.hints[0]}
                    </p>
                  </div>
                )}

                <div className="text-sm text-gray-400">
                  Reward: <span className="text-green-400">{exercise.points} points</span>
                </div>
              </div>
            </div>

            {/* Level Navigation */}
            <div className="bg-gray-800 rounded-lg p-6 shadow-lg mt-6">
              <h3 className="text-lg font-semibold mb-4">Level 1: Basics</h3>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => setCurrentExercise(num)}
                    className={`p-2 rounded text-sm ${
                      currentExercise === num
                        ? 'bg-blue-600'
                        : 'bg-gray-700 hover:bg-gray-600'
                    } transition-colors`}
                  >
                    Ex {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Terminal */}
          <div className="lg:col-span-2">
            <Terminal 
              exerciseId={exercise.id}
              onCommandExecuted={(cmd, correct) => {
                console.log('Command executed:', cmd, correct);
              }}
            />

            {/* Instructions */}
            <div className="mt-6 bg-gray-800 rounded-lg p-4 text-sm text-gray-400">
              <p className="mb-2">
                <strong className="text-white">Tip:</strong> Type commands in the terminal above and press Enter to execute them.
              </p>
              <p>
                Use <code className="bg-gray-700 px-2 py-1 rounded">Ctrl+C</code> to cancel a command.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GamePage;

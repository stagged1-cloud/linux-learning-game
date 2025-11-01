import React, { useState } from 'react';
import { Exercise } from '../types/index';

interface ExercisePanelProps {
  exercise: Exercise | null;
  isCompleted: boolean;
  currentHint: string | null;
  currentHintIndex: number;
  hints: string[];
  attempts: number;
  hintsUsed: number;
  loading: boolean;
  onShowHint: () => void;
  onNextHint: () => void;
  onPreviousHint: () => void;
  onRequestAIHint: () => Promise<string | null>;
  validationMessage?: string;
  validationStatus?: 'success' | 'error' | null;
}

const ExercisePanel: React.FC<ExercisePanelProps> = ({
  exercise,
  isCompleted,
  currentHint,
  currentHintIndex,
  hints,
  attempts,
  hintsUsed,
  loading,
  onShowHint,
  onNextHint,
  onPreviousHint,
  onRequestAIHint,
  validationMessage,
  validationStatus,
}) => {
  const [aiHintLoading, setAiHintLoading] = useState(false);
  const [aiHint, setAiHint] = useState<string | null>(null);

  const handleRequestAIHint = async () => {
    setAiHintLoading(true);
    try {
      const hint = await onRequestAIHint();
      if (hint) {
        setAiHint(hint);
      }
    } finally {
      setAiHintLoading(false);
    }
  };

  const renderDifficultyStars = (stars: number) => {
    return (
      <div className="flex items-center space-x-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`text-lg ${
              i < stars ? 'text-yellow-400' : 'text-gray-600'
            }`}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading exercise...</p>
        </div>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg h-full flex items-center justify-center">
        <p className="text-gray-400">No exercise selected</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg h-full overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-3">
          <h2 className="text-2xl font-bold text-blue-400">{exercise.title}</h2>
          {isCompleted && (
            <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              ✓ Completed
            </span>
          )}
        </div>

        {/* Difficulty Stars */}
        <div className="mb-4">
          {renderDifficultyStars(exercise.difficultyStars)}
        </div>

        {/* Points */}
        <div className="inline-block bg-gray-700 rounded px-3 py-1 text-sm text-green-400 font-semibold">
          {exercise.points} points
        </div>
      </div>

      {/* Description */}
      <div className="mb-6 pb-6 border-b border-gray-700">
        <p className="text-gray-300 text-base leading-relaxed">
          {exercise.description}
        </p>
      </div>

      {/* Validation Feedback */}
      {validationMessage && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            validationStatus === 'success'
              ? 'bg-green-900 border-green-600 text-green-100'
              : 'bg-red-900 border-red-600 text-red-100'
          }`}
        >
          <p className="font-semibold">
            {validationStatus === 'success' ? '✓ Success!' : '✗ Try again'}
          </p>
          <p className="text-sm mt-1">{validationMessage}</p>
        </div>
      )}

      {/* Hints Section */}
      <div className="mb-6 pb-6 border-b border-gray-700">
        <h3 className="font-semibold text-gray-200 mb-3 flex items-center space-x-2">
          <span>💡 Hints</span>
          {hintsUsed > 0 && (
            <span className="text-xs bg-gray-700 px-2 py-1 rounded">
              Used: {hintsUsed}
            </span>
          )}
        </h3>

        {currentHint ? (
          <div className="space-y-3">
            <div className="bg-gray-700 rounded p-4 border-l-4 border-yellow-500">
              <p className="text-yellow-100 text-sm">{currentHint}</p>
              <p className="text-xs text-gray-400 mt-2">
                Hint {currentHintIndex + 1} of {hints.length}
              </p>
            </div>

            {/* Hint Navigation */}
            <div className="flex gap-2">
              <button
                onClick={onPreviousHint}
                disabled={currentHintIndex === 0}
                className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm"
              >
                ← Previous
              </button>
              <button
                onClick={onNextHint}
                disabled={currentHintIndex === hints.length - 1}
                className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors text-sm"
              >
                Next →
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onShowHint}
            className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded transition-colors font-semibold"
          >
            Show First Hint
          </button>
        )}
      </div>

      {/* AI Hint */}
      <div className="mb-6 pb-6 border-b border-gray-700">
        <button
          onClick={handleRequestAIHint}
          disabled={aiHintLoading}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors font-semibold flex items-center justify-center space-x-2"
        >
          <span>🤖</span>
          <span>{aiHintLoading ? 'Getting hint...' : 'Ask AI Tutor'}</span>
        </button>

        {aiHint && (
          <div className="mt-3 bg-purple-900 border-l-4 border-purple-400 rounded p-4">
            <p className="text-purple-100 text-sm">{aiHint}</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mt-auto">
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-700 rounded">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Attempts</p>
            <p className="text-2xl font-bold text-blue-400">{attempts}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Hints Used</p>
            <p className="text-2xl font-bold text-yellow-400">{hintsUsed}</p>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {isCompleted && (
        <div className="mt-4 p-4 bg-green-900 rounded-lg border border-green-600">
          <p className="text-green-100 text-sm font-semibold">
            🎉 Congratulations! You've completed this exercise.
          </p>
        </div>
      )}
    </div>
  );
};

export default ExercisePanel;

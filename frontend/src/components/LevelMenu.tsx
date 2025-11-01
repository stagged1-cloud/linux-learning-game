import React, { useState, useEffect } from 'react';

interface LevelData {
  levelNumber: number;
  title: string;
  description: string;
  difficulty: string;
  pointsReward: number;
  isUnlocked: boolean;
  isCompleted: boolean;
  completionPercentage: number;
  exercisesCompleted: number;
  totalExercises: number;
}

interface LevelMenuProps {
  selectedLevel: number;
  onSelectLevel: (levelNumber: number) => void;
  onSelectExercise: (exerciseNumber: number) => void;
  totalPoints: number;
}

const LevelMenu: React.FC<LevelMenuProps> = ({
  selectedLevel,
  onSelectLevel,
  onSelectExercise,
  totalPoints,
}) => {
  const [levels, setLevels] = useState<LevelData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLevel, setExpandedLevel] = useState<number | null>(selectedLevel);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Generate mock levels for now (will be replaced with API call)
  useEffect(() => {
    const generateMockLevels = () => {
      const mockLevels: LevelData[] = [];
      const difficulties = ['beginner', 'intermediate', 'advanced', 'professional', 'expert'];

      for (let i = 1; i <= 50; i++) {
        const difficulty = difficulties[Math.floor((i - 1) / 10) % difficulties.length];
        const isUnlocked = i <= selectedLevel + 5; // Simulate unlock progression

        mockLevels.push({
          levelNumber: i,
          title: `Level ${i}: ${getDifficultyTitle(difficulty)}`,
          description: `Master ${difficulty}-level Linux concepts`,
          difficulty,
          pointsReward: 100 + (i - 1) * 10,
          isUnlocked,
          isCompleted: false, // TODO: Fetch from API
          completionPercentage: 0, // TODO: Fetch from API
          exercisesCompleted: 0, // TODO: Fetch from API
          totalExercises: 5,
        });
      }

      return mockLevels;
    };

    try {
      setLoading(true);
      // In production, replace with: const response = await axios.get(`${apiUrl}/levels`);
      // For now, using mock data
      setLevels(generateMockLevels());
      setLoading(false);
    } catch (err) {
      console.error('Failed to load levels:', err);
      setLoading(false);
    }
  }, [selectedLevel, apiUrl]);

  const getDifficultyTitle = (difficulty: string): string => {
    const titles: { [key: string]: string } = {
      beginner: 'Basics',
      intermediate: 'Intermediate',
      advanced: 'Advanced',
      professional: 'Professional',
      expert: 'Expert',
    };
    return titles[difficulty] || difficulty;
  };

  const getDifficultyColor = (difficulty: string): string => {
    const colors: { [key: string]: string } = {
      beginner: 'bg-green-600',
      intermediate: 'bg-blue-600',
      advanced: 'bg-yellow-600',
      professional: 'bg-orange-600',
      expert: 'bg-red-600',
    };
    return colors[difficulty] || 'bg-gray-600';
  };

  const handleLevelSelect = (levelNumber: number) => {
    onSelectLevel(levelNumber);
    setExpandedLevel(levelNumber);
    onSelectExercise(1);
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
        <div className="flex items-center justify-center h-40">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
            <p className="text-gray-400 text-sm">Loading levels...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Points Display */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-4 shadow-lg">
        <p className="text-gray-200 text-sm uppercase tracking-wider">Total Points</p>
        <p className="text-4xl font-bold text-white">{totalPoints}</p>
      </div>

      {/* Levels List */}
      <div className="bg-gray-800 rounded-lg shadow-lg divide-y divide-gray-700">
        {levels.map((level) => (
          <div key={level.levelNumber} className="transition-all">
            {/* Level Header */}
            <button
              onClick={() => handleLevelSelect(level.levelNumber)}
              disabled={!level.isUnlocked}
              className={`w-full p-4 text-left hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                selectedLevel === level.levelNumber ? 'bg-blue-900' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">
                      {level.isCompleted ? '✅' : level.isUnlocked ? '🔓' : '🔒'}
                    </span>
                    <div>
                      <h4 className="font-semibold text-white">{level.title}</h4>
                      <p className="text-xs text-gray-400">{level.description}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {level.isUnlocked && (
                    <div className="w-full bg-gray-700 rounded-full h-2 mt-2 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          level.isCompleted ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${level.completionPercentage}%` }}
                      ></div>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2">
                    {level.exercisesCompleted}/{level.totalExercises} exercises
                  </p>
                </div>

                <div className="text-right ml-4">
                  <span
                    className={`inline-block px-3 py-1 rounded text-xs font-semibold text-white ${getDifficultyColor(
                      level.difficulty
                    )}`}
                  >
                    {getDifficultyTitle(level.difficulty)}
                  </span>
                  <p className="text-sm text-green-400 font-semibold mt-2">
                    +{level.pointsReward}
                  </p>
                </div>
              </div>
            </button>

            {/* Exercise List - Expanded */}
            {expandedLevel === level.levelNumber && level.isUnlocked && (
              <div className="bg-gray-750 p-4 border-t border-gray-600">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Exercises
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: level.totalExercises }).map((_, i) => {
                    const exerciseNumber = i + 1;
                    const isExerciseCompleted = exerciseNumber <= level.exercisesCompleted;
                    return (
                      <button
                        key={exerciseNumber}
                        onClick={() => onSelectExercise(exerciseNumber)}
                        className={`p-2 rounded text-sm font-semibold transition-colors ${
                          isExerciseCompleted
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                        }`}
                      >
                        {isExerciseCompleted ? '✓' : exerciseNumber}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Unlock Information */}
      <div className="bg-blue-900 border border-blue-600 rounded-lg p-4 text-sm text-blue-100">
        <p className="font-semibold mb-1">💡 Tip</p>
        <p>Complete exercises to unlock new levels and earn points!</p>
      </div>
    </div>
  );
};

export default LevelMenu;

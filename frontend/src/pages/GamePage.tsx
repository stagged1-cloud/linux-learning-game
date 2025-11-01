import React, { useState, useCallback, useEffect } from 'react';
import Terminal from '../components/Terminal';
import ExercisePanel from '../components/ExercisePanel';
import LevelMenu from '../components/LevelMenu';
import { Link } from 'react-router-dom';
import axios from 'axios';

interface Exercise {
  id: string;
  level_id: number;
  exercise_number: number;
  title: string;
  description: string;
  points: number;
  difficulty: number;
  hints: string[];
  expected_command?: string;
  validation_type?: string;
  validation_pattern?: string;
}

const GamePage: React.FC = () => {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentExerciseNumber, setCurrentExerciseNumber] = useState(1);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalPoints, setTotalPoints] = useState(0);
  const [validationFeedback, setValidationFeedback] = useState<{
    message: string;
    status: 'success' | 'error';
  } | null>(null);
  const [showAchievementNotification, setShowAchievementNotification] = useState(false);
  const [achievementText, setAchievementText] = useState('');
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Fetch exercises for current level
  useEffect(() => {
    const fetchExercises = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${apiUrl}/levels/${currentLevel}/exercises`);
        console.log('Fetched exercises:', response.data);
        
        // Extract exercises array from response
        const exercisesList = response.data.exercises || response.data;
        setExercises(exercisesList);
        
        // Set current exercise based on exercise number
        const exercise = exercisesList.find((ex: Exercise) => ex.exercise_number === currentExerciseNumber);
        if (exercise) {
          setCurrentExercise(exercise);
          console.log('Current exercise:', exercise);
        } else {
          console.error('Exercise not found for number:', currentExerciseNumber);
        }
      } catch (error) {
        console.error('Failed to fetch exercises:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, [currentLevel, currentExerciseNumber, apiUrl]);

  const handleCommandExecuted = useCallback(async (command: string, isCorrect: boolean) => {
    if (!currentExercise) return;

    if (isCorrect) {
      setValidationFeedback({
        message: 'Correct! Moving to next exercise...',
        status: 'success',
      });
      setAchievementText(`+${currentExercise.points} points!`);
      setShowAchievementNotification(true);
      setTotalPoints(prev => prev + currentExercise.points);

      // Reset hint index
      setCurrentHintIndex(-1);

      setTimeout(() => {
        setShowAchievementNotification(false);
        if (currentExerciseNumber < 5) {
          setCurrentExerciseNumber(prev => prev + 1);
        } else if (currentLevel < 50) {
          setCurrentLevel(prev => prev + 1);
          setCurrentExerciseNumber(1);
        }
        setValidationFeedback(null);
      }, 2000);

      // Submit to backend
      try {
        await axios.post(`${apiUrl}/progress/complete`, {
          exerciseId: currentExercise.id,
          levelId: currentLevel,
          attempts: 1,
          hintsUsed: Math.max(0, currentHintIndex + 1),
          pointsEarned: currentExercise.points,
        });
      } catch (error) {
        console.error('Failed to submit progress:', error);
      }
    } else {
      setValidationFeedback({
        message: 'Try again. Use the hints if you need help!',
        status: 'error',
      });
    }
  }, [currentExercise, currentExerciseNumber, currentLevel, currentHintIndex, apiUrl]);

  const handleSelectLevel = useCallback((levelNumber: number) => {
    setCurrentLevel(levelNumber);
    setCurrentExerciseNumber(1);
    setValidationFeedback(null);
    setCurrentHintIndex(-1);
  }, []);

  const handleSelectExercise = useCallback((exerciseNumber: number) => {
    setCurrentExerciseNumber(exerciseNumber);
    setValidationFeedback(null);
    setCurrentHintIndex(-1);
  }, []);

  const handleShowHint = useCallback(() => {
    if (currentHintIndex === -1) {
      setCurrentHintIndex(0);
    }
  }, [currentHintIndex]);

  const handleNextHint = useCallback(() => {
    if (currentExercise && currentHintIndex < currentExercise.hints.length - 1) {
      setCurrentHintIndex(prev => prev + 1);
    }
  }, [currentExercise, currentHintIndex]);

  const handlePreviousHint = useCallback(() => {
    if (currentHintIndex > 0) {
      setCurrentHintIndex(prev => prev - 1);
    }
  }, [currentHintIndex]);

  const progressPercentage = (currentExerciseNumber / 5) * 100;

  if (loading || !currentExercise) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading exercise...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow-lg border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <Link to="/" className="text-2xl font-bold text-blue-400 hover:text-blue-300">
              Linux Game
            </Link>
            <div className="text-gray-400 text-sm">
              Level {currentLevel} • Exercise {currentExerciseNumber}/5
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            {/* Progress Bar */}
            <div className="flex items-center space-x-2">
              <div className="w-64 h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-400">{Math.round(progressPercentage)}%</span>
            </div>

            {/* Points Display */}
            <div className="text-right">
              <div className="text-xs text-gray-400">POINTS</div>
              <div className="text-2xl font-bold text-green-400">{totalPoints}</div>
            </div>

            <Link 
              to="/dashboard"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Level Menu */}
        <aside className="w-80 bg-gray-800 border-r border-gray-700 overflow-y-auto">
          <LevelMenu
            selectedLevel={currentLevel}
            totalPoints={totalPoints}
            onSelectLevel={handleSelectLevel}
            onSelectExercise={handleSelectExercise}
          />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Terminal */}
          <div className="flex-1 flex flex-col bg-gray-900 p-4 overflow-hidden">
            <Terminal
              exerciseId={currentExercise.id}
              levelId={currentLevel}
              onCommandExecuted={handleCommandExecuted}
              validationFeedback={validationFeedback}
            />
          </div>

          {/* Exercise Panel */}
          <div className="w-full lg:w-96 bg-gray-800 border-l border-gray-700 overflow-y-auto">
            <ExercisePanel
              exercise={{
                ...currentExercise,
                levelId: currentLevel,
                exerciseNumber: currentExerciseNumber,
                difficultyStars: currentExercise.difficulty,
                solution: currentExercise.expected_command || '',
                validationRules: {
                  command: currentExercise.expected_command || '',
                },
              }}
              isCompleted={false}
              currentHint={currentHintIndex >= 0 && currentExercise.hints[currentHintIndex] ? currentExercise.hints[currentHintIndex] : null}
              currentHintIndex={currentHintIndex}
              hints={currentExercise.hints}
              attempts={0}
              hintsUsed={Math.max(0, currentHintIndex + 1)}
              loading={false}
              onShowHint={handleShowHint}
              onNextHint={handleNextHint}
              onPreviousHint={handlePreviousHint}
              onRequestAIHint={async () => {
                try {
                  const response = await axios.post(`${apiUrl}/tutor/hint`, {
                    exerciseId: currentExercise.id,
                    description: currentExercise.description,
                    previousHints: currentExercise.hints,
                  });
                  return response.data.hint;
                } catch (error) {
                  console.error('Failed to get AI hint:', error);
                  return null;
                }
              }}
            />
          </div>
        </main>
      </div>

      {/* Achievement Notification */}
      {showAchievementNotification && (
        <div className="fixed bottom-8 right-8 bg-gradient-to-r from-green-500 to-blue-500 text-white px-6 py-4 rounded-lg shadow-2xl animate-bounce">
          <div className="text-2xl font-bold">{achievementText}</div>
        </div>
      )}
    </div>
  );
};

export default GamePage;

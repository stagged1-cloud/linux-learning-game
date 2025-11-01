import React, { useState, useCallback } from 'react';
import Terminal from '../components/Terminal';
import ExercisePanel from '../components/ExercisePanel';
import LevelMenu from '../components/LevelMenu';
import { Link } from 'react-router-dom';
import { Exercise } from '../types/index';
import useExercise from '../hooks/useExercise';

const GamePage: React.FC = () => {
  const [currentLevel, setCurrentLevel] = useState(1);
  const [currentExerciseNumber, setCurrentExerciseNumber] = useState(1);
  const [totalPoints, setTotalPoints] = useState(0);
  const [validationFeedback, setValidationFeedback] = useState<{
    message: string;
    status: 'success' | 'error';
  } | null>(null);
  const [showAchievementNotification, setShowAchievementNotification] = useState(false);
  const [achievementText, setAchievementText] = useState('');

  // Mock exercise - in production, load from API based on currentLevel and currentExerciseNumber
  const mockExercise: Exercise = {
    id: `${currentLevel}-${currentExerciseNumber}`,
    levelId: currentLevel,
    exerciseNumber: currentExerciseNumber,
    title: `Level ${currentLevel}, Exercise ${currentExerciseNumber}`,
    description: `Master the fundamentals of Linux command line. Type 'pwd' to print your working directory.`,
    points: (currentLevel * 10) + (currentExerciseNumber * 5),
    difficultyStars: Math.min(5, Math.ceil(currentLevel / 10)),
    hints: [
      'Use the pwd command to print your working directory',
      'The command stands for "print working directory"',
      'Just type: pwd and press Enter',
    ],
    solution: 'pwd',
    validationRules: {
      command: 'pwd',
    },
  };

  const {
    exercise,
    loading,
    currentHint,
    currentHintIndex,
    hints,
    attempts,
    hintsUsed,
    isCompleted,
    showHint,
    nextHint,
    previousHint,
    submitCommand,
    requestAIHint,
  } = useExercise(currentLevel, mockExercise.id);

  // Use mock exercise for now
  const displayExercise = exercise || mockExercise;
  const displayHints = hints && hints.length > 0 ? hints : (mockExercise.hints || []);

  const handleCommandExecuted = useCallback(async (command: string, isCorrect: boolean) => {
    if (isCorrect) {
      setValidationFeedback({
        message: 'Correct! Moving to next exercise...',
        status: 'success',
      });
      setAchievementText(`+${displayExercise.points} points!`);
      setShowAchievementNotification(true);
      setTotalPoints(prev => prev + displayExercise.points);

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

      await submitCommand(command, true);
    } else {
      setValidationFeedback({
        message: 'Try again. Use the hints if you need help!',
        status: 'error',
      });
      await submitCommand(command, false);
    }
  }, [displayExercise, currentExerciseNumber, currentLevel, submitCommand]);

  const handleSelectLevel = useCallback((levelNumber: number) => {
    setCurrentLevel(levelNumber);
    setCurrentExerciseNumber(1);
    setValidationFeedback(null);
  }, []);

  const handleSelectExercise = useCallback((exerciseNumber: number) => {
    setCurrentExerciseNumber(exerciseNumber);
    setValidationFeedback(null);
  }, []);

  // Calculate level progress
  const progressPercentage = (currentExerciseNumber / 5) * 100;

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                Linux Game
              </Link>
              <div className="hidden sm:block text-sm text-gray-400 border-l border-gray-700 pl-4">
                Level {currentLevel} • Exercise {currentExerciseNumber}/5
              </div>
            </div>

            {/* Progress Bar */}
            <div className="hidden md:flex flex-1 mx-6 max-w-xs items-center space-x-2">
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-400 font-semibold">
                {Math.round(progressPercentage)}%
              </span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Points</p>
                <p className="text-xl font-bold text-green-400">{totalPoints}</p>
              </div>
              <Link
                to="/dashboard"
                className="hidden sm:block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors text-sm font-semibold"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Level Menu Sidebar */}
        <aside className="lg:col-span-1 order-2 lg:order-1">
          <LevelMenu
            selectedLevel={currentLevel}
            onSelectLevel={handleSelectLevel}
            onSelectExercise={handleSelectExercise}
            totalPoints={totalPoints}
          />
        </aside>

        {/* Main Game Area */}
        <div className="lg:col-span-3 order-1 lg:order-2 flex flex-col gap-6">
          {/* Terminal - Moved to top for better UX */}
          <div className="h-96 sm:h-[500px]">
            <Terminal
              exerciseId={displayExercise.id}
              levelId={currentLevel}
              onCommandExecuted={handleCommandExecuted}
              onExerciseCompleted={() => {
                setAchievementText('Exercise Completed! 🎉');
                setShowAchievementNotification(true);
              }}
              validationFeedback={validationFeedback}
            />
          </div>

          {/* Exercise Panel */}
          <ExercisePanel
            exercise={displayExercise}
            isCompleted={isCompleted}
            currentHint={currentHint}
            currentHintIndex={currentHintIndex}
            hints={displayHints}
            attempts={attempts}
            hintsUsed={hintsUsed}
            loading={loading}
            onShowHint={showHint}
            onNextHint={nextHint}
            onPreviousHint={previousHint}
            onRequestAIHint={requestAIHint}
            validationMessage={validationFeedback?.message}
            validationStatus={validationFeedback?.status}
          />

          {/* Tips Section */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-start space-x-3">
              <span className="text-2xl">💡</span>
              <div>
                <p className="font-semibold text-white mb-1">Stuck?</p>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Read the exercise description carefully</li>
                  <li>• Use the hint buttons to get guidance</li>
                  <li>• Ask the AI tutor for additional help</li>
                  <li>• Remember: use Ctrl+C to cancel a running command</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Achievement Notification */}
      {showAchievementNotification && (
        <div className="fixed bottom-6 right-6 bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-4 rounded-lg shadow-2xl animate-pulse max-w-sm">
          <p className="font-bold text-lg">🎉 {achievementText}</p>
          <p className="text-sm text-gray-100 mt-1">Great progress!</p>
        </div>
      )}
    </div>
  );
};

export default GamePage;

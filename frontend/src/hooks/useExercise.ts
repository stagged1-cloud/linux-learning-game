import { useState, useCallback, useEffect } from 'react';
import { Exercise, UserProgress } from '../types/index';
import axios from 'axios';

interface UseExerciseReturn {
  exercise: Exercise | null;
  progress: UserProgress | null;
  loading: boolean;
  error: string | null;
  currentHintIndex: number;
  currentHint: string | null;
  hints: string[];
  attempts: number;
  hintsUsed: number;
  isCompleted: boolean;
  showHint: () => void;
  nextHint: () => void;
  previousHint: () => void;
  submitCommand: (command: string, isCorrect: boolean) => Promise<void>;
  requestAIHint: () => Promise<string | null>;
  resetExercise: () => void;
}

const useExercise = (levelId: number, exerciseId: string): UseExerciseReturn => {
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentHintIndex, setCurrentHintIndex] = useState(-1);
  const [attempts, setAttempts] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Fetch exercise data
  useEffect(() => {
    const fetchExercise = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${apiUrl}/exercises/${exerciseId}`
        );
        setExercise(response.data);
        setError(null);
      } catch (err) {
        setError('Failed to load exercise');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const fetchProgress = async () => {
      try {
        const response = await axios.get(
          `${apiUrl}/progress/${exerciseId}`
        );
        setProgress(response.data);
        setAttempts(response.data.attempts || 0);
        setHintsUsed(response.data.hintsUsed || 0);
        setIsCompleted(response.data.isCompleted || false);
      } catch (err) {
        console.error('Failed to fetch progress:', err);
      }
    };

    if (exerciseId) {
      fetchExercise();
      fetchProgress();
    }
  }, [exerciseId, apiUrl]);

  const currentHint = currentHintIndex >= 0 && exercise?.hints
    ? exercise.hints[currentHintIndex] || null
    : null;

  const showHint = useCallback(() => {
    if (currentHintIndex === -1) {
      setCurrentHintIndex(0);
      setHintsUsed(prev => prev + 1);
    }
  }, [currentHintIndex]);

  const nextHint = useCallback(() => {
    if (exercise?.hints && currentHintIndex < exercise.hints.length - 1) {
      setCurrentHintIndex(prev => prev + 1);
      setHintsUsed(prev => prev + 1);
    }
  }, [exercise?.hints, currentHintIndex]);

  const previousHint = useCallback(() => {
    if (currentHintIndex > 0) {
      setCurrentHintIndex(prev => prev - 1);
    }
  }, [currentHintIndex]);

  const submitCommand = useCallback(async (command: string, isCorrect: boolean) => {
    try {
      setAttempts(prev => prev + 1);

      if (isCorrect) {
        setIsCompleted(true);

        // Send completion to backend
        await axios.post(
          `${apiUrl}/progress/complete`,
          {
            exerciseId,
            levelId,
            attempts,
            hintsUsed,
            pointsEarned: exercise?.points || 0,
          }
        );
      }
    } catch (err) {
      console.error('Failed to submit command:', err);
    }
  }, [exerciseId, levelId, attempts, hintsUsed, exercise?.points, apiUrl]);

  const requestAIHint = useCallback(async (): Promise<string | null> => {
    try {
      const response = await axios.post(
        `${apiUrl}/tutor/hint`,
        {
          exerciseId,
          description: exercise?.description,
          previousHints: exercise?.hints || [],
        }
      );
      return response.data.hint;
    } catch (err) {
      console.error('Failed to get AI hint:', err);
      return null;
    }
  }, [exerciseId, exercise, apiUrl]);

  const resetExercise = useCallback(() => {
    setCurrentHintIndex(-1);
    setAttempts(0);
    setHintsUsed(0);
    setIsCompleted(false);
  }, []);

  return {
    exercise,
    progress,
    loading,
    error,
    currentHintIndex,
    currentHint,
    hints: exercise?.hints || [],
    attempts,
    hintsUsed,
    isCompleted,
    showHint,
    nextHint,
    previousHint,
    submitCommand,
    requestAIHint,
    resetExercise,
  };
};

export default useExercise;

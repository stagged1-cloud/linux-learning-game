/**
 * Groq AI Service
 * Provides AI-powered hints and explanations using Groq API
 */

const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Cache for hints (in-memory, simple approach)
const hintCache = new Map();

/**
 * Get AI hint for an exercise
 * @param {object} exercise - Exercise definition
 * @param {string} userCommand - The command user tried
 * @param {boolean} isCorrect - Whether command was correct
 * @returns {Promise<string>} AI-generated hint or explanation
 */
async function getHint(exercise, userCommand = null, isCorrect = false) {
  if (!GROQ_API_KEY) {
    console.warn('Groq API key not set, returning fallback hint');
    return exercise.hints ? exercise.hints[0] : 'Try again!';
  }

  const cacheKey = `${exercise.title}_${userCommand || 'general'}`;

  // Check cache first
  if (hintCache.has(cacheKey)) {
    return hintCache.get(cacheKey);
  }

  try {
    const prompt = buildPrompt(exercise, userCommand, isCorrect);
    const hint = await callGroqAPI(prompt);

    // Cache the result
    hintCache.set(cacheKey, hint);

    return hint;
  } catch (error) {
    console.error('Error getting AI hint:', error.message);
    // Fallback to static hints
    return exercise.hints ? exercise.hints[0] : 'Try a different approach!';
  }
}

/**
 * Get exercise explanation
 */
async function getExplanation(exercise) {
  if (!GROQ_API_KEY) {
    return `This exercise teaches: ${exercise.description}`;
  }

  const cacheKey = `explanation_${exercise.title}`;

  if (hintCache.has(cacheKey)) {
    return hintCache.get(cacheKey);
  }

  try {
    const prompt = `Explain the Linux command concept for this exercise in one paragraph:
Title: ${exercise.title}
Description: ${exercise.description}
Solution: ${exercise.solution}

Keep it under 50 words and beginner-friendly.`;

    const explanation = await callGroqAPI(prompt);
    hintCache.set(cacheKey, explanation);
    return explanation;
  } catch (error) {
    console.error('Error getting explanation:', error);
    return exercise.description;
  }
}

/**
 * Build the AI prompt based on exercise and user attempt
 */
function buildPrompt(exercise, userCommand, isCorrect) {
  if (isCorrect) {
    return `The user correctly completed this Linux exercise:
Exercise: ${exercise.title}
Description: ${exercise.description}
Solution: ${exercise.solution}

Provide a brief (1-2 sentences) encouraging message and a tip for when they'll use this command.`;
  }

  if (userCommand) {
    return `The user attempted this Linux exercise incorrectly:
Exercise: ${exercise.title}
Description: ${exercise.description}
Expected: ${exercise.solution}
User tried: ${userCommand}

Provide a brief (1-2 sentences) hint that guides them toward the correct answer without spoiling it.`;
  }

  return `The user needs a hint for this Linux exercise:
Exercise: ${exercise.title}
Description: ${exercise.description}
Expected: ${exercise.solution}

Provide a helpful hint (1-2 sentences) that guides them without giving away the answer.`;
}

/**
 * Call Groq API
 */
async function callGroqAPI(prompt) {
  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'mixtral-8x7b-32768', // Fast and capable model
        messages: [
          {
            role: 'system',
            content: 'You are a helpful Linux tutorial assistant. Provide clear, concise hints and explanations for Linux command exercises. Keep responses brief and beginner-friendly.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('Groq API authentication failed - check your API key');
    } else if (error.response?.status === 429) {
      console.warn('Groq API rate limit reached');
    } else {
      console.error('Groq API error:', error.message);
    }
    throw error;
  }
}

/**
 * Get tutorial for a concept
 */
async function getTutorial(conceptName) {
  if (!GROQ_API_KEY) {
    return `Learn about: ${conceptName}`;
  }

  const cacheKey = `tutorial_${conceptName}`;

  if (hintCache.has(cacheKey)) {
    return hintCache.get(cacheKey);
  }

  try {
    const prompt = `Provide a brief tutorial (3-5 sentences) explaining the Linux concept: ${conceptName}

Include:
1. What it is
2. When to use it
3. A simple example

Keep it beginner-friendly and concise.`;

    const tutorial = await callGroqAPI(prompt);
    hintCache.set(cacheKey, tutorial);
    return tutorial;
  } catch (error) {
    console.error('Error getting tutorial:', error);
    return `${conceptName} is an important Linux concept.`;
  }
}

/**
 * Clear cache (useful for testing)
 */
function clearCache() {
  hintCache.clear();
}

module.exports = {
  getHint,
  getExplanation,
  getTutorial,
  clearCache,
};

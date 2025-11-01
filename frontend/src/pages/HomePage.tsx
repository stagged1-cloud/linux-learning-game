import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const HomePage: React.FC = () => {
  useEffect(() => {
    // Auto-create guest user if not logged in
    const checkOrCreateGuestUser = async () => {
      const existingToken = localStorage.getItem('token');
      if (!existingToken) {
        try {
          const guestUsername = `guest_${Date.now()}`;
          const response = await axios.post('http://localhost:5000/api/auth/register', {
            username: guestUsername,
            email: `${guestUsername}@guest.local`,
            password: 'guest123',
          });
          
          localStorage.setItem('token', response.data.token);
          localStorage.setItem('userId', response.data.userId || response.data.user?.id || guestUsername);
          console.log('Guest user created:', guestUsername);
        } catch (error) {
          console.error('Failed to create guest user:', error);
        }
      }
    };

    checkOrCreateGuestUser();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 px-4">
      <div className="max-w-4xl text-center">
        <h1 className="text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
          Linux Learning Game
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Master Linux commands through 50 progressive levels of hands-on challenges
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg backdrop-blur-sm">
            <div className="text-4xl mb-3">🎯</div>
            <h3 className="text-xl font-semibold mb-2">50 Levels</h3>
            <p className="text-gray-400">Beginner to Expert progression</p>
          </div>
          
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg backdrop-blur-sm">
            <div className="text-4xl mb-3">💻</div>
            <h3 className="text-xl font-semibold mb-2">Real Terminal</h3>
            <p className="text-gray-400">Practice in actual Linux environment</p>
          </div>
          
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg backdrop-blur-sm">
            <div className="text-4xl mb-3">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI Tutor</h3>
            <p className="text-gray-400">Get hints when you're stuck</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/game"
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition-colors shadow-lg"
          >
            Start Learning
          </Link>
          <Link
            to="/login"
            className="px-8 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-lg transition-colors"
          >
            Login
          </Link>
        </div>

        <div className="mt-12 text-gray-500 text-sm">
          <p>100% Free • No Installation • Browser-based</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

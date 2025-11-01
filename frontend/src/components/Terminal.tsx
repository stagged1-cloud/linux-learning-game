import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { io } from 'socket.io-client';

interface TerminalProps {
  exerciseId?: string;
  levelId?: number;
  onCommandExecuted?: (command: string, isCorrect: boolean) => void;
  onExerciseCompleted?: () => void;
  validationFeedback?: {
    message: string;
    status: 'success' | 'error';
  } | null;
}

const Terminal: React.FC<TerminalProps> = ({
  exerciseId,
  levelId,
  onCommandExecuted,
  onExerciseCompleted,
  validationFeedback,
}) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const commandHistoryRef = useRef<string[]>([]);
  const historyIndexRef = useRef<number>(-1);

  // Removed writeOutput - currently unused but kept for future enhancements

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize terminal
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#f48771',
        green: '#4ec9b0',
        yellow: '#dcdcaa',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#4ec9b0',
        white: '#d4d4d4',
        brightBlack: '#666666',
        brightRed: '#f48771',
        brightGreen: '#4ec9b0',
        brightYellow: '#dcdcaa',
        brightBlue: '#569cd6',
        brightMagenta: '#c586c0',
        brightCyan: '#4ec9b0',
        brightWhite: '#ffffff',
      },
      cols: 80,
      rows: 24,
    });

    // Add addons
    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    // Store refs FIRST before opening
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;
    
    // Open terminal in DOM
    term.open(terminalRef.current);
    
    // Wait for multiple animation frames to ensure DOM is fully rendered
    // This is necessary for FitAddon to correctly calculate dimensions
    let fitAttempts = 0;
    const attemptFit = () => {
      requestAnimationFrame(() => {
        try {
          if (fitAddonRef.current && terminalRef.current) {
            // Check if container has dimensions before fitting
            const container = terminalRef.current;
            if (container.clientHeight > 0 && container.clientWidth > 0) {
              fitAddonRef.current.fit();
            } else if (fitAttempts < 10) {
              // Container not ready yet, try again
              fitAttempts++;
              attemptFit();
            }
          }
        } catch (e) {
          console.warn('Fit attempt failed:', e);
          if (fitAttempts < 5) {
            fitAttempts++;
            setTimeout(attemptFit, 100);
          }
        }
      });
    };
    attemptFit();

    // Welcome message
    term.writeln('Welcome to Linux Learning Game!');
    term.writeln('Connecting to sandbox environment...\r\n');

    // Connect to WebSocket
    const apiUrl = process.env.REACT_APP_WS_URL || 'http://localhost:5000';
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId') || 'anonymous';
    
    const socket = io(apiUrl, {
      transports: ['websocket', 'polling'],
      auth: {
        token: token || '',
      },
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      term.writeln('\x1b[32m✓ Connected to sandbox!\x1b[0m');

       // Authenticate after connection
       socket.emit('authenticate', {
         userId: userId,
         levelId: levelId || 1,
         exerciseId: exerciseId || '1-1',
         containerId: 'linux-game-sandbox',
         token: token || '',
       });
    });

    socket.on('authenticated', (data) => {
      console.log('Terminal authenticated:', data);
      setIsAuthenticated(true);
      term.writeln('\x1b[32m✓ Authenticated!\x1b[0m');
      term.write('\r\n$ ');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      term.writeln('\r\n\x1b[31m✗ Disconnected from sandbox.\x1b[0m');
    });

    socket.on('error', (error: any) => {
      console.error('Socket error:', error);
      term.writeln(`\r\n\x1b[31mError: ${error.message || 'Connection failed'}\x1b[0m`);
      setIsAuthenticated(false);
    });

    socket.on('output', (data: string) => {
      term.write(data);
    });

    socket.on('command-result', (result: { isCorrect: boolean; message: string }) => {
      if (result.isCorrect) {
        term.writeln(`\r\n\x1b[32m✓ Correct! ${result.message}\x1b[0m`);
        onCommandExecuted?.('', true);
        if (result.message.includes('next')) {
          setTimeout(() => onExerciseCompleted?.(), 1000);
        }
      } else {
        term.writeln(`\r\n\x1b[31m✗ ${result.message}\x1b[0m`);
        onCommandExecuted?.('', false);
      }
      term.write('\r\n$ ');
    });

    socket.on('exercise-completed', () => {
      term.writeln('\r\n\x1b[32m🎉 Exercise completed!\x1b[0m');
      onExerciseCompleted?.();
    });

    // Handle input
    let currentLine = '';

    term.onData((data) => {
      const code = data.charCodeAt(0);

      // Handle Enter key (code 13)
      if (code === 13) {
        term.write('\r\n');
        if (currentLine.trim()) {
          console.log('=== COMMAND DEBUG ===');
          console.log('Command:', currentLine);
          console.log('Authenticated:', isAuthenticated);
          console.log('Socket connected:', socket.connected);
          console.log('Exercise ID:', exerciseId);
          console.log('Level ID:', levelId);
          console.log('====================');
          
          if (!isAuthenticated) {
            term.writeln('\x1b[31mNot authenticated. Please refresh the page.\x1b[0m');
            term.write('\r\n$ ');
            currentLine = '';
            return;
          }

          if (!socket.connected) {
            term.writeln('\x1b[31mSocket disconnected. Please refresh the page.\x1b[0m');
            term.write('\r\n$ ');
            currentLine = '';
            return;
          }

          // Add to history
          commandHistoryRef.current.push(currentLine);
          historyIndexRef.current = -1;

          socket.emit('command', {
            command: currentLine,
            exerciseId,
            levelId,
          });
          console.log('Command emitted to server');
        } else {
          term.write('$ ');
        }
        currentLine = '';
        return;
      }

      // Handle Backspace (code 127)
      if (code === 127) {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          term.write('\b \b');
        }
        return;
      }

      // Handle Ctrl+C (code 3)
      if (code === 3) {
        term.write('^C\r\n$ ');
        currentLine = '';
        return;
      }

      // Handle Arrow Up for command history (code 27 = ESC, followed by [A)
      // Handle Arrow Down for command history
      // For simplicity, we'll keep basic input handling here

      // Regular character
      if (code >= 32 && code <= 126) {
        currentLine += data;
        term.write(data);
      }

      // Handle Tab for autocomplete hints
      if (code === 9) {
        term.write('    '); // Simple tab expansion
        currentLine += '    ';
      }
    });

    // Handle window resize
    const handleResize = () => {
      try {
        if (fitAddonRef.current && xtermRef.current) {
          fitAddonRef.current.fit();
          socket.emit('resize', {
            cols: xtermRef.current.cols,
            rows: xtermRef.current.rows,
          });
        }
      } catch (e) {
        console.error('Resize error:', e);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
      term.dispose();
    };
  }, [exerciseId, levelId, onCommandExecuted, onExerciseCompleted, isAuthenticated]);

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden shadow-lg">
      {/* Terminal Header */}
      <div className="terminal-header bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <span className="text-sm font-semibold text-gray-300">
          {isConnected ? (
            <span className="flex items-center space-x-1 text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>Connected</span>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-red-400">
              <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span>
              <span>Connecting...</span>
            </span>
          )}
        </span>
      </div>

      {/* Terminal Body */}
      <div
        ref={terminalRef}
        className="terminal-body flex-1 p-3 overflow-hidden"
        style={{ backgroundColor: '#1e1e1e' }}
      />

      {/* Validation Feedback Overlay */}
      {validationFeedback && (
        <div
          className={`mx-3 mb-3 p-3 rounded border ${
            validationFeedback.status === 'success'
              ? 'bg-green-900 border-green-600 text-green-100'
              : 'bg-red-900 border-red-600 text-red-100'
          }`}
        >
          <span className="font-semibold">
            {validationFeedback.status === 'success' ? '✓' : '✗'}
          </span>{' '}
          {validationFeedback.message}
        </div>
      )}

      {/* Help Text */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 text-xs text-gray-500">
        <p>Press Ctrl+C to cancel • Type 'help' for command hints</p>
      </div>
    </div>
  );
};

export default Terminal;

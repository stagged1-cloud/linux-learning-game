import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import '@xterm/xterm/css/xterm.css';
import { io, Socket } from 'socket.io-client';

interface TerminalProps {
  exerciseId?: string;
  onCommandExecuted?: (command: string, isCorrect: boolean) => void;
}

const Terminal: React.FC<TerminalProps> = ({ exerciseId, onCommandExecuted }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

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

    // Open terminal in DOM
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Welcome message
    term.writeln('Welcome to Linux Learning Game!');
    term.writeln('Connecting to sandbox environment...\r\n');

    // Connect to WebSocket
    const apiUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:5000';
    const socket = io(apiUrl, {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      term.writeln('\x1b[32mConnected to sandbox!\x1b[0m');
      term.write('\r\n$ ');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      term.writeln('\r\n\x1b[31mDisconnected from sandbox.\x1b[0m');
    });

    socket.on('output', (data: string) => {
      term.write(data);
    });

    socket.on('command-result', (result: { isCorrect: boolean; message: string }) => {
      if (result.isCorrect) {
        term.writeln(`\r\n\x1b[32m✓ ${result.message}\x1b[0m`);
      } else {
        term.writeln(`\r\n\x1b[31m✗ ${result.message}\x1b[0m`);
      }
      term.write('\r\n$ ');
    });

    // Handle input
    let currentLine = '';
    
    term.onData((data) => {
      const code = data.charCodeAt(0);

      // Handle Enter key
      if (code === 13) {
        term.write('\r\n');
        if (currentLine.trim()) {
          socket.emit('command', {
            command: currentLine,
            exerciseId: exerciseId,
          });
          onCommandExecuted?.(currentLine, false); // Will be updated by server response
        }
        currentLine = '';
        return;
      }

      // Handle Backspace
      if (code === 127) {
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1);
          term.write('\b \b');
        }
        return;
      }

      // Handle Ctrl+C
      if (code === 3) {
        term.write('^C\r\n$ ');
        currentLine = '';
        return;
      }

      // Regular character
      if (code >= 32 && code <= 126) {
        currentLine += data;
        term.write(data);
      }
    });

    // Handle window resize
    const handleResize = () => {
      fitAddon.fit();
      socket.emit('resize', {
        cols: term.cols,
        rows: term.rows,
      });
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      socket.disconnect();
      term.dispose();
    };
  }, [exerciseId, onCommandExecuted]);

  return (
    <div className="terminal-container bg-terminal-bg rounded-lg overflow-hidden shadow-lg">
      <div className="terminal-header bg-gray-800 px-4 py-2 flex items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="ml-4 text-sm text-gray-400">
          {isConnected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>
      <div 
        ref={terminalRef} 
        className="terminal-body p-2"
        style={{ height: '500px' }}
      />
    </div>
  );
};

export default Terminal;

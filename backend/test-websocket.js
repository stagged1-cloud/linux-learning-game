#!/usr/bin/env node

/**
 * Simple WebSocket client to test terminal command execution
 */

const io = require('socket.io-client');

const WS_URL = process.env.WS_URL || 'http://localhost:5000';
const userId = 'test-user-' + Date.now();

console.log('=== Linux Learning Game WebSocket Test ===\n');
console.log(`Connecting to: ${WS_URL}`);
console.log(`User ID: ${userId}\n`);

const socket = io(WS_URL, {
  transports: ['websocket', 'polling'],
});

let authenticated = false;

socket.on('connect', () => {
  console.log('✓ Connected to server\n');
  
  // Authenticate
  console.log('Sending authentication...');
  socket.emit('authenticate', {
    userId: userId,
    levelId: 1,
    exerciseId: 'test-1',
    containerId: 'linux-game-sandbox',
  });
});

socket.on('authenticated', (data) => {
  console.log('✓ Authenticated!');
  console.log('Session ID:', data.sessionId);
  console.log('Working directory:', data.workDir);
  console.log('');
  
  authenticated = true;
  
  // Test commands
  runTestCommands();
});

socket.on('output', (data) => {
  process.stdout.write('[OUTPUT] ' + data);
});

socket.on('command-result', (result) => {
  console.log('[RESULT] isCorrect:', result.isCorrect, 'exitCode:', result.exitCode, 'message:', result.message);
  console.log('');
});

socket.on('error', (error) => {
  console.error('[ERROR]', error);
});

socket.on('disconnect', () => {
  console.log('\n✗ Disconnected from server');
  process.exit(0);
});

function runTestCommands() {
  const commands = [
    'pwd',
    'whoami',
    'echo "Hello from terminal test"',
    'ls -la /',
    'uname -a',
  ];
  
  let currentIndex = 0;
  
  function sendNextCommand() {
    if (currentIndex >= commands.length) {
      console.log('\n✓ All test commands completed!');
      setTimeout(() => {
        socket.disconnect();
      }, 1000);
      return;
    }
    
    const command = commands[currentIndex];
    console.log(`\n--- Testing command ${currentIndex + 1}/${commands.length}: ${command} ---`);
    socket.emit('command', {
      command: command,
      exerciseId: 'test-1',
      levelId: 1,
    });
    
    currentIndex++;
    setTimeout(sendNextCommand, 2000);
  }
  
  setTimeout(sendNextCommand, 1000);
}

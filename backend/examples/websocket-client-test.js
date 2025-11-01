/**
 * WebSocket Client Test Example
 * 
 * This file demonstrates how to use the command execution system
 * with actual WebSocket connections for testing and development
 * 
 * Usage:
 *   node examples/websocket-client-test.js
 * 
 * Requirements:
 *   - Backend server running on localhost:5000
 *   - Docker container "linux-sandbox" running
 */

const io = require('socket.io-client');
const readline = require('readline');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const CONTAINER_ID = process.env.CONTAINER_ID || 'linux-sandbox';

// User session data
const SESSION_DATA = {
  userId: '00000000-0000-0000-0000-000000000001',
  levelId: 1,
  exerciseId: 'level_1_exercise_1',
  containerId: CONTAINER_ID
};

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

/**
 * Main test client
 */
class CommandExecutionTestClient {
  constructor(backendUrl, sessionData) {
    this.socket = null;
    this.backendUrl = backendUrl;
    this.sessionData = sessionData;
    this.connected = false;
    this.authenticated = false;
    this.currentWorkDir = '/';
  }

  /**
   * Connect to backend
   */
  async connect() {
    console.log(`${colors.cyan}Connecting to ${this.backendUrl}...${colors.reset}`);

    return new Promise((resolve, reject) => {
      this.socket = io(this.backendUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        this.connected = true;
        console.log(`${colors.green}✓ Connected to server${colors.reset}`);
        this.setupEventHandlers();
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error(`${colors.red}✗ Connection error: ${error}${colors.reset}`);
        reject(error);
      });

      this.socket.on('error', (error) => {
        console.error(`${colors.red}✗ Socket error: ${error}${colors.reset}`);
      });
    });
  }

  /**
   * Setup WebSocket event handlers
   */
  setupEventHandlers() {
    this.socket.on('authenticated', (data) => {
      this.authenticated = true;
      console.log(`${colors.green}✓ Authenticated!${colors.reset}`);
      console.log(`  Session ID: ${data.sessionId}`);
      console.log(`  Work Dir: ${data.workDir}`);
      this.currentWorkDir = data.workDir;
    });

    this.socket.on('output', (data) => {
      // Remove trailing newline for cleaner output
      const output = typeof data === 'string' ? data : data.toString();
      process.stdout.write(output);
    });

    this.socket.on('workdir-changed', (data) => {
      this.currentWorkDir = data.workDir;
      console.log(`${colors.yellow}[Working directory changed to: ${data.workDir}]${colors.reset}`);
    });

    this.socket.on('command-result', (data) => {
      console.log('\n' + colors.bright);
      if (data.isCorrect) {
        console.log('✓ Command Correct!');
      } else {
        console.log('✗ Command Incorrect');
      }
      console.log(`Message: ${data.message}`);
      console.log(`Points: ${data.pointsEarned}`);
      console.log(`Exit Code: ${data.exitCode}`);
      console.log(`Attempt: ${data.attempt}`);
      console.log(colors.reset);
    });

    this.socket.on('exercise-completed', (data) => {
      console.log(`\n${colors.green}${colors.bright}${data.message}${colors.reset}`);
      console.log(`Points Earned: ${data.pointsEarned}`);
      console.log(`Total Points: ${data.totalPoints}`);
    });

    this.socket.on('hint', (data) => {
      console.log(`\n${colors.yellow}Hint: ${data.hint}${colors.reset}`);
    });

    this.socket.on('session-info', (data) => {
      console.log(`\n${colors.cyan}Session Info:${colors.reset}`);
      console.log(`  Work Dir: ${data.workDir}`);
      console.log(`  Attempt: ${data.attempt}`);
      console.log(`  Hints Used: ${data.hintUsed ? 'Yes' : 'No'}`);
      console.log(`  Commands: ${data.commandCount}`);
      console.log(`  Duration: ${Math.round(data.sessionDuration / 1000)}s`);
      console.log(`  Last Activity: ${Math.round(data.lastActivity / 1000)}s ago`);
    });

    this.socket.on('error', (data) => {
      console.log(`\n${colors.red}Error: ${data.message}${colors.reset}`);
    });

    this.socket.on('disconnect', () => {
      this.connected = false;
      this.authenticated = false;
      console.log(`${colors.red}Disconnected from server${colors.reset}`);
    });
  }

  /**
   * Authenticate with backend
   */
  authenticate() {
    console.log(`${colors.cyan}Authenticating...${colors.reset}`);
    this.socket.emit('authenticate', this.sessionData);
  }

  /**
   * Execute a command
   */
  executeCommand(command) {
    if (!this.authenticated) {
      console.error(`${colors.red}Not authenticated. Run 'auth' first.${colors.reset}`);
      return;
    }

    console.log(`${colors.dim}Sending command: ${command}${colors.reset}`);
    this.socket.emit('command', {
      command,
      exerciseId: this.sessionData.exerciseId
    });
  }

  /**
   * Request hint
   */
  requestHint() {
    if (!this.authenticated) {
      console.error(`${colors.red}Not authenticated. Run 'auth' first.${colors.reset}`);
      return;
    }

    this.socket.emit('request-hint', {
      exerciseId: this.sessionData.exerciseId,
      hintIndex: 0
    });
  }

  /**
   * Get session info
   */
  getSessionInfo() {
    if (!this.authenticated) {
      console.error(`${colors.red}Not authenticated. Run 'auth' first.${colors.reset}`);
      return;
    }

    this.socket.emit('session-info', {});
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

/**
 * Interactive CLI for testing
 */
class InteractiveCLI {
  constructor(client) {
    this.client = client;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * Show help menu
   */
  showHelp() {
    console.log(`\n${colors.bright}Available Commands:${colors.reset}`);
    console.log('  auth              - Authenticate with backend');
    console.log('  info              - Get session information');
    console.log('  hint              - Request a hint');
    console.log('  help              - Show this help menu');
    console.log('  exit              - Disconnect and exit');
    console.log('\nOr type any Linux command to execute it in the sandbox\n');
  }

  /**
   * Start interactive mode
   */
  async start() {
    console.log(`${colors.bright}${colors.cyan}=== Command Execution Test Client ===${colors.reset}`);
    console.log(`Connected to: ${this.client.backendUrl}`);
    console.log(`Container: ${this.client.sessionData.containerId}`);
    console.log(`Exercise: ${this.client.sessionData.exerciseId}\n`);

    this.showHelp();

    this.promptCommand();
  }

  /**
   * Prompt for command input
   */
  promptCommand() {
    const prompt = this.client.authenticated
      ? `${colors.green}[Authenticated]${colors.reset} > `
      : `${colors.red}[Not Authenticated]${colors.reset} > `;

    this.rl.question(prompt, (input) => {
      const command = input.trim();

      if (!command) {
        this.promptCommand();
        return;
      }

      switch (command.toLowerCase()) {
        case 'auth':
          this.client.authenticate();
          break;
        case 'info':
          this.client.getSessionInfo();
          break;
        case 'hint':
          this.client.requestHint();
          break;
        case 'help':
          this.showHelp();
          break;
        case 'exit':
          this.rl.close();
          this.client.disconnect();
          process.exit(0);
          break;
        default:
          this.client.executeCommand(command);
      }

      this.promptCommand();
    });
  }
}

/**
 * Run example tests
 */
async function runExamples() {
  const client = new CommandExecutionTestClient(BACKEND_URL, SESSION_DATA);

  try {
    // Connect
    await client.connect();

    // Authenticate
    client.authenticate();

    // Wait for authentication
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Run example commands
    console.log(`${colors.cyan}Running example commands...${colors.reset}\n`);

    const examples = [
      { cmd: 'pwd', desc: 'Print working directory' },
      { cmd: 'ls -la', desc: 'List files' },
      { cmd: 'echo "Hello, Linux!"', desc: 'Echo text' },
      { cmd: 'whoami', desc: 'Print current user' },
      { cmd: 'date', desc: 'Show current date' }
    ];

    for (const example of examples) {
      console.log(`\n${colors.yellow}→ ${example.desc}${colors.reset}`);
      client.executeCommand(example.cmd);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Show session info
    console.log(`\n${colors.cyan}Getting session info...${colors.reset}`);
    client.getSessionInfo();
    await new Promise(resolve => setTimeout(resolve, 500));

    // Disconnect
    console.log(`\n${colors.cyan}Disconnecting...${colors.reset}`);
    client.disconnect();
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--examples')) {
    // Run automated examples
    await runExamples();
  } else {
    // Start interactive CLI
    const client = new CommandExecutionTestClient(BACKEND_URL, SESSION_DATA);

    try {
      await client.connect();
      const cli = new InteractiveCLI(client);
      await cli.start();
    } catch (error) {
      console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

// Run
main().catch(error => {
  console.error(`${colors.red}Unexpected error: ${error}${colors.reset}`);
  process.exit(1);
});

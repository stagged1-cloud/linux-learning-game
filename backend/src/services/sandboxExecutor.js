/**
 * Sandbox Executor Service
 * Handles command execution in Docker sandbox containers
 * Uses Docker SDK for Node.js to execute commands in running containers
 */

const Docker = require('dockerode');
const path = require('path');
const { PassThrough } = require('stream');

// Initialize Docker client
const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
});

const COMMAND_TIMEOUT = parseInt(process.env.COMMAND_TIMEOUT) || 5000; // 5 seconds
const MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10MB max output

// Constants for sandbox configuration
const SANDBOX_USER = 'student';
const SANDBOX_SHELL = '/bin/bash';
const SANDBOX_HOME = '/home/student';

/**
 * Execute a command in a Docker container
 * @param {string} containerId - Docker container ID or name
 * @param {string} command - Command to execute
 * @param {object} options - Execution options
 * @returns {Promise<object>} { success, stdout, stderr, exitCode, error }
 */
async function executeCommand(containerId, command, options = {}) {
  const {
    workDir = '/',
    user = SANDBOX_USER,
    timeout = COMMAND_TIMEOUT,
    shell = SANDBOX_SHELL
  } = options;

  console.log(`[sandboxExecutor] Executing command: "${command}" in container: ${containerId}, workDir: ${workDir}`);

  try {
    // Get container instance
    const container = docker.getContainer(containerId);

    // Verify container is running
    const containerInfo = await container.inspect();
    console.log(`[sandboxExecutor] Container ${containerId} state: ${containerInfo.State.Status}, running: ${containerInfo.State.Running}`);
    
    if (!containerInfo.State.Running) {
      console.error(`[sandboxExecutor] Container ${containerId} is not running!`);
      return {
        success: false,
        stdout: '',
        stderr: 'Container is not running',
        exitCode: -1,
        error: 'CONTAINER_NOT_RUNNING'
      };
    }

    // Create execution options
    const execOptions = {
      AttachStdin: false,
      AttachStdout: true,
      AttachStderr: true,
      Tty: false,
      Cmd: [shell, '-c', command],
      User: user,
      WorkingDir: workDir
    };

    // Execute command with timeout
    let stdout = '';
    let stderr = '';
    let exitCode = 0;

    return new Promise((resolve) => {
      // Set timeout
      const timeoutHandle = setTimeout(() => {
        console.warn(`Command execution timeout after ${timeout}ms: ${command}`);
        resolve({
          success: false,
          stdout,
          stderr: `Command timeout after ${timeout}ms`,
          exitCode: -1,
          error: 'TIMEOUT'
        });
      }, timeout);

      // Create exec instance
      container.exec(execOptions, (err, exec) => {
        if (err) {
          clearTimeout(timeoutHandle);
          return resolve({
            success: false,
            stdout: '',
            stderr: err.message,
            exitCode: -1,
            error: 'EXEC_CREATION_FAILED'
          });
        }

        // Start exec
        exec.start({ Detach: false }, (err, stream) => {
          if (err) {
            clearTimeout(timeoutHandle);
            return resolve({
              success: false,
              stdout: '',
              stderr: err.message,
              exitCode: -1,
              error: 'EXEC_START_FAILED'
            });
          }

          // Docker multiplexes streams when TTY is disabled (Tty: false)
          // The API combines stdout/stderr into a single stream with 8-byte headers
          // indicating stream type (1=stdout, 2=stderr) and payload size.
          // Use dockerode's demuxStream utility to separate them.
          const stdoutStream = new PassThrough();
          const stderrStream = new PassThrough();

          // Demultiplex the stream
          docker.modem.demuxStream(stream, stdoutStream, stderrStream);

          // Helper function to check and enforce output size limits
          const checkOutputSize = (currentStdout, currentStderr, newData) => {
            if (currentStdout.length + currentStderr.length + newData.length > MAX_OUTPUT_SIZE) {
              stream.destroy();
              return true;
            }
            return false;
          };

          // Collect stdout
          stdoutStream.on('data', (chunk) => {
            const data = chunk.toString('utf8');
            
            if (checkOutputSize(stdout, stderr, data)) {
              stdout += '\n[Output truncated - exceeded maximum size]';
              return;
            }

            stdout += data;
          });

          // Collect stderr
          stderrStream.on('data', (chunk) => {
            const data = chunk.toString('utf8');
            
            if (checkOutputSize(stdout, stderr, data)) {
              stdout += '\n[Output truncated - exceeded maximum size]';
              return;
            }

            stderr += data;
          });

          stream.on('error', (err) => {
            clearTimeout(timeoutHandle);
            resolve({
              success: false,
              stdout,
              stderr: err.message,
              exitCode: -1,
              error: 'STREAM_ERROR'
            });
          });

          stream.on('end', () => {
            // Get exit code
            exec.inspect((err, data) => {
              clearTimeout(timeoutHandle);

              if (err) {
                console.error(`[sandboxExecutor] Failed to inspect exec: ${err.message}`);
                return resolve({
                  success: false,
                  stdout,
                  stderr: err.message,
                  exitCode: -1,
                  error: 'INSPECT_FAILED'
                });
              }

              exitCode = data.ExitCode;
              console.log(`[sandboxExecutor] Command completed. ExitCode: ${exitCode}, stdout length: ${stdout.length}, stderr length: ${stderr.length}`);
              resolve({
                success: exitCode === 0,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode,
                error: exitCode === 0 ? null : 'COMMAND_FAILED'
              });
            });
          });
        });
      });
    });
  } catch (error) {
    console.error('Sandbox execution error:', error);
    return {
      success: false,
      stdout: '',
      stderr: error.message,
      exitCode: -1,
      error: 'EXECUTION_ERROR'
    };
  }
}

/**
 * Execute command with working directory support
 * @param {string} containerId - Docker container ID
 * @param {string} command - Command to execute
 * @param {string} workDir - Current working directory
 * @returns {Promise<object>} Execution result
 */
async function executeInDirectory(containerId, command, workDir = '/') {
  console.log(`[sandboxExecutor] executeInDirectory - command: "${command}", workDir: ${workDir}`);
  
  // Handle 'cd' command separately
  if (command.trim() === 'cd' || command.trim().startsWith('cd ')) {
    const targetDir = command.trim() === 'cd' ? '~' : command.trim().substring(3).trim();
    return executeCdCommand(containerId, targetDir, workDir);
  }

  // Execute normal command in the working directory
  return executeCommand(containerId, command, {
    workDir,
    timeout: COMMAND_TIMEOUT
  });
}

/**
 * Handle 'cd' command (change directory)
 * Since cd affects shell state, we validate the directory and return it
 * @param {string} containerId - Docker container ID
 * @param {string} targetDir - Target directory
 * @param {string} currentDir - Current directory
 * @returns {Promise<object>} Validation result
 */
async function executeCdCommand(containerId, targetDir, currentDir = '/') {
  console.log(`[sandboxExecutor] executeCdCommand - targetDir: "${targetDir}", currentDir: ${currentDir}`);
  
  try {
    // Resolve the full path
    let fullPath;
    
    if (targetDir === '~') {
      fullPath = SANDBOX_HOME;
    } else if (targetDir === '-') {
      // This would require tracking previous directory - for now, go home
      fullPath = SANDBOX_HOME;
    } else if (targetDir.startsWith('/')) {
      fullPath = path.normalize(targetDir);
    } else {
      fullPath = path.normalize(path.join(currentDir, targetDir));
    }

    console.log(`[sandboxExecutor] Resolved path: ${fullPath}`);

    // Test if directory exists
    const result = await executeCommand(containerId, `test -d "${fullPath}" && echo "exists"`, {
      workDir: currentDir
    });

    console.log(`[sandboxExecutor] Directory test result - stdout: "${result.stdout}", exitCode: ${result.exitCode}`);

    if (result.stdout.includes('exists')) {
      console.log(`[sandboxExecutor] Directory exists, changing to: ${fullPath}`);
      return {
        success: true,
        stdout: fullPath,
        stderr: '',
        exitCode: 0,
        newWorkDir: fullPath
      };
    } else {
      console.log(`[sandboxExecutor] Directory does not exist: ${fullPath}`);
      return {
        success: false,
        stdout: '',
        stderr: `cd: ${targetDir}: No such file or directory`,
        exitCode: 1,
        newWorkDir: currentDir // Keep current directory on error
      };
    }
  } catch (error) {
    console.error('[sandboxExecutor] CD command error:', error);
    return {
      success: false,
      stdout: '',
      stderr: error.message,
      exitCode: -1,
      newWorkDir: currentDir
    };
  }
}

/**
 * Verify container exists and is running
 * @param {string} containerId - Docker container ID or name
 * @returns {Promise<boolean>} True if container is running
 */
async function isContainerHealthy(containerId) {
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    const isRunning = info.State.Running;
    console.log(`[sandboxExecutor] Container ${containerId} health check: ${isRunning ? 'HEALTHY' : 'NOT RUNNING'}`);
    return isRunning;
  } catch (error) {
    console.error(`[sandboxExecutor] Container ${containerId} health check failed:`, error.message);
    return false;
  }
}

/**
 * Get container information
 * @param {string} containerId - Docker container ID or name
 * @returns {Promise<object>} Container info
 */
async function getContainerInfo(containerId) {
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();
    return {
      id: info.Id,
      name: info.Name.replace(/^\//, ''),
      running: info.State.Running,
      status: info.State.Status,
      image: info.Config.Image,
      pid: info.State.Pid
    };
  } catch (error) {
    console.error('Failed to get container info:', error);
    return null;
  }
}

/**
 * Validate command for security
 * Blocks dangerous commands
 * @param {string} command - Command to validate
 * @returns {object} { valid, reason }
 */
function validateCommandSafety(command) {
  const cmd = command.trim().toLowerCase();

  // Dangerous commands that should be blocked
  const blockedPatterns = [
    /^\s*(rm|dd|mkfs|fdisk|parted|delpart|wipefs)(?:\s+|$)/i,  // Starts with destructive
    /\|\s*(rm|dd|mkfs|fdisk|parted|delpart|wipefs)(?:\s+|$)/i, // After pipe
    /sudo/i,                                                     // Privilege escalation
    /shutdown|reboot|halt|poweroff/i,                           // System control
    /install|apt-get|yum|pacman|apk.*install/i,                // Package managers (optional)
    /\|\s*nc\s|telnet|ssh\s+-i/i,                              // Network exploits
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(cmd)) {
      return {
        valid: false,
        reason: `Command "${cmd}" is not allowed for security reasons`
      };
    }
  }

  return { valid: true };
}

/**
 * Get container logs
 * @param {string} containerId - Docker container ID
 * @param {number} lines - Number of lines to retrieve
 * @returns {Promise<string>} Container logs
 */
async function getContainerLogs(containerId, lines = 50) {
  try {
    const container = docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: lines,
      timestamps: true
    });
    return logs.toString('utf8');
  } catch (error) {
    console.error('Failed to get container logs:', error);
    return '';
  }
}

/**
 * Cleanup resources for a session
 * @param {string} containerId - Docker container ID
 */
async function cleanup(containerId) {
  try {
    // This could be extended to remove temporary files, etc.
    console.log(`Cleanup completed for container ${containerId}`);
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

module.exports = {
  executeCommand,
  executeInDirectory,
  executeCdCommand,
  isContainerHealthy,
  getContainerInfo,
  validateCommandSafety,
  getContainerLogs,
  cleanup
};

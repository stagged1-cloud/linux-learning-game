/**
 * Sandbox Executor Service
 * Handles command execution in Docker sandbox containers
 * Uses Docker SDK for Node.js to execute commands in running containers
 */

const Docker = require('dockerode');
const path = require('path');

// Initialize Docker client
const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
});

const COMMAND_TIMEOUT = parseInt(process.env.COMMAND_TIMEOUT) || 5000; // 5 seconds
const MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10MB max output

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
    user = 'root',
    timeout = COMMAND_TIMEOUT,
    shell = '/bin/sh'
  } = options;

  try {
    console.log(`[sandboxExecutor] Executing command: ${command} in ${workDir}`);
    
    // Get container instance
    const container = docker.getContainer(containerId);

    // Verify container is running
    const containerInfo = await container.inspect();
    if (!containerInfo.State.Running) {
      console.error(`[sandboxExecutor] Container ${containerId} is not running`);
      return {
        success: false,
        stdout: '',
        stderr: 'Container is not running',
        exitCode: -1,
        error: 'CONTAINER_NOT_RUNNING'
      };
    }
    
    console.log(`[sandboxExecutor] Container ${containerId} is running`);

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
        exec.start({ Detach: false, Tty: false }, (err, stream) => {
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

          // Create output container
          const outputContainer = {
            stdout: '',
            stderr: ''
          };

          // For non-TTY streams, we need to demux manually
          const { PassThrough } = require('stream');
          const stdoutStream = new PassThrough();
          const stderrStream = new PassThrough();

          stdoutStream.on('data', (chunk) => {
            const data = chunk.toString('utf8');
            if (outputContainer.stdout.length + outputContainer.stderr.length + data.length <= MAX_OUTPUT_SIZE) {
              outputContainer.stdout += data;
            } else if (!outputContainer.stdout.includes('[Output truncated]')) {
              outputContainer.stdout += '\n[Output truncated - exceeded maximum size]';
            }
          });

          stderrStream.on('data', (chunk) => {
            const data = chunk.toString('utf8');
            if (outputContainer.stdout.length + outputContainer.stderr.length + data.length <= MAX_OUTPUT_SIZE) {
              outputContainer.stderr += data;
            } else if (!outputContainer.stderr.includes('[Output truncated]')) {
              outputContainer.stderr += '\n[Output truncated - exceeded maximum size]';
            }
          });

          // Use docker-modem's demux functionality
          if (container.modem.demux) {
            container.modem.demux(stream, stdoutStream, stderrStream);
          } else {
            // Fallback: treat all output as stdout
            stream.on('data', (chunk) => {
              const data = chunk.toString('utf8');
              if (outputContainer.stdout.length + data.length <= MAX_OUTPUT_SIZE) {
                outputContainer.stdout += data;
              }
            });
          }

          stream.on('error', (err) => {
            clearTimeout(timeoutHandle);
            resolve({
              success: false,
              stdout: outputContainer.stdout,
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
                console.error('[sandboxExecutor] Failed to inspect exec:', err);
                return resolve({
                  success: false,
                  stdout: outputContainer.stdout,
                  stderr: err.message,
                  exitCode: -1,
                  error: 'INSPECT_FAILED'
                });
              }

              exitCode = data.ExitCode;
              stdout = outputContainer.stdout;
              stderr = outputContainer.stderr;
              console.log(`[sandboxExecutor] Command completed: exitCode=${exitCode}, stdout=${stdout.length} bytes, stderr=${stderr.length} bytes`);
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
  // Handle 'cd' command separately
  if (command.trim().startsWith('cd ')) {
    const targetDir = command.trim().substring(3).trim();
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
  try {
    // Resolve the full path
    let fullPath;
    
    if (targetDir === '~') {
      fullPath = '/root';
    } else if (targetDir === '-') {
      // This would require tracking previous directory - for now, just root
      fullPath = '/root';
    } else if (targetDir.startsWith('/')) {
      fullPath = path.normalize(targetDir);
    } else {
      fullPath = path.normalize(path.join(currentDir, targetDir));
    }

    // Test if directory exists
    const result = await executeCommand(containerId, `test -d "${fullPath}" && echo "exists"`, {
      workDir: currentDir
    });

    if (result.stdout.includes('exists')) {
      return {
        success: true,
        stdout: fullPath,
        stderr: '',
        exitCode: 0,
        newWorkDir: fullPath
      };
    } else {
      return {
        success: false,
        stdout: '',
        stderr: `cd: ${targetDir}: No such file or directory`,
        exitCode: 1,
        newWorkDir: currentDir // Keep current directory on error
      };
    }
  } catch (error) {
    console.error('CD command error:', error);
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
  // For development/testing, assume container is healthy
  // TODO: Implement proper health check with Docker socket access
  return true;
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

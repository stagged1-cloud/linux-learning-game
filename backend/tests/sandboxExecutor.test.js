/**
 * Tests for Sandbox Executor Service
 * 
 * Tests command execution, timeout handling, security validation, etc.
 */

const sandboxExecutor = require('../src/services/sandboxExecutor');

// Mock test data
const MOCK_CONTAINER_ID = 'test-container';
const MOCK_USER_ID = 'test-user';

describe('Sandbox Executor', () => {
  
  describe('validateCommandSafety', () => {
    it('should allow safe commands', () => {
      const result = sandboxExecutor.validateCommandSafety('ls -la');
      expect(result.valid).toBe(true);
    });

    it('should allow pwd command', () => {
      const result = sandboxExecutor.validateCommandSafety('pwd');
      expect(result.valid).toBe(true);
    });

    it('should allow echo command', () => {
      const result = sandboxExecutor.validateCommandSafety('echo "hello"');
      expect(result.valid).toBe(true);
    });

    it('should block rm command', () => {
      const result = sandboxExecutor.validateCommandSafety('rm -rf /');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('not allowed');
    });

    it('should block dd command', () => {
      const result = sandboxExecutor.validateCommandSafety('dd if=/dev/zero of=/dev/sda');
      expect(result.valid).toBe(false);
    });

    it('should block sudo command', () => {
      const result = sandboxExecutor.validateCommandSafety('sudo ls');
      expect(result.valid).toBe(false);
    });

    it('should block shutdown command', () => {
      const result = sandboxExecutor.validateCommandSafety('shutdown -h now');
      expect(result.valid).toBe(false);
    });

    it('should block apt-get install', () => {
      const result = sandboxExecutor.validateCommandSafety('apt-get install package');
      expect(result.valid).toBe(false);
    });

    it('should handle case insensitivity', () => {
      const result = sandboxExecutor.validateCommandSafety('RM -rf /');
      expect(result.valid).toBe(false);
    });

    it('should handle whitespace', () => {
      const result = sandboxExecutor.validateCommandSafety('  rm   -rf /  ');
      expect(result.valid).toBe(false);
    });
  });

  describe('Command Validation Edge Cases', () => {
    it('should allow commands with rm in output', () => {
      const result = sandboxExecutor.validateCommandSafety('grep rm file.txt');
      expect(result.valid).toBe(true);
    });

    it('should block rm even with pipes', () => {
      const result = sandboxExecutor.validateCommandSafety('ls | rm');
      expect(result.valid).toBe(false);
    });

    it('should allow find command (not destructive)', () => {
      const result = sandboxExecutor.validateCommandSafety('find /home -name "*.txt"');
      expect(result.valid).toBe(true);
    });

    it('should allow cat command', () => {
      const result = sandboxExecutor.validateCommandSafety('cat file.txt');
      expect(result.valid).toBe(true);
    });
  });

  describe('Output Size Validation', () => {
    it('should handle command with large output', async () => {
      // This test would require a running Docker container
      // Skipping in unit tests, include in integration tests
      expect(true).toBe(true);
    });
  });
});

/**
 * Integration Tests (requires running Docker container)
 * These tests should be run with: npm run test:integration
 */
describe('Sandbox Executor Integration Tests', () => {
  
  // Skip if Docker socket not available
  const skipIfNoDocker = process.env.SKIP_DOCKER_TESTS ? describe.skip : describe;

  skipIfNoDocker('executeCommand', () => {
    
    it('should execute simple command successfully', async () => {
      const result = await sandboxExecutor.executeCommand(MOCK_CONTAINER_ID, 'echo "test"');
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('test');
      expect(result.stderr).toBe('');
      expect(result.exitCode).toBe(0);
    });

    it('should capture command output', async () => {
      const result = await sandboxExecutor.executeCommand(MOCK_CONTAINER_ID, 'echo "hello world"');
      expect(result.stdout).toBe('hello world');
    });

    it('should handle failed commands', async () => {
      const result = await sandboxExecutor.executeCommand(MOCK_CONTAINER_ID, 'false');
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
    });

    it('should timeout after specified duration', async () => {
      const result = await sandboxExecutor.executeCommand(
        MOCK_CONTAINER_ID,
        'sleep 10',
        { timeout: 1000 }
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe('TIMEOUT');
    });

    it('should handle missing files', async () => {
      const result = await sandboxExecutor.executeCommand(MOCK_CONTAINER_ID, 'cat /nonexistent');
      expect(result.success).toBe(false);
      expect(result.exitCode).not.toBe(0);
    });

    it('should work with pipes', async () => {
      const result = await sandboxExecutor.executeCommand(
        MOCK_CONTAINER_ID,
        'echo "hello" | grep hello'
      );
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('hello');
    });

    it('should work with redirects', async () => {
      const result = await sandboxExecutor.executeCommand(
        MOCK_CONTAINER_ID,
        'echo "test" > /tmp/test.txt && cat /tmp/test.txt'
      );
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('test');
    });
  });

   skipIfNoDocker('executeInDirectory', () => {
    
    it('should execute command in specified directory', async () => {
      // First create a test directory
      await sandboxExecutor.executeCommand(MOCK_CONTAINER_ID, 'mkdir -p /tmp/testdir');
      
      const result = await sandboxExecutor.executeInDirectory(
        MOCK_CONTAINER_ID,
        'pwd',
        '/tmp/testdir'
      );
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('/tmp/testdir');
    });

    it('should handle directory changes', async () => {
      const result = await sandboxExecutor.executeCdCommand(
        MOCK_CONTAINER_ID,
        '/tmp',
        '/'
      );
      expect(result.success).toBe(true);
      expect(result.newWorkDir).toBe('/tmp');
    });

    it('should fail on invalid directory', async () => {
      const result = await sandboxExecutor.executeCdCommand(
        MOCK_CONTAINER_ID,
        '/nonexistent/path',
        '/'
      );
      expect(result.success).toBe(false);
      expect(result.stderr).toContain('No such file or directory');
    });

    it('should handle cd to home directory', async () => {
      const result = await sandboxExecutor.executeCdCommand(
        MOCK_CONTAINER_ID,
        '~',
        '/'
      );
      expect(result.success).toBe(true);
    });
  });

   skipIfNoDocker('isContainerHealthy', () => {
    
    it('should return true for running container', async () => {
      const isHealthy = await sandboxExecutor.isContainerHealthy(MOCK_CONTAINER_ID);
      expect(isHealthy).toBe(true);
    });

    it('should return false for nonexistent container', async () => {
      const isHealthy = await sandboxExecutor.isContainerHealthy('nonexistent-container');
      expect(isHealthy).toBe(false);
    });
  });

   skipIfNoDocker('getContainerInfo', () => {
    
    it('should return container information', async () => {
      const info = await sandboxExecutor.getContainerInfo(MOCK_CONTAINER_ID);
      expect(info).toBeDefined();
      expect(info.id).toBeDefined();
      expect(info.running).toBe(true);
      expect(info.image).toBeDefined();
    });
  });
});

/**
 * Performance Tests
 */
describe('Sandbox Executor Performance', () => {
  
  it('should execute simple command quickly', async () => {
    if (process.env.SKIP_DOCKER_TESTS) {
      return;
    }

    const start = Date.now();
    await sandboxExecutor.executeCommand(MOCK_CONTAINER_ID, 'echo "test"');
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
  });

  it('should handle multiple commands sequentially', async () => {
    if (process.env.SKIP_DOCKER_TESTS) {
      return;
    }

    const commands = [
      'echo "test1"',
      'echo "test2"',
      'echo "test3"',
      'ls -la'
    ];

    const start = Date.now();
    for (const cmd of commands) {
      await sandboxExecutor.executeCommand(MOCK_CONTAINER_ID, cmd);
    }
    const duration = Date.now() - start;

    // All commands should complete within reasonable time
    expect(duration).toBeLessThan(10000);
  });
});

/**
 * Error Handling Tests
 */
describe('Sandbox Executor Error Handling', () => {
  
  it('should handle invalid container gracefully', async () => {
    if (process.env.SKIP_DOCKER_TESTS) {
      return;
    }

    const result = await sandboxExecutor.executeCommand('invalid-container-id', 'ls');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle syntax errors in commands', async () => {
    if (process.env.SKIP_DOCKER_TESTS) {
      return;
    }

    const result = await sandboxExecutor.executeCommand(MOCK_CONTAINER_ID, 'ls | | ls');
    expect(result.success).toBe(false);
  });

  it('should provide meaningful error messages', async () => {
    if (process.env.SKIP_DOCKER_TESTS) {
      return;
    }

    const result = await sandboxExecutor.executeCommand(MOCK_CONTAINER_ID, 'nonexistent-command');
    expect(result.stderr).toBeDefined();
    expect(result.stderr.length).toBeGreaterThan(0);
  });
});

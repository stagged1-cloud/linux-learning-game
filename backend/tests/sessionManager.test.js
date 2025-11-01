/**
 * Tests for Session Manager Service
 * 
 * Tests session creation, working directory tracking, command history, etc.
 */

const sessionManager = require('../src/services/sessionManager');

describe('Session Manager', () => {
  
  // Test data
  const mockSessionData = {
    userId: '00000000-0000-0000-0000-000000000001',
    levelId: 1,
    exerciseId: 'level_1_exercise_1',
    containerId: 'test-container'
  };

  beforeEach(() => {
    // Clean up sessions before each test
    sessionManager.resetSessions();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    sessionManager.resetSessions();
  });

  describe('Session Creation', () => {
    
    it('should create a new session', async () => {
      const socketId = 'test-socket-1';
      
      // Mock containerHealthy check
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(true);

      const session = await sessionManager.createSession(socketId, mockSessionData);
      
      expect(session).toBeDefined();
      expect(session.socketId).toBe(socketId);
      expect(session.userId).toBe(mockSessionData.userId);
      expect(session.workDir).toBe('/');
      expect(session.commandHistory).toEqual([]);
      expect(session.attempt).toBe(0);
    });

    it('should throw if container is not healthy', async () => {
      const socketId = 'test-socket-2';
      
      // Mock containerHealthy check
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(false);

      await expect(
        sessionManager.createSession(socketId, mockSessionData)
      ).rejects.toThrow('not healthy');
    });

    it('should track multiple sessions', async () => {
      const socketId1 = 'test-socket-1';
      const socketId2 = 'test-socket-2';
      
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(true);

      await sessionManager.createSession(socketId1, mockSessionData);
      await sessionManager.createSession(socketId2, {
        ...mockSessionData,
        userId: '00000000-0000-0000-0000-000000000002'
      });

      const sessions1 = sessionManager.getUserSessions(mockSessionData.userId);
      expect(sessions1.length).toBe(1);

      const sessions2 = sessionManager.getUserSessions('00000000-0000-0000-0000-000000000002');
      expect(sessions2.length).toBe(1);
    });
  });

  describe('Session Retrieval', () => {
    
    it('should retrieve session by socket ID', async () => {
      const socketId = 'test-socket-3';
      
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(true);

      await sessionManager.createSession(socketId, mockSessionData);
      const session = sessionManager.getSession(socketId);
      
      expect(session).toBeDefined();
      expect(session.socketId).toBe(socketId);
    });

    it('should return null for non-existent session', () => {
      const session = sessionManager.getSession('non-existent-socket');
      expect(session).toBeNull();
    });

    it('should update lastActivity on retrieval', async () => {
      const socketId = 'test-socket-4';
      
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(true);

      await sessionManager.createSession(socketId, mockSessionData);
      
      const session1 = sessionManager.getSession(socketId);
      const lastActivity1 = session1.lastActivity;
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const session2 = sessionManager.getSession(socketId);
      const lastActivity2 = session2.lastActivity;
      
      expect(lastActivity2).toBeGreaterThan(lastActivity1);
    });
  });

  describe('Working Directory Management', () => {
    
    it('should update working directory', async () => {
      const socketId = 'test-socket-5';
      
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(true);

      await sessionManager.createSession(socketId, mockSessionData);
      
      const success = sessionManager.updateWorkDir(socketId, '/home');
      expect(success).toBe(true);
      
      const session = sessionManager.getSession(socketId);
      expect(session.workDir).toBe('/home');
    });

    it('should return false for non-existent session', () => {
      const success = sessionManager.updateWorkDir('non-existent', '/home');
      expect(success).toBe(false);
    });

    it('should handle nested directory changes', async () => {
      const socketId = 'test-socket-6';
      
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(true);

      await sessionManager.createSession(socketId, mockSessionData);
      
      sessionManager.updateWorkDir(socketId, '/home');
      sessionManager.updateWorkDir(socketId, '/home/user');
      sessionManager.updateWorkDir(socketId, '/home/user/projects');
      
      const session = sessionManager.getSession(socketId);
      expect(session.workDir).toBe('/home/user/projects');
    });
  });

  describe('Command History', () => {
    
    it('should add command to history', async () => {
      const socketId = 'test-socket-7';
      
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(true);

      await sessionManager.createSession(socketId, mockSessionData);
      
      sessionManager.addCommandHistory(socketId, 'ls -la', {
        exitCode: 0,
        success: true
      });
      
      const session = sessionManager.getSession(socketId);
      expect(session.commandHistory.length).toBe(1);
      expect(session.commandHistory[0].command).toBe('ls -la');
    });

    it('should maintain command order', async () => {
      const socketId = 'test-socket-8';
      
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(true);

      await sessionManager.createSession(socketId, mockSessionData);
      
      sessionManager.addCommandHistory(socketId, 'ls', { exitCode: 0, success: true });
      sessionManager.addCommandHistory(socketId, 'pwd', { exitCode: 0, success: true });
      sessionManager.addCommandHistory(socketId, 'cd /home', { exitCode: 0, success: true });
      
      const session = sessionManager.getSession(socketId);
      expect(session.commandHistory[0].command).toBe('ls');
      expect(session.commandHistory[1].command).toBe('pwd');
      expect(session.commandHistory[2].command).toBe('cd /home');
    });

    it('should limit command history to 100 entries', async () => {
      const socketId = 'test-socket-9';
      
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(true);

      await sessionManager.createSession(socketId, mockSessionData);
      
      // Add 110 commands
      for (let i = 0; i < 110; i++) {
        sessionManager.addCommandHistory(socketId, `cmd-${i}`, { 
          exitCode: 0, 
          success: true 
        });
      }
      
      const session = sessionManager.getSession(socketId);
      expect(session.commandHistory.length).toBe(100);
      // First 10 should be removed (FIFO)
      expect(session.commandHistory[0].command).toBe('cmd-10');
    });
  });

  describe('Attempt Tracking', () => {
    
    it('should increment attempt counter', async () => {
      const socketId = 'test-socket-10';
      
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(true);

      await sessionManager.createSession(socketId, mockSessionData);
      
      expect(sessionManager.incrementAttempt(socketId)).toBe(1);
      expect(sessionManager.incrementAttempt(socketId)).toBe(2);
      expect(sessionManager.incrementAttempt(socketId)).toBe(3);
    });

    it('should return 0 for non-existent session', () => {
      const attempt = sessionManager.incrementAttempt('non-existent');
      expect(attempt).toBe(0);
    });
  });

  describe('Hint Tracking', () => {
    
    it('should mark hint as used', async () => {
      const socketId = 'test-socket-11';
      
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(true);

      await sessionManager.createSession(socketId, mockSessionData);
      
      const session1 = sessionManager.getSession(socketId);
      expect(session1.hintUsed).toBe(false);
      
      sessionManager.markHintUsed(socketId);
      
      const session2 = sessionManager.getSession(socketId);
      expect(session2.hintUsed).toBe(true);
    });
  });

  describe('Session Summary', () => {
    
    it('should return session summary', async () => {
       const socketId = 'test-socket-12';
       
       jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
         .mockResolvedValue(true);

       await sessionManager.createSession(socketId, mockSessionData);
       sessionManager.incrementAttempt(socketId);
       sessionManager.markHintUsed(socketId);
       
       // Add a small delay to ensure sessionDuration is > 0
       await new Promise(resolve => setTimeout(resolve, 1));
       
       const summary = sessionManager.getSessionSummary(socketId);
       
       expect(summary).toBeDefined();
       expect(summary.socketId).toBe(socketId);
       expect(summary.userId).toBe(mockSessionData.userId);
       expect(summary.workDir).toBe('/');
       expect(summary.attempt).toBe(1);
       expect(summary.hintUsed).toBe(true);
       expect(summary.commandCount).toBe(0);
       expect(summary.sessionDuration).toBeGreaterThanOrEqual(0);
     });

    it('should return null for non-existent session', () => {
      const summary = sessionManager.getSessionSummary('non-existent');
      expect(summary).toBeNull();
    });
  });

  describe('Session Cleanup', () => {
    
    it('should end session and cleanup', async () => {
      const socketId = 'test-socket-13';
      
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(true);

      await sessionManager.createSession(socketId, mockSessionData);
      
      let session = sessionManager.getSession(socketId);
      expect(session).toBeDefined();
      
      await sessionManager.endSession(socketId);
      
      session = sessionManager.getSession(socketId);
      expect(session).toBeNull();
    });

    it('should handle ending non-existent session', async () => {
      // Should not throw
      await expect(
        sessionManager.endSession('non-existent')
      ).resolves.not.toThrow();
    });
  });

  describe('Statistics', () => {
    
    it('should provide session statistics', async () => {
      const socketId1 = 'test-socket-14';
      const socketId2 = 'test-socket-15';
      
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(true);

      await sessionManager.createSession(socketId1, mockSessionData);
      await sessionManager.createSession(socketId2, mockSessionData);
      
      sessionManager.addCommandHistory(socketId1, 'ls', { exitCode: 0, success: true });
      sessionManager.addCommandHistory(socketId2, 'pwd', { exitCode: 0, success: true });
      
      const stats = sessionManager.getStats();
      
      expect(stats.activeSessions).toBe(2);
      expect(stats.activeUsers).toBe(1); // Both same user
      expect(stats.totalCommands).toBe(2);
    });
  });

  describe('Stale Session Cleanup', () => {
    
    it('should identify and clean up stale sessions', async () => {
      const socketId = 'test-socket-16';
      
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(true);

      await sessionManager.createSession(socketId, mockSessionData);
      
      // Artificially set lastActivity to old timestamp
      const session = sessionManager.getSession(socketId);
      session.lastActivity = Date.now() - (31 * 60 * 1000); // 31 minutes ago
      
      let existingSession = sessionManager.getSession(socketId);
      expect(existingSession).toBeDefined();
      
      await sessionManager.cleanupStaleSessions();
      
      existingSession = sessionManager.getSession(socketId);
      expect(existingSession).toBeNull();
    });

    it('should not cleanup recent sessions', async () => {
      const socketId = 'test-socket-17';
      
      jest.spyOn(require('../src/services/sandboxExecutor'), 'isContainerHealthy')
        .mockResolvedValue(true);

      await sessionManager.createSession(socketId, mockSessionData);
      
      await sessionManager.cleanupStaleSessions();
      
      const session = sessionManager.getSession(socketId);
      expect(session).toBeDefined();
    });
  });
});

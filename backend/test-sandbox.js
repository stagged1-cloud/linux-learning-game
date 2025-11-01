#!/usr/bin/env node

/**
 * Simple test script to verify sandboxExecutor functionality
 * Starts a Docker container and tests command execution
 */

require('dotenv').config();
const Docker = require('dockerode');
const sandboxExecutor = require('./src/services/sandboxExecutor');

const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
});

async function testSandboxExecution() {
  console.log('=== Sandbox Executor Test ===\n');

  let containerId = null;
  
  try {
    // Step 1: Build the sandbox image
    console.log('Step 1: Checking for sandbox image...');
    const images = await docker.listImages();
    const hasImage = images.some(img => img.RepoTags && img.RepoTags.includes('linux-sandbox:latest'));
    
    if (!hasImage) {
      console.log('Pulling alpine:latest image (this may take a minute)...');
      
      // Pull the image
      await new Promise((resolve, reject) => {
        docker.pull('alpine:latest', (err, stream) => {
          if (err) return reject(err);
          
          docker.modem.followProgress(stream, (err, output) => {
            if (err) return reject(err);
            resolve(output);
          }, (event) => {
            // Progress callback
            if (event.status) {
              process.stdout.write('.');
            }
          });
        });
      });
      
      console.log('\n✓ Alpine image pulled successfully');
    } else {
      console.log('✓ Sandbox image found');
    }

    // Step 2: Start a container
    console.log('\nStep 2: Starting test container...');
    const container = await docker.createContainer({
      Image: hasImage ? 'linux-sandbox:latest' : 'alpine:latest',
      name: 'test-sandbox-' + Date.now(),
      Cmd: ['tail', '-f', '/dev/null'],
      Tty: false,
      AttachStdin: false,
      AttachStdout: true,
      AttachStderr: true,
      OpenStdin: false,
      WorkingDir: '/',
    });

    await container.start();
    containerId = container.id;
    console.log(`✓ Container started: ${containerId.substring(0, 12)}`);

    // Wait a bit for container to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Step 3: Test basic commands
    console.log('\nStep 3: Testing command execution...\n');

    const tests = [
      { cmd: 'pwd', desc: 'Print working directory' },
      { cmd: 'echo "Hello from sandbox"', desc: 'Echo command' },
      { cmd: 'ls /', desc: 'List root directory' },
      { cmd: 'whoami', desc: 'Current user' },
      { cmd: 'uname -a', desc: 'System information' },
    ];

    for (const test of tests) {
      console.log(`Testing: ${test.desc}`);
      console.log(`Command: ${test.cmd}`);
      
      const result = await sandboxExecutor.executeCommand(containerId, test.cmd, {
        workDir: '/',
        timeout: 5000
      });

      console.log(`Exit Code: ${result.exitCode}`);
      console.log(`Success: ${result.success}`);
      
      if (result.stdout) {
        console.log(`stdout: ${result.stdout}`);
      }
      
      if (result.stderr) {
        console.log(`stderr: ${result.stderr}`);
      }
      
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      
      console.log('---\n');
    }

    // Step 4: Test working directory support
    console.log('Step 4: Testing working directory support...\n');
    
    // Create a test directory
    const mkdirResult = await sandboxExecutor.executeCommand(containerId, 'mkdir -p /tmp/test', {
      workDir: '/',
      timeout: 5000
    });
    console.log(`Created test directory: ${mkdirResult.success}`);

    // Execute command in that directory
    const pwdInTmpResult = await sandboxExecutor.executeCommand(containerId, 'pwd', {
      workDir: '/tmp/test',
      timeout: 5000
    });
    console.log(`pwd in /tmp/test: ${pwdInTmpResult.stdout}`);
    console.log('---\n');

    // Step 5: Test cd command
    console.log('Step 5: Testing cd command...\n');
    const cdResult = await sandboxExecutor.executeCdCommand(containerId, '/tmp', '/');
    console.log(`cd to /tmp: ${cdResult.success}`);
    console.log(`New working directory: ${cdResult.newWorkDir}`);
    console.log('---\n');

    console.log('✅ All tests completed successfully!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    // Cleanup: Stop and remove container
    if (containerId) {
      try {
        console.log('Cleaning up...');
        const container = docker.getContainer(containerId);
        await container.stop();
        await container.remove();
        console.log('✓ Container cleaned up');
      } catch (err) {
        console.error('Failed to cleanup container:', err.message);
      }
    }
  }
}

// Run the test
testSandboxExecution().catch(console.error);

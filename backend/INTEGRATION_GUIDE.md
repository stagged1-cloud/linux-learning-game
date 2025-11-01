# Command Execution System Integration Guide

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install dockerode
```

### 2. Create Docker Sandbox Container

```bash
# Build the sandbox image
docker build -f ../docker/sandbox/Dockerfile -t linux-sandbox ../docker/sandbox

# Run the sandbox container (keep it running)
docker run -d --name linux-sandbox \
  -v /var/run/docker.sock:/var/run/docker.sock \
  linux-sandbox
```

### 3. Configure Environment

Create/update `.env`:

```env
# Docker Configuration
DOCKER_SOCKET=/var/run/docker.sock
SANDBOX_CONTAINER_ID=linux-sandbox
COMMAND_TIMEOUT=5000

# Session Management
SESSION_CLEANUP_INTERVAL=300000

# Database (if not already configured)
DATABASE_URL=postgresql://user:password@localhost:5432/linux_game

# Other configs...
```

### 4. Run Database Migration

```bash
# Apply schema updates
psql -U postgres -d linux_game -f backend/scripts/migrate-command-execution.sql
```

### 5. Start Backend Server

```bash
npm run dev
```

You should see:
```
Server running on port 5000
Environment: development
Session cleanup interval: 300000ms
```

### 6. Test with Example Client

In another terminal:

```bash
# Interactive mode
node backend/examples/websocket-client-test.js

# Automated examples
node backend/examples/websocket-client-test.js --examples
```

## File Structure

```
backend/
├── src/
│   ├── index.js                          # Main server with WebSocket handler
│   ├── services/
│   │   ├── sandboxExecutor.js           # Docker command execution
│   │   ├── sessionManager.js            # Session state management
│   │   └── commandValidator.js          # Enhanced with output storage
│   └── routes/
│       ├── auth.js
│       ├── users.js
│       ├── levels.js
│       └── exercises.js
├── tests/
│   ├── sandboxExecutor.test.js          # Executor unit tests
│   ├── sessionManager.test.js           # Session manager tests
│   └── ...
├── examples/
│   └── websocket-client-test.js        # Test client
├── scripts/
│   └── migrate-command-execution.sql   # Database migration
├── COMMAND_EXECUTION_GUIDE.md           # Detailed documentation
├── INTEGRATION_GUIDE.md                 # This file
├── package.json                         # Updated with dockerode
└── schema.sql                           # Updated schema
```

## Key Changes Made

### 1. **New Services**
- `sandboxExecutor.js` - Executes commands in Docker containers
- `sessionManager.js` - Manages user sessions and working directories

### 2. **Updated Files**
- `index.js` - Enhanced WebSocket handler with real command execution
- `schema.sql` - Added columns for command output storage
- `package.json` - Added `dockerode` dependency
- `commandValidator.js` - Enhanced to accept execution results

### 3. **New Database Tables/Columns**
- `exercise_attempts.command_output` - Store stdout
- `exercise_attempts.command_error` - Store stderr
- `exercise_attempts.exit_code` - Store exit code
- Materialized view: `command_analytics` - Analytics on command execution

### 4. **New Routes/Events**
- WebSocket: `authenticate` - Create session with container
- WebSocket: `command` - Execute command in sandbox
- WebSocket: `resize` - Terminal resize
- WebSocket: `request-hint` - Request hint
- WebSocket: `session-info` - Get session details
- HTTP: `GET /health` - System health with session stats

## Frontend Integration

Update your frontend to use the new system:

```javascript
// Connect and authenticate
socket.emit('authenticate', {
  userId: user.id,
  levelId: currentLevel,
  exerciseId: exerciseId,
  containerId: 'linux-sandbox'
});

// Listen for authentication
socket.on('authenticated', (data) => {
  console.log('Connected, working dir:', data.workDir);
  updateTerminalState(data.workDir);
});

// Execute command
socket.emit('command', {
  command: 'ls -la',
  exerciseId: exerciseId
});

// Listen for output
socket.on('output', (data) => {
  appendToTerminal(data);
});

// Listen for results
socket.on('command-result', (data) => {
  if (data.isCorrect) {
    showSuccess(data.message);
  } else {
    showError(data.message);
  }
});

// Handle directory changes
socket.on('workdir-changed', (data) => {
  updateWorkDirDisplay(data.workDir);
});

// Handle completion
socket.on('exercise-completed', (data) => {
  showCompletionBanner(data);
});
```

## Testing

### Unit Tests

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

### Integration Tests

```bash
# Run integration tests (requires Docker)
npm run test:integration

# Or skip Docker tests
SKIP_DOCKER_TESTS=true npm test
```

### Manual Testing

```bash
# Test with example client
node backend/examples/websocket-client-test.js

# Interactive shell:
# > auth                    (authenticate)
# > ls -la                  (execute commands)
# > cd /home               (change directory)
# > hint                   (request hint)
# > info                   (get session info)
# > exit                   (disconnect)
```

## Troubleshooting

### "Cannot connect to Docker daemon"

```bash
# Check Docker is running
docker ps

# Check socket exists
ls -la /var/run/docker.sock

# Grant permissions
sudo usermod -aG docker $USER
newgrp docker
```

### "Container is not running"

```bash
# Check container exists
docker ps -a

# Start container if stopped
docker start linux-sandbox

# View logs
docker logs linux-sandbox
```

### "Command timeout after 5000ms"

**Option 1:** Increase timeout in `.env`
```env
COMMAND_TIMEOUT=10000  # 10 seconds
```

**Option 2:** Optimize Docker container performance
- Check CPU/memory limits
- Check for I/O bottlenecks

### "Database connection failed"

```bash
# Check database is running
psql -U postgres -c "SELECT 1"

# Check database exists
psql -U postgres -l | grep linux_game

# Create database if needed
createdb -U postgres linux_game
psql -U postgres -d linux_game -f backend/schema.sql
```

### Session cleanup errors

Check logs for:
```
Error during session cleanup: ...
```

Make sure `SESSION_CLEANUP_INTERVAL` is set in `.env` (defaults to 5 minutes).

## Performance Optimization

### 1. Container Pooling
Pre-create multiple containers:
```bash
for i in {1..5}; do
  docker run -d --name linux-sandbox-$i linux-sandbox
done
```

Then route requests to different containers.

### 2. Output Caching
Cache command results for common commands (ls, pwd, etc.)

### 3. Command Queuing
For high load, queue commands instead of executing immediately

### 4. Resource Limits
Set Docker resource limits:
```bash
docker run -d --name linux-sandbox \
  --cpus="1" \
  --memory="512m" \
  linux-sandbox
```

## Monitoring

### Health Check Endpoint

```bash
curl http://localhost:5000/health

# Response:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "sessions": {
    "activeSessions": 5,
    "activeUsers": 3,
    "totalCommands": 42
  }
}
```

### Logs

```bash
# Backend logs
npm run dev 2>&1 | tee backend.log

# Container logs
docker logs -f linux-sandbox

# Database logs
# (depends on PostgreSQL configuration)
```

### Metrics to Monitor

1. **Session Metrics**
   - Active sessions count
   - Active users count
   - Average session duration
   - Idle timeouts

2. **Command Metrics**
   - Commands per minute
   - Average execution time
   - Success/failure rates
   - Timeout frequency

3. **Resource Metrics**
   - Memory usage per session
   - Docker container resources
   - Database connection pool
   - Network I/O

## Production Deployment

### Dockerfile

The backend Dockerfile should mount the Docker socket:

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --only=production

COPY backend/src ./src

EXPOSE 5000

CMD ["node", "src/index.js"]
```

### Docker Compose

```yaml
backend:
  build:
    context: .
    dockerfile: backend/Dockerfile
  ports:
    - "5000:5000"
  environment:
    - DATABASE_URL=postgresql://user:password@db:5432/linux_game
    - DOCKER_SOCKET=/var/run/docker.sock
    - NODE_ENV=production
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  depends_on:
    - db
    - sandbox

sandbox:
  image: linux-sandbox:latest
  container_name: linux-sandbox
  stdin_open: true
  tty: true
  volumes:
    - /var/run/docker.sock:/var/run/docker.sock
  networks:
    - app-network
```

### Environment Variables (Production)

```env
# Security
NODE_ENV=production
JWT_SECRET=<generate-secure-random>
SESSION_SECRET=<generate-secure-random>

# Database
DATABASE_URL=postgresql://user:secure-password@db:5432/linux_game

# Docker
DOCKER_SOCKET=/var/run/docker.sock
SANDBOX_CONTAINER_ID=linux-sandbox
COMMAND_TIMEOUT=5000

# Session Management
SESSION_CLEANUP_INTERVAL=300000

# Rate Limiting
MAX_REQUESTS_PER_MINUTE=100

# CORS
CORS_ORIGIN=https://yourdomain.com

# Port
PORT=5000
```

### Security Checklist

- [ ] Docker socket permissions restricted
- [ ] Command safety validation enabled
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] JWT secrets strong (32+ chars)
- [ ] Database credentials in secrets, not .env
- [ ] HTTPS enabled on frontend
- [ ] Container resource limits set
- [ ] Regular security updates

## Next Steps

1. **Frontend Integration**: Update Terminal component to use real commands
2. **Exercise Validation**: Enhance commandValidator.js for your specific exercises
3. **Analytics**: Set up monitoring dashboards
4. **Scaling**: Implement container pooling for high load
5. **Advanced Features**: Add file upload support, multi-container sessions, etc.

## Support

For issues or questions:
1. Check COMMAND_EXECUTION_GUIDE.md for detailed documentation
2. Review test files for usage examples
3. Check Docker logs: `docker logs linux-sandbox`
4. Check backend logs: `npm run dev`
5. Check database: `psql -U postgres -d linux_game`

## Related Documentation

- [Command Execution Guide](./COMMAND_EXECUTION_GUIDE.md)
- [Schema Documentation](./schema.sql)
- [API Routes](./src/routes/)
- [Docker Documentation](https://docs.docker.com/)
- [Socket.io Documentation](https://socket.io/docs/)

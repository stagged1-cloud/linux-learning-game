# LINUX COMMAND LEARNING GAME - Docker + WSL Architecture Plan

## Executive Summary

Your Docker + WSL approach is **perfect** for this project because:
- **WSL is Linux-native** - No virtualization overhead
- **Docker containers** provide isolated, reproducible Linux environments for training
- **Web interface** remains accessible from any browser (including Windows host browser at `localhost:3000`)
- **Scalability** - Can easily add more containers, services, and learners
- **Cost-free** - All components use free/open-source tools
- **Real Linux commands** - Training happens in actual Linux containers, not simulated

---

## 1. Architecture Overview

```
Windows 11 / WSL2
    └── Docker Engine (running in WSL2)
         ├── Frontend Service (React on Nginx)
         ├── Backend Service (Node/Python API)
         ├── Training Sandbox (Alpine Linux or Ubuntu - actual Linux environment)
         ├── Database Service (PostgreSQL or SQLite)
         └── Cache Service (Redis)

User Browser (Windows Host)
    └── http://localhost:3000
         └── Connects to all services via Docker network
```

---

## 2. Why Docker + WSL Works Better

| Aspect | Browser Simulator | Docker + WSL |
|--------|-------------------|-------------|
| **Real Linux** | Emulated/Sandboxed JS | Actual Linux kernel via WSL2 |
| **Command Support** | Limited to implemented commands | All 1000+ Linux commands |
| **Performance** | Slow JS interpretation | Native execution speed |
| **Persistence** | Browser storage only | Persistent Docker volumes |
| **Scalability** | Single browser instance | Multiple users, multiple containers |
| **Accessibility** | Must be in browser | Web interface + Docker CLI access |
| **Setup Time** | Complex JS implementation | Simple `docker-compose up` |

---

## 3. Technical Stack

### 3.1 Infrastructure (Docker Compose)

```yaml
services:
  frontend:
    - React 18+ with TypeScript
    - Xterm.js (terminal UI in browser)
    - State management (Redux or Zustand)
    - Styled-components or Tailwind CSS
    
  backend:
    - Node.js (Express) or Python (FastAPI/Flask)
    - REST API for user management, level progression, scoring
    - WebSocket for real-time terminal connections
    - Session management & JWT auth
    
  training-sandbox:
    - Alpine Linux 3.18+ (lightweight, ~130MB)
    - Or Ubuntu 22.04 (more familiar, ~77MB)
    - Contains: bash, utilities for levels 1-50
    - Volume-mounted for persistence
    
  database:
    - PostgreSQL 15 (production-ready) OR SQLite (simpler setup)
    - Stores: users, progress, achievements, exercise results
    
  cache:
    - Redis (optional but helpful for session/score caching)
    
  llm-gateway:
    - Groq API client (free tier: 25 req/min)
    - Hugging Face Inference API (free tier)
    - Acts as middleware for AI tutor requests
```

### 3.2 Frontend Architecture

```
src/
├── components/
│   ├── Terminal/         # Xterm.js wrapper
│   ├── LevelMenu/        # Level selection & progression
│   ├── ExercisePanel/    # Challenge description & goals
│   ├── AITutor/          # Chat sidebar with Groq/Hugging Face
│   ├── UserDashboard/    # Progress, scores, badges
│   └── AuthModal/        # Login/registration
├── pages/
│   ├── Home
│   ├── Game
│   ├── Profile
│   └── Leaderboard
├── hooks/
│   ├── useTerminal       # Terminal connection & state
│   ├── useProgress       # User progress tracking
│   ├── useAITutor        # LLM integration
│   └── useAuth           # Authentication logic
├── services/
│   ├── api.ts            # Backend API calls
│   ├── terminal.ts       # WebSocket connections
│   └── llm.ts            # LLM API wrapper
└── types/
    └── index.ts          # TypeScript definitions
```

### 3.3 Backend Architecture

```
src/
├── routes/
│   ├── auth.js           # Login, register, logout
│   ├── users.js          # Profile, stats, achievements
│   ├── levels.js         # Level data, progression
│   ├── exercises.js      # Exercise validation, scoring
│   └── llm.js            # Tutor prompt routing
├── controllers/
│   ├── AuthController
│   ├── UserController
│   ├── LevelController
│   └── ExerciseController
├── models/
│   ├── User
│   ├── Progress
│   ├── Achievement
│   └── ExerciseResult
├── services/
│   ├── ExerciseValidator  # Checks if command output matches goals
│   ├── ScoringEngine      # Points, badges, multipliers
│   ├── LLMService         # Groq/Hugging Face integration
│   └── DatabaseService    # CRUD operations
├── middleware/
│   ├── authMiddleware.js  # JWT verification
│   ├── errorHandler.js
│   └── logging.js
└── websocket/
    └── terminalServer.js  # Handles terminal I/O
```

---

## 4. Level Curriculum (1-50)

### Tier 1: Beginner (Levels 1-10)
Basic filesystem navigation and operations.

| Level | Focus | Commands | Example Exercise |
|-------|-------|----------|------------------|
| 1 | Directory navigation | `pwd`, `ls`, `cd` | "Print current directory, then list files" |
| 2 | File creation | `touch`, `mkdir` | "Create 3 folders and a file named `data.txt`" |
| 3 | File operations | `cp`, `mv`, `rm` | "Copy a file, rename it, then delete the original" |
| 4 | File content | `cat`, `echo` | "Create a file with text using echo, then display it" |
| 5 | Wildcards & patterns | `*`, `?`, `[]` | "Find all `.txt` files and copy them to a folder" |
| 6 | Command chaining | `;`, `&&`, ` \| ` | "Run 3 commands in sequence" |
| 7 | Piping basics | ` \| ` | "List files and count them with `wc`" |
| 8 | Review & combo | Mix of 1-7 | Multi-step challenge combining all basics |
| 9 | Permissions intro | `ls -l`, reading permissions | "List files in long format and identify ownership" |
| 10 | Beginner quiz | All Levels 1-9 | "Solve a 5-step filesystem puzzle" |

### Tier 2: Intermediate (Levels 11-20)
Text editing, permissions, and basic process management.

| Level | Focus | Commands | Example Exercise |
|-------|-------|----------|------------------|
| 11 | Text editing | `nano`, `vi` basics | "Edit a file, add 3 lines, save" |
| 12 | File permissions | `chmod` (octal & symbolic) | "Change a file to `755` permissions" |
| 13 | Ownership | `chown`, `chgrp` | "Change file owner and group" |
| 14 | Searching files | `grep`, `find` | "Find all lines containing 'error' in logs" |
| 15 | Text processing | `sed` basics | "Replace text in a file using sed" |
| 16 | Advanced text | `awk` basics | "Extract columns from a CSV file" |
| 17 | Process management | `ps`, `top`, `kill` | "List running processes and terminate one" |
| 18 | Environment vars | `echo $VAR`, `export` | "Create and use environment variables" |
| 19 | Compression | `tar`, `gzip`, `zip` | "Archive and compress a folder" |
| 20 | Intermediate quiz | All Levels 11-19 | "Modify log files, manage permissions, create archives" |

### Tier 3: Advanced (Levels 21-30)
Scripting, piping, and user/group management.

| Level | Focus | Commands | Example Exercise |
|-------|-------|----------|------------------|
| 21 | Bash scripting | Shebang, variables, syntax | "Write a script that echoes your name" |
| 22 | Script control | `if/else`, `test` | "Script that checks if file exists" |
| 23 | Loops | `for`, `while` | "Loop through files and process each" |
| 24 | Functions | Function definition & calling | "Write function that counts lines in files" |
| 25 | User management | `useradd`, `userdel`, `id` | "Create user, assign to group, verify" |
| 26 | Group management | `groupadd`, `groups`, `usermod` | "Create group, add users, list members" |
| 27 | Advanced piping | Complex pipes, `tee` | "Chain 5+ commands together efficiently" |
| 28 | Job control | `&`, `fg`, `bg`, `jobs` | "Run background jobs and manage them" |
| 29 | Advanced permissions | ACLs, `umask` | "Set granular file access controls" |
| 30 | Advanced quiz | All Levels 21-29 | "Write multi-function script with user management" |

### Tier 4: Professional (Levels 31-40)
Networking, system administration, and package management.

| Level | Focus | Commands | Example Exercise |
|-------|-------|----------|------------------|
| 31 | Network basics | `ip`, `ifconfig`, `hostname` | "Display network configuration" |
| 32 | Connectivity | `ping`, `netstat`, `ss` | "Check network connectivity and active connections" |
| 33 | Remote access | `ssh`, `scp`, `ssh-keygen` | "Generate SSH keys and understand key-based auth" |
| 34 | Web tools | `curl`, `wget` | "Download file and check HTTP headers" |
| 35 | Package mgmt | `apt`/`yum`, `apt-get` | "Install, update, remove packages (simulated)" |
| 36 | System info | `uname`, `lsb_release`, `df`, `du` | "Display system and disk information" |
| 37 | Service management | `systemctl`, `service` | "Start, stop, restart services (simulated)" |
| 38 | Log viewing | `tail`, `journalctl` | "Monitor and analyze system logs" |
| 39 | Scheduling | `cron`, `at` | "Schedule tasks using crontab" |
| 40 | Pro quiz | All Levels 31-39 | "Setup service, manage users, configure scheduling" |

### Tier 5: Expert (Levels 41-50)
Security, advanced automation, and edge cases.

| Level | Focus | Commands | Example Exercise |
|-------|-------|----------|------------------|
| 41 | Text tools advanced | `tr`, `cut`, `paste`, `sort` | "Process complex text data efficiently" |
| 42 | Regex mastery | Advanced pattern matching | "Extract data using complex regular expressions" |
| 43 | File monitoring | `inotifywait`, `watch` | "Monitor file system changes in real-time" |
| 44 | Security basics | `umask`, `sudo`, `sudoers` | "Configure sudo access and privilege escalation" |
| 45 | Firewall basics | `ufw`, `iptables` (simulated) | "Configure firewall rules (conceptual)" |
| 46 | Encryption basics | `openssl`, `gpg` basics | "Encrypt/decrypt files conceptually" |
| 47 | Performance tuning | `nice`, `renice`, `time` | "Analyze and optimize command execution" |
| 48 | Debugging scripts | `set -x`, `trap`, error handling | "Debug bash scripts and handle errors" |
| 49 | System hardening | Best practices review | "Apply security hardening techniques" |
| 50 | Expert capstone | Comprehensive challenge | "Execute 20+ commands in realistic workflow" |

---

## 5. Docker Compose File Structure

```yaml
version: '3.8'

services:
  # Frontend - React application
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:5000
      - REACT_APP_WS_URL=ws://localhost:5000
    depends_on:
      - backend
    networks:
      - linux-game-network

  # Backend API
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/linux_game
      - REDIS_URL=redis://cache:6379
      - GROQ_API_KEY=${GROQ_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - cache
    networks:
      - linux-game-network

  # Training sandbox - Actual Linux container
  sandbox:
    image: alpine:3.18
    # OR: image: ubuntu:22.04
    command: sleep infinity
    volumes:
      - sandbox-data:/root
      - ./exercises:/exercises:ro  # Read-only exercise definitions
    networks:
      - linux-game-network
    cap_add:
      - SYS_ADMIN  # Allow system calls (optional)

  # Database
  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=linux_game
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./backend/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    networks:
      - linux-game-network

  # Cache
  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    networks:
      - linux-game-network

volumes:
  sandbox-data:
  postgres-data:

networks:
  linux-game-network:
    driver: bridge
```

---

## 6. User Flow & Terminal Connection

```
User in Browser (localhost:3000)
    ↓
[React Terminal Component with Xterm.js]
    ↓
[WebSocket Connection to Backend]
    ↓
[Backend Routes Command to Docker Container via Docker API]
    ↓
[Training Sandbox Executes Command]
    ↓
[Output Captured & Returned to Browser]
    ↓
[Display in Terminal UI]
    ↓
[Backend Validates Exercise Completion]
    ↓
[Update Database with Progress & Points]
```

---

## 7. LLM Integration (AI Tutor)

### Free LLM Options
1. **Groq** (Recommended)
   - Free tier: 25 requests/min
   - Fast inference
   - Sign up at console.groq.com
   - API: `https://api.groq.com/openai/v1`

2. **Hugging Face Inference API**
   - Free tier: Rate limited
   - Sign up at huggingface.co
   - Models: `meta-llama/Llama-2-7b`, `mistral-7b`

### Integration Points
```javascript
// When user gets exercise wrong:
const tutorResponse = await callLLM(
  `User tried command: ${userCommand}\n` +
  `Error: ${commandError}\n` +
  `Exercise goal: ${exerciseGoal}\n` +
  `Provide a hint and explanation.`
);

// Display in AI Tutor sidebar
displayTutorMessage(tutorResponse);
```

---

## 8. Database Schema (PostgreSQL)

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- User progress tracking
CREATE TABLE progress (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  level INT NOT NULL,
  status VARCHAR(20) DEFAULT 'locked',  -- locked, in_progress, completed
  score INT DEFAULT 0,
  exercises_completed INT DEFAULT 0,
  last_attempt TIMESTAMP,
  UNIQUE(user_id, level)
);

-- Achievements/Badges
CREATE TABLE achievements (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  badge_name VARCHAR(50),
  earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_name)
);

-- Exercise results (for analytics)
CREATE TABLE exercise_results (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  level INT NOT NULL,
  exercise_num INT NOT NULL,
  command_executed VARCHAR(500),
  success BOOLEAN,
  attempts INT,
  time_taken_seconds INT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 9. Development Workflow

### Step 1: Setup (First Time)
```bash
# In WSL terminal:
cd ~/Projects/"Linux Training"
git clone <your-repo>  # or init new repo
cd linux-learning-game

# Copy environment template
cp .env.example .env
# Edit .env with GROQ_API_KEY, JWT_SECRET, etc.

# Start all services
docker-compose up -d

# Wait 30 seconds for services to start
sleep 30

# Check services are running
docker-compose ps
```

### Step 2: Development (Daily)
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f backend   # Backend logs
docker-compose logs -f frontend  # Frontend logs

# Access web app
# Open browser: http://localhost:3000

# Run terminal commands in sandbox (testing)
docker-compose exec sandbox /bin/sh
# > ls
# > cd /tmp
# > mkdir test
# > exit

# Stop services
docker-compose down
```

### Step 3: Make Changes
```bash
# Edit code normally in VS Code
# Services auto-reload (if hot-reload configured)

# Rebuild if Dockerfile changed
docker-compose up -d --build

# Database migrations
docker-compose exec backend npm run migrate
```

---

## 10. Project Directory Structure

```
linux-learning-game/
├── docker-compose.yml          # Service definitions
├── .env.example                # Environment template
├── .dockerignore
├── .gitignore
│
├── frontend/                   # React app
│   ├── Dockerfile
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── App.tsx
│   │   └── index.tsx
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                    # Node/Python API
│   ├── Dockerfile
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── server.js
│   │   └── websocket.js
│   ├── schema.sql              # Database initialization
│   ├── package.json
│   └── .env.example
│
├── exercises/                  # Exercise definitions (JSON)
│   ├── level_01.json
│   ├── level_02.json
│   ├── ...
│   └── level_50.json
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md         # This file
│   ├── SETUP_GUIDE.md
│   ├── API_REFERENCE.md
│   ├── LEVEL_DESIGN.md
│   └── TROUBLESHOOTING.md
│
└── scripts/                    # Utility scripts
    ├── init-db.sh             # Initialize database
    ├── seed-exercises.sh      # Load exercises
    └── backup-data.sh         # Backup progress
```

---

## 11. Benefits of This Approach

| Aspect | Benefit |
|--------|---------|
| **Web-based** | Access from any browser on Windows host |
| **Real Linux** | Users run actual commands in real Linux environment |
| **Scalable** | Multiple users can have separate sandbox containers |
| **Reproducible** | Docker ensures same environment every time |
| **Educational** | Learn Docker + Linux + Full-stack web dev simultaneously |
| **Cost-free** | All tools are open-source or free tier |
| **Persistent** | Progress saved to database, not just browser storage |
| **AI-enhanced** | Free LLM tutoring for guidance |
| **WSL-friendly** | No heavy virtualization, fast setup |

---

## 12. Next Steps

1. **Create project structure** - Set up folders and Dockerfiles
2. **Write docker-compose.yml** - Define all services
3. **Build frontend** - React + Xterm.js terminal component
4. **Build backend** - Express API + WebSocket server
5. **Design exercises** - JSON files for all 50 levels
6. **Integrate LLM** - Connect Groq/Hugging Face API
7. **Test end-to-end** - Verify user flow from browser to sandbox
8. **Deploy** - Consider hosting on free tier (Railway, Render, etc.)

---

## Summary

Your Docker + WSL approach is **superior** to browser-based simulation because it provides:
- ✅ Real Linux environments
- ✅ All 1000+ commands available
- ✅ Better performance and scalability
- ✅ Persistent user progress
- ✅ Web accessibility from any browser
- ✅ Minimal setup (one `docker-compose up` command)
- ✅ Free to run and deploy

---

## Planning Documentation

This document is part of a comprehensive planning suite:

1. **claude plan.md** (this file) - Phase 1 architecture overview
2. **AGENTS.md** - Multi-agent task delegation and roles
3. **FILE_ANALYSIS_PLATFORM.md** - Phase 2 design (logs, PCAP, HL7, DICOM analysis)
4. **PROJECT_SUMMARY.md** - High-level vision, timeline, execution plan

**Read in this order:**
1. Start with **PROJECT_SUMMARY.md** for the big picture
2. Review **AGENTS.md** to understand task delegation
3. Dive into **claude plan.md** (this) for Phase 1 technical details
4. Review **FILE_ANALYSIS_PLATFORM.md** for Phase 2 vision

---

**You're ready to delegate and build!** 🚀

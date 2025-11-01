# 🚀 Linux Learning Game - Quick Start

## Prerequisites

You need to have these installed on Windows:
- [Docker Desktop](https://www.docker.com/products/docker-desktop) (includes Docker & Docker Compose)
- [Node.js 18+](https://nodejs.org/)
- [Git](https://git-scm.com/)

## Quick Start (3 steps)

### Step 1: Get Your Groq API Key (5 minutes)

The AI tutor won't work without this, but the game will still run for learning.

1. Go to https://console.groq.com
2. Sign up (free account)
3. Create an API key
4. Copy it

### Step 2: Update .env File

The `.env` file is already created, but you need to add your Groq API key:

```bash
cd "C:\Users\don_t\Desktop\Projects\Linux Training"
# Edit .env with notepad or your text editor
# Find the line: GROQ_API_KEY=YOUR_GROQ_API_KEY_HERE
# Replace with your actual key
```

Or from PowerShell:
```powershell
$env = Get-Content ".env"
$env = $env -replace "YOUR_GROQ_API_KEY_HERE", "your_actual_key_here"
$env | Set-Content ".env"
```

### Step 3: Start Docker Compose

In PowerShell or Windows Terminal:

```powershell
cd "C:\Users\don_t\Desktop\Projects\Linux Training"
docker compose up --build
```

This starts:
- **Frontend:** http://localhost:3000 (React app)
- **Backend:** http://localhost:5000 (API server)
- **Database:** localhost:5432 (PostgreSQL)
- **Cache:** localhost:6379 (Redis)
- **Sandbox:** Internal Linux container for terminal

## What's Running

### Frontend (React)
- Games, levels, exercises
- Terminal UI with Xterm.js
- User dashboard
- Progress tracking

### Backend (Node.js/Express)
- REST API for game logic
- WebSocket for terminal I/O
- User authentication
- Exercise validation

### Database (PostgreSQL)
- User accounts
- Progress tracking
- Exercise history

### Sandbox (Alpine Linux)
- Real Linux terminal
- Command execution
- File system for exercises

## First Time Usage

1. **Open browser:** http://localhost:3000
2. **Click "Start Learning"**
3. **Sign up** with any username/password
4. **Complete Level 1 exercises:**
   - `pwd` - Print working directory
   - `ls` - List files
   - `cd` - Change directory
   - `cd ..` - Go up one level
   - `ls -a` - Show hidden files

## Docker Commands

```powershell
# Start everything
docker compose up --build

# Start in background
docker compose up -d --build

# View logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop everything
docker compose down

# Stop and remove all data (fresh start)
docker compose down -v
```

## Troubleshooting

### "docker: command not found"
- Install Docker Desktop from https://www.docker.com/products/docker-desktop
- Restart your terminal after installing

### Port already in use
```powershell
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process
taskkill /PID <process_id> /F

# Or change ports in docker-compose.yml
```

### Database won't connect
```powershell
# Recreate the database
docker compose down -v
docker compose up --build
```

### Frontend shows blank page
- Wait 30 seconds for React to compile
- Check browser console (F12) for errors
- Check backend logs: `docker compose logs -f backend`

## Next Steps

Once the game is running:

1. **Complete Levels 1-5** - Get familiar with basic Linux commands
2. **I'll expand to Levels 6-50** while you train
3. **Integrate Groq AI** for hint system
4. **Deploy to Railway** for public access

## File Structure

```
linux-learning-game/
├── frontend/              # React app
├── backend/               # Express server
├── exercises/             # Level definitions (JSON)
├── docker/
│   └── sandbox/          # Linux container for terminal
├── docker-compose.yml    # Orchestrates all services
├── .env                  # Configuration (IMPORTANT: Add Groq key here)
└── .env.example          # Template
```

## Got Stuck?

1. Check logs: `docker compose logs -f`
2. Check this file for troubleshooting
3. Rebuild: `docker compose down -v && docker compose up --build`

Good luck! 🚀

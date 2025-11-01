# Your First Steps - Getting the Game Running

## ✅ What's Been Created

I've built the foundation for your Linux Learning Game:

### Project Structure ✓
- Complete directory structure (frontend, backend, exercises, docker)
- Docker Compose configuration for 5 services
- All Dockerfiles (frontend, backend, sandbox)
- Git repository initialized

### Frontend ✓
- React 18 + TypeScript setup
- Xterm.js terminal component
- 4 pages: Home, Login, Game, Dashboard
- Responsive UI with Tailwind CSS
- WebSocket connection to backend

### Backend ✓
- Express + Node.js server
- Authentication routes (register, login)
- User, level, and exercise routes
- WebSocket handler for terminal
- PostgreSQL database schema
- JWT authentication middleware

### Exercises ✓
- Level 1: Basic Navigation (5 exercises)
- Level 2: Creating and Viewing Files (5 exercises)
- JSON format for easy expansion

### Documentation ✓
- README.md with full instructions
- .env.example template
- .gitignore configured

---

## 🚀 Next Steps to Get Running

### Step 1: Push to GitHub (Required)

You need to authenticate with GitHub to push your code:

```bash
cd "/mnt/c/Users/don_t/Desktop/Projects/Linux Training"

# Option A: Use GitHub CLI (recommended)
gh auth login
git push -u origin main

# Option B: Use personal access token
# Go to: https://github.com/settings/tokens
# Create a token, then:
git push -u origin main
# Enter your username and token as password
```

### Step 2: Get API Keys (5 minutes)

1. **Groq API Key** (required for AI tutor):
   - Go to https://console.groq.com
   - Sign up (free)
   - Create API key
   - Copy it

2. **JWT Secret** (required):
   ```bash
   # Generate a secure secret:
   openssl rand -base64 32
   # Copy the output
   ```

### Step 3: Create .env File

```bash
cd "/mnt/c/Users/don_t/Desktop/Projects/Linux Training"
cp .env.example .env
nano .env  # or use any text editor
```

Add your values:
```env
GROQ_API_KEY=your_groq_key_here
JWT_SECRET=your_generated_secret_here
DATABASE_URL=postgresql://postgres:password@postgres:5432/linux_game
POSTGRES_PASSWORD=password
NODE_ENV=development
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=ws://localhost:5000
```

### Step 4: Install Dependencies & Start

```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Go back to root
cd ..

# Start everything with Docker Compose
docker-compose up --build
```

This will start:
- Frontend at http://localhost:3000
- Backend at http://localhost:5000
- PostgreSQL at localhost:5432
- Redis at localhost:6379
- Linux sandbox container

### Step 5: Test It Out!

1. Open browser to http://localhost:3000
2. Click "Start Learning"
3. You should see the Game page with a terminal
4. Try typing: `pwd` and press Enter

---

## 🐛 Troubleshooting

### Docker Issues

**Problem**: Docker containers won't start
```bash
# Check Docker is running
docker ps

# View logs
docker-compose logs -f

# Rebuild
docker-compose down
docker-compose up --build
```

**Problem**: Port already in use
```bash
# Find process using port 3000
lsof -i :3000
# Kill it
kill -9 <PID>

# Or change ports in .env
REACT_APP_API_URL=http://localhost:5001
```

### Database Issues

**Problem**: Can't connect to database
```bash
# Check PostgreSQL is running
docker-compose ps

# View database logs
docker-compose logs postgres

# Recreate database
docker-compose down -v
docker-compose up -d postgres
```

### Node Modules Issues

**Problem**: Module not found errors
```bash
# Delete node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

cd ../backend
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Quick Development Commands

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Rebuild after changes
docker-compose up --build

# Run frontend only (for faster dev)
cd frontend && npm start

# Run backend only
cd backend && npm run dev
```

---

## 🎯 What You Can Do Right Now

Even with just Level 1 & 2:

1. **Sign up** for an account (data saved to PostgreSQL)
2. **Complete exercises** in Level 1:
   - pwd (print working directory)
   - ls (list files)
   - cd (change directory)
   - cd .. (go up one level)
   - ls -a (show hidden files)

3. **Track progress** (Dashboard page)
4. **Earn points** for completed exercises

---

## 🔨 Next Development Tasks

Once you have it running, here's what to build next:

### Week 1 Priorities:
1. **Create Levels 3-5** (following level_01.json format)
2. **Implement actual command execution** in sandbox container
3. **Add validation logic** to check if commands are correct
4. **Integrate Groq AI** for hints
5. **Test with real terminal commands**

### Week 2:
6. Create Levels 6-15
7. Add achievements system
8. Implement leaderboard refresh
9. Add more robust error handling
10. Deploy to Railway

---

## 💡 Tips

1. **Start simple**: Get Level 1 working perfectly before adding more
2. **Use Docker logs**: `docker-compose logs -f backend` shows errors
3. **Test incrementally**: Don't build everything before testing
4. **Database changes**: After schema changes, rebuild: `docker-compose down -v && docker-compose up`

---

## 📚 Key Files to Understand

- `docker-compose.yml` - Orchestrates all services
- `backend/src/index.js` - Main server entry point
- `frontend/src/components/Terminal.tsx` - Terminal component
- `backend/schema.sql` - Database structure
- `exercises/level_01.json` - Exercise format

---

## ✨ You're Ready!

Everything is set up. Just need to:
1. Push to GitHub
2. Get Groq API key
3. Create .env file
4. Run `docker-compose up`

Then open http://localhost:3000 and start learning Linux!

Questions? Check the README.md or planning docs.

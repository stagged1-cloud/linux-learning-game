# Linux Learning Game

An interactive, browser-based platform to master Linux commands through 50 progressive levels of hands-on exercises.

## Features

- 50 Progressive Levels (Beginner → Expert)
- Real Linux terminal in browser using Xterm.js
- Interactive exercises with instant feedback
- AI-powered tutor for hints
- Progress tracking and achievements
- Leaderboard system
- 100% Free and Open Source

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + Socket.IO
- **Database**: PostgreSQL
- **Terminal**: Xterm.js
- **Containers**: Docker + Docker Compose
- **LLM**: Groq API (free tier)

## Quick Start

### Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Git

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/stagged1-cloud/linux-learning-game.git
   cd linux-learning-game
   ```

2. **Create .env file**
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and add your:
   - `GROQ_API_KEY` (get from https://console.groq.com)
   - `JWT_SECRET` (generate with: `openssl rand -base64 32`)

3. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Database: localhost:5432

### Development Setup (Without Docker)

#### Frontend
```bash
cd frontend
npm install
npm start
```

#### Backend
```bash
cd backend
npm install

# Set up database (make sure PostgreSQL is running)
psql -U postgres -d linux_game -f schema.sql

npm run dev
```

## Project Structure

```
linux-learning-game/
├── frontend/              # React + TypeScript frontend
│   ├── src/
│   │   ├── components/    # React components (Terminal, etc.)
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── services/      # API services
│   │   └── types/         # TypeScript types
│   └── public/
├── backend/               # Node.js + Express backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── controllers/   # Business logic
│   │   ├── services/      # Services (LLM, etc.)
│   │   ├── middleware/    # Auth, validation
│   │   └── websocket/     # Terminal WebSocket handler
│   ├── schema.sql         # Database schema
│   └── tests/
├── exercises/             # JSON exercise definitions
│   ├── level_01.json
│   ├── level_02.json
│   └── ...
├── docker/                # Docker configurations
│   └── sandbox/           # Linux sandbox Dockerfile
├── docs/                  # Documentation
├── scripts/               # Utility scripts
└── docker-compose.yml     # Multi-container setup
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/profile` - Get user profile
- `GET /api/users/progress` - Get user progress
- `GET /api/users/leaderboard` - Get leaderboard

### Levels
- `GET /api/levels` - Get all levels
- `GET /api/levels/:levelNumber` - Get specific level
- `GET /api/levels/:levelNumber/exercises` - Get exercises for level

### Exercises
- `POST /api/exercises/submit` - Submit exercise attempt
- `GET /api/exercises/:exerciseId/hint` - Get hint for exercise

## WebSocket Events

### Client → Server
- `command` - Execute terminal command
- `resize` - Terminal resize event

### Server → Client
- `output` - Terminal output
- `command-result` - Command validation result

## Environment Variables

See `.env.example` for all available configuration options.

Required:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for JWT tokens
- `GROQ_API_KEY` - Groq API key for AI tutor

## Development Workflow

1. Create feature branch
2. Make changes
3. Test locally with Docker Compose
4. Commit and push
5. Create pull request

## Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## Deployment

The project is designed to deploy on:
- Frontend: GitHub Pages / Vercel / Netlify
- Backend: Railway / Render / Heroku
- Database: Railway / Supabase

See `docs/DEPLOYMENT.md` for detailed deployment instructions.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

- Documentation: `/docs`
- Issues: GitHub Issues
- Discussions: GitHub Discussions

## Roadmap

### Phase 1 (Current) - Linux Learning Game
- [x] Project structure
- [x] Docker setup
- [x] Frontend skeleton
- [x] Backend API
- [x] Terminal component
- [ ] Complete all 50 levels
- [ ] AI tutor integration
- [ ] Deployment

### Phase 2 - File Analysis Platform
- [ ] File upload interface
- [ ] Multi-LLM consensus engine
- [ ] Log file analysis
- [ ] Network traffic analysis (Wireshark)
- [ ] Healthcare data analysis (HL7, DICOM)

## Acknowledgments

- Xterm.js for the excellent terminal emulator
- Groq for free LLM API access
- Docker for containerization
- All open source contributors

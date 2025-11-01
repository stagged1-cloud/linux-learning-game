# 🚀 Quick Multi-Agent Reference

## ✅ Installation Complete!

Both extensions are now installed and ready to use:
- ✅ **GitHub Pull Requests and Issues** (`github.vscode-pull-request-github`)
- ✅ **Augment Code** (`augment.vscode-augment`)

---

## 🎯 Quick Start (Choose One or Both!)

### Method 1: GitHub Copilot Coding Agent

**Step 1:** Add to `settings.json`:
```json
{
  "githubPullRequests.codingAgent.uiIntegration": true
}
```

**Step 2:** Enable in GitHub
- Go to: https://github.com/settings/copilot
- Enable "Copilot Coding Agent"

**Step 3:** Use It
1. Click GitHub icon in sidebar
2. Go to "Pull Requests" → "Issues"
3. Select issue → "Assign to Copilot Agent"
4. Monitor in "Copilot on My Behalf" view

**Best For:** Official GitHub integration, enterprise users

---

### Method 2: Augment Code

**Step 1:** Sign In
1. Click Augment icon in sidebar
2. Sign in with GitHub
3. Grant permissions

**Step 2:** Create Agent
1. Open Augment panel
2. Click "Remote Agent"
3. Select: `stagged1-cloud/linux-learning-game`
4. Choose branch (e.g., `main`)
5. Enter task description
6. Click "Create Agent"

**Step 3:** Monitor
- View dashboard for all running agents
- Check logs and progress
- Review PRs when complete

**Best For:** Multiple parallel agents, flexible cloud-based work

---

## 📋 Sample Issue Template

```markdown
## Setup Frontend React Components

### Description
Create the base React components for the terminal interface:
- TerminalComponent.tsx (Xterm.js wrapper)
- LevelMenu.tsx (level selection)
- ExercisePanel.tsx (challenge display)

### Acceptance Criteria
- [ ] Terminal renders with Xterm.js
- [ ] Level menu shows all 50 levels
- [ ] Exercise panel displays challenge text
- [ ] All components are TypeScript
- [ ] Tailwind CSS styling applied

### Files to Create/Modify
- `frontend/src/components/Terminal/TerminalComponent.tsx`
- `frontend/src/components/Menu/LevelMenu.tsx`
- `frontend/src/components/Exercise/ExercisePanel.tsx`

### Tech Stack
- React 18
- TypeScript
- Xterm.js
- Tailwind CSS
```

---

## 🎮 Agent Assignment Strategy

### Week 1 Parallel Agents (5 agents)

| Agent | Task | Files |
|-------|------|-------|
| 1 | Frontend React Setup | `frontend/` |
| 2 | Backend Express API | `backend/src/routes/` |
| 3 | Database Schema | `backend/schema.sql` |
| 4 | Terminal Component | `frontend/src/components/Terminal/` |
| 5 | WebSocket Server | `backend/src/websocket/` |

### Week 2 Parallel Agents (4 agents)

| Agent | Task | Files |
|-------|------|-------|
| 6 | UI Components (Menu, Dashboard) | `frontend/src/components/` |
| 7 | Exercise Validation | `backend/src/services/validation.js` |
| 8 | LLM Integration (Groq) | `backend/src/services/llm.js` |
| 9 | Docker Configuration | `docker-compose.yml`, Dockerfiles |

### Week 3 Parallel Agents (3 agents)

| Agent | Task | Files |
|-------|------|-------|
| 10 | Testing (E2E + Integration) | `backend/tests/`, `frontend/tests/` |
| 11 | Documentation | `docs/` |
| 12 | Deployment Setup | `.github/workflows/` |

---

## 🔧 Essential VS Code Settings (Copilot + Augment Together!)

```json
{
  // GitHub Copilot - Primary inline assistant
  "github.copilot.enable": {
    "*": true
  },
  "github.copilot.editor.enableAutoCompletions": true,
  
  // GitHub Copilot Agent
  "githubPullRequests.codingAgent.uiIntegration": true,
  
  // Augment - Remote agents (disable inline to avoid conflicts)
  "augment.enable": true,
  "augment.inlineCompletion.enabled": false,
  "augment.remoteAgent.enabled": true,
  
  // Git
  "git.autofetch": true,
  "git.confirmSync": false
}
```

**Why these settings?**
- ✅ Copilot handles inline suggestions (no conflicts)
- ✅ Augment remote agents work in parallel
- ✅ Both tools active simultaneously!

---

## 💡 Pro Tips

### ✅ DO
- Write clear, atomic issues (one task per agent)
- Include acceptance criteria as checkboxes
- Provide file paths and tech stack
- Run agents on independent tasks in parallel
- Review PRs within 24 hours

### ❌ DON'T
- Assign dependent tasks to parallel agents
- Write vague issue descriptions
- Skip code review
- Merge without testing
- Overload single agent with multiple tasks

---

## 🚨 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Agent not showing | Ensure extension installed, restart VS Code |
| Can't assign to Copilot | Check Copilot subscription, enable in GitHub settings |
| Augment won't connect | Sign out/in, check GitHub permissions |
| PR not created | Check agent logs, ensure acceptance criteria met |

---

## 📞 Need More Help?

- **Full Guide:** See [`MULTI_AGENT_SETUP_GUIDE.md`](./MULTI_AGENT_SETUP_GUIDE.md)
- **Project Plan:** See [`AGENTS.md`](./AGENTS.md)
- **Progress:** See [`PROGRESS.md`](./PROGRESS.md)

---

## 🎯 Next Actions

1. ✅ Extensions installed (DONE!)
2. ⬜ Configure VS Code settings (add JSON above to settings.json)
3. ⬜ Enable Copilot Agent in GitHub (if using)
4. ⬜ Sign in to Augment (if using)
5. ⬜ Create first 2-3 issues using template
6. ⬜ Assign to agents
7. ⬜ Monitor progress
8. ⬜ Review PRs
9. ⬜ Merge and iterate

**You're ready to accelerate development with AI agents! 🚀**

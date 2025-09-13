# AI Whiteboard Tutor

A real-time AI tutoring system with multimodal interaction over a collaborative whiteboard. This application provides an intelligent, interactive math learning experience with voice interaction, visual feedback, and personalized guidance.

## ✨ Features

- 🎨 **Interactive Whiteboard**: Real-time collaborative drawing with smooth pen input and advanced tools
- 🤖 **AI Tutoring**: Intelligent tutoring with Claude (Anthropic) and Cerebras models for deep reasoning and fast routing
- 🎤 **Voice Integration**: Continuous voice transcription with Wispr SDK and Voice Activity Detection
- 📊 **Knowledge Tracking**: Dynamic knowledge graph with concept mastery scoring and learning analytics  
- 🎯 **Visual Annotations**: AI-driven cursor movement, highlighting, and drawing annotations
- 🔄 **Multi-Agent System**: Orchestrated agents for problem analysis, hint generation, and visual guidance
- 💬 **Smart Interventions**: Context-aware interruptions with gentle hints, corrections, and encouragement
- 📈 **Progress Visualization**: Interactive charts and graphs showing learning progress and concept relationships

## 🏗️ Architecture

- **Frontend**: Modern React app with Konva-based whiteboard, Material-UI components, Framer Motion animations
- **Backend**: FastAPI with WebSocket support, asyncio concurrency, session management
- **Voice**: Wispr SDK for real-time transcription and Voice Activity Detection
- **AI Models**: 
  - Anthropic Claude 3 Sonnet for deep math tutoring and reasoning
  - Cerebras Llama 3.1 for fast routing, classification, and quick decisions
- **Knowledge**: NetworkX graph for concept mastery tracking and learning path generation
- **Agents**: FetchAI uAgents for multi-agent orchestration and specialized tutoring tasks

## 🚀 Quick Start

### Option 1: One-Command Setup (Recommended)

```bash
# Clone and run with automatic setup
git clone <repository-url>
cd ai-whiteboard-tutor
python run.py --setup
```

### Option 2: Manual Setup

1. **Prerequisites**:
   ```bash
   # Ensure you have Python 3.8+ and Node.js 18+ installed
   python --version  # Should be 3.8+
   node --version    # Should be 18+
   ```

2. **Get API Keys**:
   - [Anthropic API Key](https://console.anthropic.com/) - Required for AI tutoring
   - [Cerebras API Key](https://cloud.cerebras.ai/) - Required for fast routing
   - [Wispr API Key](https://wispr.ai/) - Required for voice transcription  
   - [FetchAI Agent Key](https://fetch.ai/) - Required for multi-agent system

3. **Setup Environment**:
   ```bash
   # Copy environment template
   cd backend
   cp env-template.txt .env
   
   # Edit .env file with your API keys
   nano .env  # or use your preferred editor
   ```

4. **Install Dependencies**:
   ```bash
   # Backend dependencies
   cd backend
   pip install -r requirements.txt
   
   # Frontend dependencies  
   cd ../frontend
   npm install
   ```

5. **Run the Application**:
   ```bash
   # Terminal 1: Start backend
   cd backend && python main.py
   
   # Terminal 2: Start frontend (in a new terminal)
   cd frontend && npm run dev
   ```

6. **Open**: [http://localhost:3000](http://localhost:3000)

## Project Structure

```
whiteboard/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core business logic
│   │   ├── models/         # Data models
│   │   ├── services/       # External service integrations
│   │   └── agents/         # FetchAI uAgent implementations
│   ├── requirements.txt
│   └── main.py
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API and WebSocket clients
│   │   ├── store/          # State management
│   │   └── utils/          # Utilities
│   ├── package.json
│   └── index.html
└── README.md
```

## 💻 Usage

### Getting Started
1. **First Time**: The welcome tutorial will guide you through the key features
2. **Drawing**: Use the toolbar to select drawing tools (pen, brush, highlighter)
3. **Voice**: Press `Space` to toggle voice recording, or enable continuous mode
4. **AI Help**: The AI observes your work and provides hints when appropriate
5. **Knowledge Graph**: Press `Ctrl+G` to view your learning progress

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Space` | Toggle voice recording |
| `Ctrl+Z` / `Ctrl+Y` | Undo / Redo |
| `Ctrl+S` | Open settings |
| `Ctrl+G` | Open knowledge graph |
| `F11` | Toggle fullscreen |
| `Ctrl+Shift+C` | Clear canvas |
| `E` / `B` / `H` | Switch to pen/brush/highlighter |
| `1-5` | Quick color selection |

### AI Interaction Examples
- *"I'm working on derivatives"* - Sets context for AI assistance
- *"How do I solve this equation?"* - Asks for step-by-step guidance  
- *"I'm stuck"* - Requests a hint
- *"Is this correct?"* - Gets verification and feedback
- *"Explain the chain rule"* - Receives conceptual explanation

## 🛠️ Development

### Architecture Overview

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   React App     │ ◄──────────────► │  FastAPI Server │
│                 │                  │                 │
│ - Whiteboard    │                  │ - Session Mgmt  │
│ - Voice Input   │                  │ - AI Routing    │
│ - UI Components │                  │ - WebSocket Hub │
└─────────────────┘                  └─────────────────┘
         │                                     │
         │                                     │
    ┌────▼────┐                        ┌──────▼──────┐
    │ Zustand │                        │ AI Services │
    │ Store   │                        │             │
    └─────────┘                        │ Claude API  │
                                       │ Cerebras AI │
                                       │ Wispr SDK   │
                                       └─────────────┘
```

### Key Components

**Backend (`backend/`)**:
- `main.py` - Application entry point and server startup
- `app/main.py` - FastAPI application with WebSocket endpoints
- `app/core/` - Core business logic (session, context, knowledge graph)
- `app/services/` - External service integrations (Claude, Cerebras, Wispr)
- `app/agents/` - FetchAI uAgent implementations

**Frontend (`frontend/src/`)**:
- `App.tsx` - Main application component
- `components/` - React components (Whiteboard, UI panels)
- `hooks/` - Custom React hooks (WebSocket, voice, shortcuts)
- `store/` - Zustand state management
- `services/` - API clients and WebSocket handlers

### Development Workflow

1. **Start Development Servers**:
   ```bash
   python run.py  # Starts both backend and frontend
   ```

2. **Backend Development**:
   ```bash
   cd backend
   python main.py  # Backend only on :8000
   ```

3. **Frontend Development**:
   ```bash
   cd frontend  
   npm run dev    # Frontend only on :3000
   ```

4. **Build for Production**:
   ```bash
   cd frontend
   npm run build  # Creates optimized build
   ```

### Environment Variables

Copy `backend/env-template.txt` to `backend/.env`:

```bash
# Required API Keys
ANTHROPIC_API_KEY=sk-ant-...     # Get from console.anthropic.com
CEREBRAS_API_KEY=csk-...         # Get from cloud.cerebras.ai  
WISPR_API_KEY=wsk-...            # Get from wispr.ai
FETCHAI_AGENT_KEY=fai-...        # Get from fetch.ai

# Optional Configuration  
HOST=0.0.0.0                     # Server host
PORT=8000                        # Server port
DEBUG=true                       # Development mode
CORS_ORIGINS=http://localhost:3000 # Frontend URLs
```

### Testing

```bash
# Backend tests
cd backend && python -m pytest

# Frontend tests  
cd frontend && npm test

# End-to-end tests
npm run test:e2e
```

## 🔧 Configuration

### Voice Settings
- **Continuous Mode**: AI listens continuously
- **Push-to-Talk**: Hold `Space` to record  
- **Voice Threshold**: Adjust sensitivity for voice detection
- **Language**: Support for multiple languages

### AI Tutor Settings
- **Interruption Mode**: Never / Gentle / Balanced / Active
- **Hint Frequency**: How often AI provides suggestions
- **Show Confidence**: Display AI confidence levels
- **Animate Annotations**: Enable visual feedback animations

### Canvas Settings  
- **Grid**: Show/hide drawing grid
- **Snap to Grid**: Align drawings to grid points
- **Auto Save**: Automatically save canvas changes
- **Show Rulers**: Display measurement rulers

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and test thoroughly
4. Submit a pull request with detailed description

### Code Style
- **Python**: Follow PEP 8, use Black formatter
- **TypeScript**: Use Prettier, follow React best practices  
- **Commits**: Use conventional commit format

## 📝 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **Anthropic** for Claude AI models
- **Cerebras** for ultra-fast inference
- **FetchAI** for multi-agent frameworks
- **Wispr** for voice transcription technology
- **React**, **FastAPI**, and the open-source community

---

Built for hackathon-grade rapid iteration with production-ready patterns.

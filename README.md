# DeepReason — Multi-Stage Reasoning Engine Powered by ASI:One

<p align="center">
  <strong>Think deeper. Decide better.</strong><br/>
  A structured reasoning tool that decomposes complex questions, researches each angle,<br/>
  critiques its own findings, and synthesises a decision brief — all powered by ASI:One.
</p>

---

## What It Does

DeepReason turns a single complex question into a rigorous, multi-stage analysis:

| Stage | What Happens | ASI:One Role |
|-------|-------------|-------------|
| **1. Decompose** | Breaks your question into 3–7 targeted sub-questions | Structured prompting with domain-specific framing |
| **2A. Research** | Deep-dives each sub-question with chain-of-thought reasoning | Domain-aware analysis (startup / tech / research / general) |
| **2B. Critique** | Peer-reviews every research answer for biases & logical gaps | Adversarial self-critique with confidence revision |
| **3. Synthesise** | Merges findings into Key Findings, Trade-offs, Recommendation | Senior analyst role with coverage-gap awareness |
| **4. Challenge** | Users object to any section → ASI:One re-evaluates | Iterative refinement loop driven by user pushback |

Every stage streams ASI:One's **thinking process** live to the UI — you see the reasoning unfold in real time.

---

## Key Features

- **5 distinct ASI:One call stages** with structured XML prompting and JSON schema enforcement
- **Live reasoning visualization** — thought tokens streamed via SSE
- **Challenge system** — disagree with a finding? Challenge it and watch ASI:One reconsider
- **Domain-specific framing** — startup strategy, technical architecture, academic research, or general analysis
- **Configurable depth** — Quick (3), Balanced (5), or Deep (7) sub-question decomposition
- **Optional web search** — Tavily integration for grounding research in real-world data
- **Dark / Light theme** with persistence
- **Export to Markdown** and copy-to-clipboard

---

## Architecture

```
┌────────────────────────────────┐
│         React Frontend         │
│  (Vite + Tailwind + SSE)       │
│                                │
│  usePipeline() ──► EventSource │
└──────────┬─────────────────────┘
           │ POST /api/analyze
           │ GET  /api/stream/:id
           │ POST /api/challenge
           ▼
┌────────────────────────────────┐
│       FastAPI Backend          │
│  (async pipeline + sessions)   │
│                                │
│  pipeline.py ──► asi_client.py │
│       │              │         │
│       ▼              ▼         │
│  prompts/*     ASI:One API     │
│               (api.asi1.ai)    │
│                                │
│  tavily_client.py (optional)   │
└────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Python 3.11+, FastAPI, uvicorn |
| AI Engine | ASI:One API (`asi1` model) |
| Web Search | Tavily API (optional) |
| Streaming | Server-Sent Events (SSE) |
| Validation | Pydantic v2 |
| Retry Logic | tenacity (exponential backoff) |

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- ASI:One API key ([get one here](https://asi1.ai))
- Tavily API key (optional, for web search)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/deepreason.git
cd deepreason
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt

# Create .env from example
cp .env.example .env
# Edit .env and add your ASI_ONE_API_KEY
```

### 3. Frontend setup

```bash
cd frontend
npm install

# Create .env from example
cp .env.example .env
```

### 4. Run

Start the backend (from `backend/` directory):
```bash
uvicorn main:app --reload --port 8000
```

Start the frontend (from `frontend/` directory):
```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Docker Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed

### Run with Docker Compose

```bash
# Set your API keys
cp backend/.env.example backend/.env
# Edit backend/.env with your real keys

# Build and start
docker compose up --build

# Open http://localhost:5173
```

### What the containers do

| Container | Port | Purpose |
|-----------|------|---------|
| `deepreason-backend` | 8000 | FastAPI API server |
| `deepreason-frontend` | 5173 | Nginx serving built React app |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `ASI_ONE_API_KEY` | Yes | Your ASI:One API key |
| `TAVILY_API_KEY` | No | Tavily API key for web search |
| `FRONTEND_ORIGIN` | No | CORS origin (default: `http://localhost:5173`) |
| `SESSION_TTL_MINUTES` | No | Session expiry (default: `60`) |
| `MAX_CONCURRENT` | No | Max concurrent pipelines (default: `10`) |
| `LOG_LEVEL` | No | Logging level (default: `INFO`) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | No | Backend URL (default: `http://localhost:8000`) |
| `VITE_TAVILY_ENABLED` | No | Show web search toggle (default: `false`) |

---

## How ASI:One Is Used (Depth of Integration)

DeepReason doesn't just make a single API call — it uses ASI:One as a **genuine thinking partner** across 5 structured stages:

1. **Decomposition Engine** — ASI:One breaks complex questions into dependency-aware sub-questions with domain tags
2. **Domain-Framed Research** — Each sub-question gets a tailored analytical lens (startup frameworks, engineering trade-offs, academic rigour, or first-principles thinking)
3. **Adversarial Self-Critique** — ASI:One critiques its own research, identifying logical weaknesses, biases, and confidence-changing evidence
4. **Strategic Synthesis** — Findings are elevated into a structured decision brief with key findings, trade-offs, recommendations, and confidence scores
5. **User-Driven Challenge Loop** — Users can object to any section, triggering ASI:One to re-evaluate with the challenge as input

Additional integration depth:
- **Thought/reasoning token capture** — ASI:One's `thought` and `reasoning_content` fields are streamed live
- **Structured XML prompting** — Every prompt uses XML tags for clear instruction boundaries
- **JSON schema enforcement** with automatic retry on parse failure
- **Confidence scoring** — Research confidence + critique-revised confidence averaged for final scores

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/analyze` | Start a new analysis pipeline |
| `GET` | `/api/stream/:session_id` | SSE stream of pipeline events |
| `POST` | `/api/challenge` | Challenge a section of the brief |
| `GET` | `/api/session/:session_id` | Get full session state |
| `GET` | `/api/health` | Health check |

---

## Project Structure

```
deepreason/
├── backend/
│   ├── main.py              # FastAPI app, routes, SSE streaming
│   ├── pipeline.py           # Multi-stage reasoning pipeline
│   ├── asi_client.py         # ASI:One API client with retry logic
│   ├── models.py             # Pydantic schemas for all data types
│   ├── session_store.py      # In-memory session management
│   ├── tavily_client.py      # Optional Tavily web search client
│   ├── requirements.txt      # Python dependencies
│   └── prompts/
│       ├── decompose.py      # Stage 1: Question decomposition prompt
│       ├── research.py       # Stage 2A: Deep research prompt
│       ├── critique.py       # Stage 2B: Adversarial critique prompt
│       ├── synthesise.py     # Stage 3: Decision brief synthesis prompt
│       └── challenge.py      # Stage 4: User challenge re-evaluation prompt
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Main application shell
│   │   ├── components/
│   │   │   ├── LandingPage.jsx      # Hero landing with capability cards
│   │   │   ├── ReasoningStages.jsx  # Live reasoning visualization
│   │   │   ├── BriefRenderer.jsx    # Decision brief display
│   │   │   ├── ChallengeInput.jsx   # Challenge input form
│   │   │   ├── ConfidenceBar.jsx    # Animated confidence bar
│   │   │   ├── BackgroundDoodles.jsx # Decorative SVG doodles
│   │   │   └── ...
│   │   ├── hooks/
│   │   │   ├── usePipeline.js       # Pipeline SSE state management
│   │   │   ├── useChallenge.js      # Challenge feature hook
│   │   │   └── useTheme.js          # Dark/light theme toggle
│   │   └── utils/
│   │       └── export.js            # Markdown export utilities
│   └── package.json
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## License

MIT

---

## Built For

[ASI-1 API Hackathon](https://api-innovate-2026.devpost.com/?ref_feature=challenge&ref_medium=your-open-hackathons&ref_content=Submissions+open&_gl=1*dtvwck*_gcl_au*MTg3MDU3MzE5Mi4xNzY5NDQ4MzUy*_ga*MTI2MDk4MTc2OC4xNzYxNDAyMTc5*_ga_0YHJK3Y10M*czE3NzI4NzA3OTUkbzc1JGcwJHQxNzcyODcwNzk1JGo2MCRsMCRoMA..) — February 14 – March 15, 2026

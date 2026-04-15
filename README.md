# AI-Powered Threat Correlation & Mini SOC Assistant

Real‑time SOC dashboard with LLM‑powered assistant, threat intelligence, and anomaly detection.

## Features

- Real‑time log streaming (WebSocket)
- VirusTotal enrichment → threat score → severity
- MITRE ATT&CK mapping
- Anomaly detection (Z‑score)
- Local LLM assistant (Ollama + Llama 3.2)
- Dynamic log ingestion (`POST /api/ingest`)
- Interactive dashboard with world map, charts, CSV/PDF export
- Slack alerts for critical events

## Tech Stack

- **Frontend:** Next.js, Tailwind CSS, Recharts, Socket.IO
- **Backend:** Flask, Socket.IO, Elasticsearch (Cloud)
- **AI:** Ollama (Llama 3.2), NumPy
- **Threat Intel:** VirusTotal API

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Ollama (for LLM assistant)

### Installation

1. Clone the repo
2. Backend: `cd backend && python -m venv .venv && source .venv/bin/activate` (Windows: `.venv\Scripts\activate`)  
   `pip install -r requirements.txt`
3. Frontend: `cd frontend && npm install`
4. Set environment variables (see `.env.example`)
5. Run backend: `python app.py`
6. Run frontend: `npm run dev`

### Demo Credentials

- Login: `admin123`

## License

MIT

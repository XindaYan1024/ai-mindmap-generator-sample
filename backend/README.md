# AI Mind-Map Generator — Backend

A tiny, **stateless** AI service. Send a question, get back a Markdown mind map
(main topic → subtopics → bullet points). No database, no sessions.

## Structure

```
backend/
├── app/
│   ├── ai/
│   │   └── mindmap.py     # core AI logic: generate_mindmap(question) -> markdown
│   ├── routes/
│   │   └── generate.py    # POST /generate
│   └── main.py            # FastAPI entry point
├── requirements.txt
└── .env                   # AI provider config
```

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
```

Configure the AI provider in `.env` (see `.env.example`):

- `AI_PROVIDER=ollama` — local Ollama model (default, free). Needs Ollama running
  with the model pulled: `ollama pull llama3`.
- `AI_PROVIDER=claude` — Anthropic Claude API. Set `ANTHROPIC_API_KEY`.
- `AI_PROVIDER=mock` — no AI, returns a templated mind map (handy for offline UI work).

## Run

```bash
uvicorn app.main:app --reload --port 8089
```

## API

### `POST /generate`

Request:

```json
{ "question": "How does photosynthesis work?" }
```

Response:

```json
{ "markdown": "# Photosynthesis\n\n## Inputs\n- Sunlight\n- Water\n..." }
```

### `GET /health`

```json
{ "status": "healthy" }
```

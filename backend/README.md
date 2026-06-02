# chat-backend

A small FastAPI service that returns JSON-only structured replies (matching the
frontend `MarkdownTreeNode[]` schema in `src/questions.json`) for the React
`ChatDialog` component.

The agent layer is pluggable: the current implementation is a deterministic
rule-based agent that returns the seed tree, but it can be swapped for an LLM
(OpenAI, Azure OpenAI, etc.) without touching the route.

## Quickstart

Prerequisites: Python 3.11+ and [uv](https://docs.astral.sh/uv/).

```bash
cd backend
uv sync
cp .env.example .env

uv run uvicorn app.main:app --reload --port 8000
```

- Swagger UI: <http://localhost:8000/docs>
- Health check: <http://localhost:8000/health>

### Smoke test

```bash
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -d '{"input":"hi"}'
```

Expected response shape:

```json
{
  "content": "Here is the recommended questions list.",
  "attachment": {
    "type": "mindmap",
    "tree": [{ "id": "root", "content": "# Questions\n...", "children": [...] }]
  }
}
```

### Tests

```bash
uv run pytest
```

## Swapping in an LLM

1. Implement `LLMAgent.respond` in `app/agents/llm.py` using your provider SDK.
2. Set `AGENT_BACKEND=openai` (and `OPENAI_API_KEY` / `OPENAI_MODEL`) in `.env`.
3. Restart the server — the route is unchanged.

## Layout

```
app/
  main.py             FastAPI app, CORS, router mount
  config.py           pydantic-settings (reads .env)
  logging_config.py   stdlib dictConfig
  schemas.py          TreeNode, ChatRequest, ChatReply, MindMapAttachment
  deps.py             agent factory injected via Depends
  routers/
    chat.py           POST /chat
    health.py         GET /health
  agents/
    base.py           ChatAgent Protocol
    rule_based.py     deterministic, loads data/questions.json
    llm.py            placeholder for OpenAI / Azure OpenAI
  data/
    questions.json    seed tree
tests/
  test_chat.py
```

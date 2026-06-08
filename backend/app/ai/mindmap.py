"""
Mind-map AI generation
=======================
Turns a user question/topic into a hierarchical Markdown mind map:

    # Main Topic
    ## Subtopic 1
    - Point A
    - Point B
    ## Subtopic 2
    - Point A
    - Point B

This is the only AI logic in the service. It is fully stateless — no
database, no sessions, no persistence.

Provider selection via backend/.env:
  AI_PROVIDER=ollama   → local Ollama model (free, no key needed)   [default]
  AI_PROVIDER=claude   → Anthropic Claude API (needs ANTHROPIC_API_KEY)
  AI_PROVIDER=mock     → hardcoded response, no AI at all (for offline/dev)

Ollama config:
  OLLAMA_MODEL=llama3              (or qwen2.5:7b, llama3.1:8b, etc.)
  OLLAMA_HOST=http://localhost:11434

Claude config:
  ANTHROPIC_API_KEY=sk-ant-...
  CLAUDE_MODEL=claude-sonnet-4-5   (optional, this is the default)

Switch anytime by editing .env and restarting the backend.
"""

import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend root regardless of the current working directory.
# Real environment variables take precedence (override=False) so the service is
# easy to configure in Docker/CI without editing files.
_env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=_env_path, override=False)

AI_PROVIDER  = os.getenv("AI_PROVIDER", "ollama").lower()   # ollama | claude | mock
OLLAMA_HOST  = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5")


# ─── System Prompt ──────────────────────────────────────────────────────────
# Adapted from the original slide-generator prompt: same "respond with only the
# structured output, no preamble" discipline, retargeted at a Markdown mind map.

SYSTEM_PROMPT = """You are a mind-map generator. Given a topic or question, you produce a clear, hierarchical mind map in Markdown.

## OUTPUT RULES — READ CAREFULLY
- Respond with ONLY the Markdown. No preamble, no explanation, no code fences.
- Use exactly ONE H1 (`# `) line: the main topic. It must be the first line.
- Use H2 (`## `) lines for subtopics. Provide 3-6 subtopics.
- Under each subtopic, use `- ` bullet points for supporting points. Provide 2-5 bullets each.
- Under each supporting point, add EXACTLY ONE nested bullet, indented by two spaces, containing a single complete sentence that describes or explains that point.
- Keep the H1, H2, and supporting-point lines short (a few words). Only the nested description line is a full sentence. No paragraphs.
- Do not nest deeper than the description level (two levels of bullets total).
- Stay factual and on-topic. If the input is a question, the H1 is the core subject of that question.

## FORMAT (follow exactly)
# Main Topic

## Subtopic 1
- Point A
  - A single sentence describing Point A.
- Point B
  - A single sentence describing Point B.

## Subtopic 2
- Point A
  - A single sentence describing Point A.
- Point B
  - A single sentence describing Point B.

Output only the Markdown mind map.
"""


def _normalize_markdown(text: str) -> str:
    """Strip code fences / stray preamble and guarantee a single H1 first line."""
    text = (text or "").strip()

    # Drop any standalone code-fence lines (```​ or ```markdown) wherever they appear
    lines = [ln for ln in text.split("\n") if not ln.strip().startswith("```")]
    text = "\n".join(lines).strip()

    # Drop any leading lines before the first heading (model preamble)
    lines = text.split("\n")
    for i, line in enumerate(lines):
        if line.lstrip().startswith("#"):
            lines = lines[i:]
            break
    text = "\n".join(lines).strip()

    # Ensure there is an H1 as the very first line
    if not text.startswith("# "):
        first, _, rest = text.partition("\n")
        heading = first.lstrip("#").strip() or "Mind Map"
        text = f"# {heading}\n{rest}".strip()

    return text


# ─── Providers ────────────────────────────────────────────────────────────────

async def _generate_ollama(question: str) -> str:
    import ollama as ollama_client

    response = await asyncio.to_thread(
        ollama_client.chat,
        model=OLLAMA_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
        ],
        options={"temperature": 0.7, "num_predict": 2048},
    )
    return response["message"]["content"]


async def _generate_claude(question: str) -> str:
    import anthropic

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    response = await asyncio.to_thread(
        client.messages.create,
        model=CLAUDE_MODEL,
        max_tokens=2048,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": question}],
    )
    return response.content[0].text


def _generate_mock(question: str) -> str:
    topic = (question or "Mind Map").strip().rstrip("?").strip()
    return (
        f"# {topic}\n\n"
        f"## Overview\n"
        f"- What {topic} is\n"
        f"  - This describes the core idea behind {topic}.\n"
        f"- Why it matters\n"
        f"  - This explains why {topic} is significant in practice.\n\n"
        f"## Key Aspects\n"
        f"- First aspect\n"
        f"  - This covers the first important aspect of {topic}.\n"
        f"- Second aspect\n"
        f"  - This covers the second important aspect of {topic}.\n"
        f"- Third aspect\n"
        f"  - This covers the third important aspect of {topic}.\n\n"
        f"## Considerations\n"
        f"- Common challenges\n"
        f"  - This outlines the common challenges associated with {topic}.\n"
        f"- Best practices\n"
        f"  - This summarizes the recommended best practices for {topic}.\n"
    )


# ─── Public API ─────────────────────────────────────────────────────────────

async def generate_mindmap(question: str) -> str:
    """
    Generate a hierarchical Markdown mind map for the given question/topic.

    Returns clean Markdown: one `#` main topic, `##` subtopics, and `-` bullets.
    """
    question = (question or "").strip()
    if not question:
        raise ValueError("question must not be empty")

    if AI_PROVIDER == "mock":
        return _normalize_markdown(_generate_mock(question))
    if AI_PROVIDER == "claude":
        raw = await _generate_claude(question)
    else:  # default: ollama
        raw = await _generate_ollama(question)

    return _normalize_markdown(raw)

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.ai import generate_mindmap

router = APIRouter(tags=["mindmap"])


class GenerateRequest(BaseModel):
    question: str


class GenerateResponse(BaseModel):
    markdown: str


@router.post("/generate", response_model=GenerateResponse, summary="Generate a Markdown mind map")
async def generate(req: GenerateRequest) -> GenerateResponse:
    """Take a user question/topic and return a hierarchical Markdown mind map."""
    question = (req.question or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="question must not be empty")

    try:
        markdown = await generate_mindmap(question)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation failed: {e}")

    return GenerateResponse(markdown=markdown)

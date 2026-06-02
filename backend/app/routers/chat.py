from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from ..agents.base import ChatAgent
from ..deps import get_agent
from ..schemas import ChatReply, ChatRequest

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/chat", response_model=ChatReply)
async def chat(
    payload: ChatRequest,
    agent: ChatAgent = Depends(get_agent),
) -> ChatReply:
    try:
        return await agent.respond(payload.input)
    except NotImplementedError as exc:
        # Agent is configured but not wired up yet (e.g. LLMAgent stub).
        logger.warning("Active agent is not implemented: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail=str(exc),
        ) from exc
    except Exception:
        logger.exception("Agent failed to respond")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Agent failed to respond.",
        ) from None

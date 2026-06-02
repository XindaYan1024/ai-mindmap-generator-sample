from __future__ import annotations

from functools import lru_cache

from fastapi import Depends, HTTPException, status

from .agents.base import ChatAgent
from .agents.llm import LLMAgent
from .agents.rule_based import RuleBasedAgent
from .config import Settings, get_settings


@lru_cache(maxsize=1)
def _build_rule_based() -> RuleBasedAgent:
    return RuleBasedAgent()


def get_agent(settings: Settings = Depends(get_settings)) -> ChatAgent:
    if settings.agent_backend == "rule_based":
        return _build_rule_based()
    if settings.agent_backend == "openai":
        if not settings.openai_api_key:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="OPENAI_API_KEY is not configured.",
            )
        return LLMAgent(api_key=settings.openai_api_key, model=settings.openai_model)
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=f"Unknown agent backend: {settings.agent_backend!r}",
    )

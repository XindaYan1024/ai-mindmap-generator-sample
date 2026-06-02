from __future__ import annotations

import logging

from ..schemas import ChatReply

logger = logging.getLogger(__name__)


class LLMAgent:
    """Placeholder LLM-backed agent.

    Wire this up to OpenAI / Azure OpenAI / etc. The route contract stays the
    same — `respond` returns a `ChatReply`. A working implementation should:

    1. Build a prompt that constrains the model to return JSON shaped like
       `MarkdownTreeNode[]` (use the provider's structured-output / JSON-mode).
    2. Parse the model output and validate it with `TreeNode.model_validate`.
    3. Wrap the validated tree in a `MindMapAttachment` and return a
       `ChatReply(content=..., attachment=...)`.
    """

    def __init__(self, *, api_key: str, model: str) -> None:
        self._api_key = api_key
        self._model = model
        logger.info("LLMAgent initialized (model=%s)", model)

    async def respond(self, user_input: str) -> ChatReply:
        raise NotImplementedError(
            "LLMAgent.respond is a stub. Implement it by calling your LLM "
            "provider and validating the JSON output against TreeNode."
        )

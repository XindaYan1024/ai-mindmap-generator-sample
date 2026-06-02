from __future__ import annotations

import json
import logging
from pathlib import Path

from ..schemas import ChatReply, MindMapAttachment, TreeNode

logger = logging.getLogger(__name__)

DEFAULT_RESPONSE = "Here is the recommended questions list."
_SEED_PATH = Path(__file__).resolve().parent.parent / "data" / "questions.json"


class RuleBasedAgent:
    """Deterministic agent: returns the seed tree from `data/questions.json`.

    Used as the default backend so the API is useful out-of-the-box without
    any LLM credentials. The seed is parsed and validated against `TreeNode`
    at construction so a malformed seed fails fast.
    """

    def __init__(self, seed_path: Path | None = None) -> None:
        path = seed_path or _SEED_PATH
        raw = json.loads(path.read_text(encoding="utf-8"))
        self._tree: list[TreeNode] = [TreeNode.model_validate(node) for node in raw]
        logger.info("RuleBasedAgent loaded %d root node(s) from %s", len(self._tree), path)

    async def respond(self, user_input: str) -> ChatReply:
        return ChatReply(
            content=DEFAULT_RESPONSE,
            attachment=MindMapAttachment(tree=self._tree),
        )

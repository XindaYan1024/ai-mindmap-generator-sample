from __future__ import annotations

from typing import Protocol, runtime_checkable

from ..schemas import ChatReply


@runtime_checkable
class ChatAgent(Protocol):
    """Pluggable chat agent.

    Implementations must return a `ChatReply` so the route contract is
    independent of the underlying responder (rule-based, OpenAI, Azure, ...).
    """

    async def respond(self, user_input: str) -> ChatReply: ...

    # Future:
    # async def astream(self, user_input: str) -> AsyncIterator[ChatChunk]: ...

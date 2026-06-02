from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class TreeNode(BaseModel):
    """Matches the frontend's `MarkdownTreeNode` (id / content / children)."""

    id: str
    content: str
    children: list[TreeNode] | None = None


TreeNode.model_rebuild()


class MindMapAttachment(BaseModel):
    type: Literal["mindmap"] = "mindmap"
    tree: list[TreeNode]


Attachment = MindMapAttachment


class ChatRequest(BaseModel):
    input: str = Field(min_length=1)
    # Forward-compat slot for multi-turn memory; ignored by the current agent.
    conversation_id: str | None = None


class ChatReply(BaseModel):
    """Matches the frontend's `ChatReply` shape exactly."""

    content: str
    attachment: Attachment | None = None

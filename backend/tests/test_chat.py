from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app
from app.schemas import ChatReply

client = TestClient(app)


def test_health() -> None:
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_chat_returns_questions_tree() -> None:
    res = client.post("/chat", json={"input": "hi"})
    assert res.status_code == 200

    # Validate the response matches the frontend's ChatReply contract.
    reply = ChatReply.model_validate(res.json())
    assert reply.content == "Here is the recommended questions list."
    assert reply.attachment is not None
    assert reply.attachment.type == "mindmap"

    tree = reply.attachment.tree
    assert len(tree) == 1
    root = tree[0]
    assert root.id == "root"
    assert root.children is not None
    assert {child.id for child in root.children} == {"section-1", "section-2"}


def test_chat_rejects_empty_input() -> None:
    res = client.post("/chat", json={"input": ""})
    assert res.status_code == 422

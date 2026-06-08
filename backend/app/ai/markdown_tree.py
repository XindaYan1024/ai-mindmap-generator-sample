"""
Markdown → mind-map tree
========================
Converts the Markdown produced by `generate_mindmap` into the structured tree
the frontend consumes, matching the schema in src/question.json:

    {
      "content": "...",
      "attachment": {
        "type": "mindmap",
        "tree": [
          { "id": "root", "content": "# Topic", "children": [
              { "id": "section-1", "content": "## Subtopic", "children": [
                  { "id": "section-1-q-1", "content": "Point A" }
              ]}
          ]}
        ]
      }
    }

Mapping:
  H1 (`# `)         → the single root node             (id "root")
  H2 (`## `)        → a section node under the root     (id "section-N")
  `- ` bullet       → a point node under the section    (id "section-N-q-M")
  indented `- `     → a one-sentence description under   (id "section-N-q-M-d-K")
                      the point above it

Description nodes carry no `children` key — exactly like the leaves in
question.json.
"""

import re
from typing import Any, Dict, List, Optional

# One level of bullet nesting is two spaces of indentation (a tab counts as one
# level). This matches the serializer in src/components/MarkdownTree/markdown.ts.
_INDENT_UNIT = 2

_H1_RE     = re.compile(r"^#\s+(.*)$")
_HEADING_RE = re.compile(r"^(#{2,})\s+(.*)$")
_BULLET_RE = re.compile(r"^(\s*)[-*]\s+(.*)$")


def markdown_to_tree(markdown: str) -> List[Dict[str, Any]]:
    """Parse a mind-map Markdown string into a question.json-shaped tree."""
    root: Optional[Dict[str, Any]] = None
    section: Optional[Dict[str, Any]] = None
    point: Optional[Dict[str, Any]] = None
    last_node: Optional[Dict[str, Any]] = None
    section_count = 0
    leaf_count = 0
    desc_count = 0

    def ensure_root() -> Dict[str, Any]:
        nonlocal root, last_node
        if root is None:
            root = {"id": "root", "content": "# Mind Map"}
            last_node = root
        return root

    for raw in markdown.split("\n"):
        # Normalize tabs so indentation math is uniform, then keep the raw
        # (un-stripped) line for bullet-depth detection.
        raw = raw.replace("\t", " " * _INDENT_UNIT)
        line = raw.strip()
        if not line:
            continue

        # H1 → root. The first H1 wins; any later H1 is demoted to a section so
        # we never produce two roots.
        h1 = _H1_RE.match(line)
        if h1 and not line.startswith("##"):
            if root is None:
                root = {"id": "root", "content": line}
                last_node = root
                section = None
                section_count = 0
                continue
            line = f"## {h1.group(1).strip()}"  # demote, handled below

        # H2 (or any deeper heading / demoted H1) → section
        heading = _HEADING_RE.match(line)
        if heading:
            ensure_root()
            section_count += 1
            leaf_count = 0
            point = None
            section = {"id": f"section-{section_count}", "content": f"## {heading.group(2).strip()}"}
            root.setdefault("children", []).append(section)
            last_node = section
            continue

        # Bullets. A top-level bullet is a point under the current section; an
        # indented bullet is the one-sentence description of the point above it.
        bullet = _BULLET_RE.match(raw)
        if bullet:
            ensure_root()
            indent = len(bullet.group(1))
            depth = indent // _INDENT_UNIT
            text = bullet.group(2).strip()

            if depth >= 1 and point is not None:
                # Indented bullet → description child of the current point.
                desc_count += 1
                desc = {"id": f"{point['id']}-d-{desc_count}", "content": text}
                point.setdefault("children", []).append(desc)
                last_node = desc
                continue

            # Top-level bullet → point under the section (or the root if none yet).
            leaf_count += 1
            desc_count = 0
            parent = section if section is not None else root
            prefix = parent["id"]
            point = {"id": f"{prefix}-q-{leaf_count}", "content": text}
            parent.setdefault("children", []).append(point)
            last_node = point
            continue

        # Anything else is a continuation line → append to the most recent node.
        if last_node is not None:
            last_node["content"] = f"{last_node['content']}\n{line}".strip()

    return [root] if root is not None else []


def build_mindmap_data(markdown: str) -> Dict[str, Any]:
    """Wrap the parsed tree in the question.json attachment envelope."""
    tree = markdown_to_tree(markdown)

    topic = "Mind Map"
    if tree:
        first_line = tree[0]["content"].split("\n", 1)[0]
        topic = first_line.lstrip("#").strip() or topic

    return {
        "content": f'Here is a mind map for "{topic}".',
        "attachment": {"type": "mindmap", "tree": tree},
    }

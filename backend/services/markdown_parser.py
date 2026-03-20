"""Markdown parser and serializer for project/prompt file format.

File format:
  - YAML frontmatter with project metadata (id, name, created, updated)
  - Prompts separated by ## [<uuid>] Title headings
  - Each prompt can have <!-- tags: ... --> and <!-- order: ... --> HTML comments
"""

from __future__ import annotations

import re
from typing import Any

import yaml

# Patterns
FRONTMATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n?", re.DOTALL)
HEADING_RE = re.compile(r"^## \[([^\]]+)\]\s+(.+)$", re.MULTILINE)
TAGS_RE = re.compile(r"<!--\s*tags:\s*(.+?)\s*-->")
ORDER_RE = re.compile(r"<!--\s*order:\s*(\d+)\s*-->")


def parse_markdown_file(content: str, filename: str) -> dict[str, Any]:
    """Parse a .md file string into a project dict."""
    # Extract frontmatter
    fm_match = FRONTMATTER_RE.match(content)
    if not fm_match:
        raise ValueError(f"No valid frontmatter found in {filename}")

    meta = yaml.safe_load(fm_match.group(1))
    body = content[fm_match.end():]

    # Split body into prompt sections by ## [uuid] heading
    prompts: list[dict[str, Any]] = []
    splits = list(HEADING_RE.finditer(body))

    for i, match in enumerate(splits):
        prompt_id = match.group(1)
        title = match.group(2).strip()

        # Get section content (from after heading to next heading or end)
        start = match.end()
        end = splits[i + 1].start() if i + 1 < len(splits) else len(body)
        section = body[start:end]

        # Extract tags
        tags_match = TAGS_RE.search(section)
        tags = [t.strip() for t in tags_match.group(1).split(",")] if tags_match else []

        # Extract order
        order_match = ORDER_RE.search(section)
        order = int(order_match.group(1)) if order_match else 0

        # Strip metadata comments from content
        cleaned = TAGS_RE.sub("", section)
        cleaned = ORDER_RE.sub("", cleaned).strip()

        prompts.append({
            "id": prompt_id,
            "title": title,
            "content": cleaned,
            "tags": tags,
            "order": order,
        })

    prompts.sort(key=lambda p: p["order"])

    return {
        "id": str(meta.get("id", "")),
        "name": meta.get("name", ""),
        "created": meta.get("created"),
        "updated": meta.get("updated"),
        "prompts": prompts,
    }


def serialize_to_markdown(project: dict[str, Any]) -> str:
    """Convert a project dict back to .md format."""
    lines: list[str] = []

    # Frontmatter
    fm = {
        "id": project["id"],
        "name": project["name"],
        "created": project.get("created"),
        "updated": project.get("updated"),
    }
    lines.append("---")
    lines.append(yaml.dump(fm, default_flow_style=False, allow_unicode=True).rstrip())
    lines.append("---")
    lines.append("")

    # Prompts sorted by order
    sorted_prompts = sorted(project.get("prompts", []), key=lambda p: p.get("order", 0))

    for prompt in sorted_prompts:
        lines.append(f"## [{prompt['id']}] {prompt['title']}")
        if prompt.get("tags"):
            lines.append(f"<!-- tags: {', '.join(prompt['tags'])} -->")
        if prompt.get("order") is not None:
            lines.append(f"<!-- order: {prompt['order']} -->")
        lines.append("")
        lines.append(prompt.get("content", "").strip())
        lines.append("")

    return "\n".join(lines) + "\n"

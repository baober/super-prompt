"""Search service — full-text search across all projects and prompts."""

from __future__ import annotations

import os
from typing import Any

from backend.services.markdown_parser import parse_markdown_file


def search_prompts(prompt_dir: str, query: str) -> list[dict[str, Any]]:
    """Search all prompts across all projects for a query string.

    Returns a list of match dicts with project_id, project_name,
    prompt_id, prompt_title, and snippet.
    """
    if not os.path.isdir(prompt_dir):
        return []

    query_lower = query.lower()
    results: list[dict[str, Any]] = []

    for fname in os.listdir(prompt_dir):
        if not fname.endswith(".md"):
            continue
        filepath = os.path.join(prompt_dir, fname)
        with open(filepath, encoding="utf-8") as f:
            content = f.read()

        project = parse_markdown_file(content, fname)
        # 使用项目名称作为 ID（文件名即项目名）
        project_id = project["name"]

        for prompt in project.get("prompts", []):
            prompt_content = prompt.get("content", "")
            tags = prompt.get("tags", [])

            # Check content match
            content_lower = prompt_content.lower()
            idx = content_lower.find(query_lower)
            if idx != -1:
                snippet = _extract_snippet(prompt_content, idx, len(query))
                results.append({
                    "project_id": project_id,
                    "project_name": project["name"],
                    "prompt_id": prompt["id"],
                    "prompt_title": prompt["title"],
                    "snippet": snippet,
                })
                continue

            # Check tag match
            for tag in tags:
                if query_lower in tag.lower():
                    results.append({
                        "project_id": project_id,
                        "project_name": project["name"],
                        "prompt_id": prompt["id"],
                        "prompt_title": prompt["title"],
                        "snippet": tag,
                    })
                    break

    return results


def _extract_snippet(text: str, match_idx: int, match_len: int, context: int = 50) -> str:
    """Extract a snippet with ~50 chars of context around the match."""
    start = max(0, match_idx - context)
    end = min(len(text), match_idx + match_len + context)
    snippet = text[start:end]
    if start > 0:
        snippet = "..." + snippet
    if end < len(text):
        snippet = snippet + "..."
    return snippet

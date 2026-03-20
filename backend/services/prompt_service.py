"""Prompt service — CRUD, undo, and reorder for prompts within a project."""

from __future__ import annotations

import os
import uuid
from typing import Any

from backend.services.markdown_parser import parse_markdown_file, serialize_to_markdown
from backend.services.project_service import _safe_filename

# Module-level undo store: prompt_id -> {title, content, tags}
_undo_store: dict[str, dict] = {}


def _project_path(prompt_dir: str, project_id: str) -> str:
    return os.path.join(prompt_dir, f"{_safe_filename(project_id)}.md")


def _read_project(prompt_dir: str, project_id: str) -> dict[str, Any]:
    filepath = _project_path(prompt_dir, project_id)
    with open(filepath, encoding="utf-8") as f:
        content = f.read()
    project = parse_markdown_file(content, f"{_safe_filename(project_id)}.md")
    project["id"] = project["name"]
    # 为每个 prompt 附加 has_previous_version 字段
    for p in project.get("prompts", []):
        p["has_previous_version"] = p["id"] in _undo_store
    return project


def _write_project(prompt_dir: str, project_id: str, project: dict[str, Any]) -> None:
    filepath = _project_path(prompt_dir, project_id)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(serialize_to_markdown(project))


def _find_prompt(prompts: list[dict], prompt_id: str) -> dict:
    for p in prompts:
        if p["id"] == prompt_id:
            return p
    raise ValueError(f"Prompt {prompt_id} not found")


def add_prompt(
    prompt_dir: str,
    project_id: str,
    title: str = "",
    content: str = "",
    tags: list[str] | None = None,
) -> dict[str, Any]:
    """Add a new prompt to a project file."""
    project = _read_project(prompt_dir, project_id)
    prompts = project["prompts"]

    max_order = max((p.get("order", 0) for p in prompts), default=-1)

    prompt: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "title": title,
        "content": content,
        "tags": tags if tags is not None else [],
        "order": max_order + 1,
    }
    prompts.append(prompt)
    _write_project(prompt_dir, project_id, project)
    prompt["has_previous_version"] = prompt["id"] in _undo_store
    return prompt


def update_prompt(
    prompt_dir: str,
    project_id: str,
    prompt_id: str,
    title: str | None = None,
    content: str | None = None,
    tags: list[str] | None = None,
) -> dict[str, Any]:
    """Update a prompt. Saves previous version to undo store before applying."""
    project = _read_project(prompt_dir, project_id)
    prompt = _find_prompt(project["prompts"], prompt_id)

    # Save current state to undo store BEFORE applying changes
    _undo_store[prompt_id] = {
        "title": prompt["title"],
        "content": prompt["content"],
        "tags": list(prompt["tags"]),
    }

    if title is not None:
        prompt["title"] = title
    if content is not None:
        prompt["content"] = content
    if tags is not None:
        prompt["tags"] = tags

    _write_project(prompt_dir, project_id, project)
    # 标记该 prompt 有可撤销的历史版本
    prompt["has_previous_version"] = prompt["id"] in _undo_store
    return prompt


def delete_prompt(prompt_dir: str, project_id: str, prompt_id: str) -> None:
    """Remove a prompt from a project file."""
    project = _read_project(prompt_dir, project_id)
    project["prompts"] = [p for p in project["prompts"] if p["id"] != prompt_id]
    _write_project(prompt_dir, project_id, project)


def reorder_prompts(prompt_dir: str, project_id: str, order: list[str]) -> None:
    """Reorder prompts by a list of prompt IDs."""
    project = _read_project(prompt_dir, project_id)
    prompts = project["prompts"]

    order_map = {pid: idx for idx, pid in enumerate(order)}
    for prompt in prompts:
        if prompt["id"] in order_map:
            prompt["order"] = order_map[prompt["id"]]

    _write_project(prompt_dir, project_id, project)


def undo_prompt(prompt_dir: str, project_id: str, prompt_id: str) -> dict[str, Any]:
    """Restore a prompt to its previous version from the undo store."""
    if prompt_id not in _undo_store:
        raise ValueError("No undo history available")

    previous = _undo_store.pop(prompt_id)
    project = _read_project(prompt_dir, project_id)
    prompt = _find_prompt(project["prompts"], prompt_id)

    prompt["title"] = previous["title"]
    prompt["content"] = previous["content"]
    prompt["tags"] = previous["tags"]

    _write_project(prompt_dir, project_id, project)
    # 撤销后该 prompt 不再有历史版本
    prompt["has_previous_version"] = prompt["id"] in _undo_store
    return prompt

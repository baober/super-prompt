"""Project service — CRUD operations backed by markdown files."""

from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from typing import Any

from backend.services.markdown_parser import parse_markdown_file, serialize_to_markdown


def _safe_filename(name: str) -> str:
    """将项目名称转换为安全的文件名（保留中文，去除危险字符）。"""
    # 去除路径分隔符和其他危险字符，保留中文、字母、数字、空格、短横线、下划线
    safe = re.sub(r'[\\/:*?"<>|]', '_', name)
    # 去除首尾空白和点号（防止隐藏文件或无扩展名问题）
    safe = safe.strip().strip('.')
    if not safe:
        raise ValueError("项目名称不能为空或仅包含特殊字符")
    return safe


def _project_path(prompt_dir: str, name: str) -> str:
    """通过项目名称获取文件路径。"""
    return os.path.join(prompt_dir, f"{_safe_filename(name)}.md")


def _now() -> datetime:
    return datetime.now(timezone.utc)


def list_projects(
    prompt_dir: str, sort: str = "name", order: str = "asc", subfolder: str | None = None
) -> list[dict[str, Any]]:
    """List all projects as summary dicts.
    
    Args:
        prompt_dir: 根存储目录
        sort: 排序字段
        order: 排序方向
        subfolder: 子文件夹相对路径（可选），为 None 时列出根目录
    """
    target_dir = prompt_dir
    if subfolder:
        target_dir = os.path.join(prompt_dir, subfolder)
    
    results: list[dict[str, Any]] = []
    if not os.path.isdir(target_dir):
        return results

    for fname in os.listdir(target_dir):
        if not fname.endswith(".md"):
            continue
        filepath = os.path.join(target_dir, fname)
        with open(filepath, encoding="utf-8") as f:
            content = f.read()
        project = parse_markdown_file(content, fname)
        # 如果在子文件夹中，id 需要包含子文件夹路径
        if subfolder:
            project["id"] = f"{subfolder}/{project['name']}"
        else:
            project["id"] = project["name"]
        mtime = os.path.getmtime(filepath)
        project["mtime"] = mtime
        project["prompt_count"] = len(project.get("prompts", []))
        results.append(project)

    reverse = order == "desc"
    if sort == "modified":
        results.sort(key=lambda p: p["mtime"], reverse=reverse)
    else:  # default: name
        results.sort(key=lambda p: p["name"].lower(), reverse=reverse)

    return results


def list_folders(prompt_dir: str, subfolder: str | None = None) -> list[dict[str, Any]]:
    """列出指定目录下的子文件夹。
    
    Args:
        prompt_dir: 根存储目录
        subfolder: 子文件夹相对路径（可选）
    
    Returns:
        子文件夹列表，每个包含 name, path, project_count
    """
    target_dir = prompt_dir
    if subfolder:
        target_dir = os.path.join(prompt_dir, subfolder)
    
    results: list[dict[str, Any]] = []
    if not os.path.isdir(target_dir):
        return results

    for fname in sorted(os.listdir(target_dir)):
        full_path = os.path.join(target_dir, fname)
        if not os.path.isdir(full_path):
            continue
        # 跳过隐藏目录
        if fname.startswith('.'):
            continue
        # 统计该子文件夹下的 .md 文件数
        md_count = sum(1 for f in os.listdir(full_path) if f.endswith('.md'))
        sub_dir_count = sum(1 for f in os.listdir(full_path) if os.path.isdir(os.path.join(full_path, f)) and not f.startswith('.'))
        rel_path = f"{subfolder}/{fname}" if subfolder else fname
        results.append({
            "name": fname,
            "path": rel_path,
            "project_count": md_count,
            "has_subfolders": sub_dir_count > 0,
        })

    return results


def create_project(prompt_dir: str, name: str) -> dict[str, Any]:
    """Create a new project markdown file and return the project dict."""
    os.makedirs(prompt_dir, exist_ok=True)
    name = name.strip()
    if not name:
        raise ValueError("项目名称不能为空")

    filepath = _project_path(prompt_dir, name)
    if os.path.exists(filepath):
        raise ValueError(f"项目 \"{name}\" 已存在")

    now = _now()
    project: dict[str, Any] = {
        "id": name,
        "name": name,
        "created": now,
        "updated": now,
        "prompts": [],
    }
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(serialize_to_markdown(project))
    return project


def get_project(prompt_dir: str, project_name: str) -> dict[str, Any]:
    """Read and parse a single project by name."""
    from backend.services.prompt_service import _undo_store

    filepath = _project_path(prompt_dir, project_name)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Project \"{project_name}\" not found")
    with open(filepath, encoding="utf-8") as f:
        content = f.read()
    project = parse_markdown_file(content, f"{_safe_filename(project_name)}.md")
    project["id"] = project["name"]
    # 为每个 prompt 附加 has_previous_version 字段
    for p in project.get("prompts", []):
        p["has_previous_version"] = p["id"] in _undo_store
    return project


def update_project(prompt_dir: str, old_name: str, new_name: str) -> dict[str, Any]:
    """Update a project's name (rename file) and bump the updated timestamp."""
    new_name = new_name.strip()
    if not new_name:
        raise ValueError("项目名称不能为空")

    project = get_project(prompt_dir, old_name)

    old_filepath = _project_path(prompt_dir, old_name)

    if new_name != old_name:
        new_filepath = _project_path(prompt_dir, new_name)
        if os.path.exists(new_filepath):
            raise ValueError(f"项目 \"{new_name}\" 已存在")

    project["name"] = new_name
    project["id"] = new_name
    project["updated"] = _now()

    if new_name != old_name:
        # 先写入新文件，再删除旧文件
        new_filepath = _project_path(prompt_dir, new_name)
        with open(new_filepath, "w", encoding="utf-8") as f:
            f.write(serialize_to_markdown(project))
        os.remove(old_filepath)
    else:
        with open(old_filepath, "w", encoding="utf-8") as f:
            f.write(serialize_to_markdown(project))

    return project


def delete_project(prompt_dir: str, project_name: str) -> None:
    """Delete a project's markdown file."""
    filepath = _project_path(prompt_dir, project_name)
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Project \"{project_name}\" not found")
    os.remove(filepath)

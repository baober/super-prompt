"""Project API router — CRUD endpoints for projects."""

from __future__ import annotations

from fastapi import APIRouter, Query, Response
from fastapi.responses import JSONResponse
from urllib.parse import unquote
from typing import Optional

import os

from backend.config import get_config
from backend.models import ProjectCreate, ProjectUpdate
from backend.services import project_service

router = APIRouter(prefix="/api/projects", tags=["projects"])


def _prompt_dir() -> str:
    return os.path.expanduser(get_config().storage.prompt_dir)


def _error(code: str, message: str, status: int) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message}},
    )


def _summary(p: dict) -> dict:
    return {
        "id": p.get("id", p["name"]),
        "name": p["name"],
        "prompt_count": p.get("prompt_count", len(p.get("prompts", []))),
        "created": p["created"].isoformat() if hasattr(p["created"], "isoformat") else p["created"],
        "updated": p["updated"].isoformat() if hasattr(p["updated"], "isoformat") else p["updated"],
    }


@router.get("")
async def list_projects(
    sort: str = Query("name", pattern="^(name|modified|created)$"),
    order: str = Query("asc", pattern="^(asc|desc)$"),
    subfolder: Optional[str] = Query(None, description="子文件夹相对路径"),
):
    projects = project_service.list_projects(_prompt_dir(), sort=sort, order=order, subfolder=subfolder)
    folders = project_service.list_folders(_prompt_dir(), subfolder=subfolder)
    return {
        "projects": [_summary(p) for p in projects],
        "folders": folders,
        "current_folder": subfolder,
    }


@router.post("", status_code=201)
async def create_project(body: ProjectCreate):
    try:
        project = project_service.create_project(_prompt_dir(), body.name)
    except ValueError as e:
        return _error("conflict", str(e), 409)
    return _summary(project)


@router.get("/{project_id}")
async def get_project(project_id: str):
    project_name = unquote(project_id)
    try:
        project = project_service.get_project(_prompt_dir(), project_name)
    except FileNotFoundError:
        return _error("not_found", "Project not found", 404)
    return project


@router.put("/{project_id}")
async def update_project(project_id: str, body: ProjectUpdate):
    project_name = unquote(project_id)
    try:
        project = project_service.update_project(_prompt_dir(), project_name, body.name)
    except FileNotFoundError:
        return _error("not_found", "Project not found", 404)
    except ValueError as e:
        return _error("conflict", str(e), 409)
    return _summary(project)


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: str):
    project_name = unquote(project_id)
    try:
        project_service.delete_project(_prompt_dir(), project_name)
    except FileNotFoundError:
        return _error("not_found", "Project not found", 404)
    return Response(status_code=204)

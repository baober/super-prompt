"""Prompt API router — CRUD, reorder, and undo endpoints for prompts."""

from __future__ import annotations

from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse
from urllib.parse import unquote

from backend.config import get_config
from backend.models import PromptCreate, PromptUpdate, PromptReorder
from backend.services import prompt_service

router = APIRouter(prefix="/api/projects", tags=["prompts"])


def _prompt_dir() -> str:
    return get_config().storage.prompt_dir


def _error(code: str, message: str, status: int) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message}},
    )


@router.post("/{project_id}/prompts", status_code=201)
async def create_prompt(project_id: str, body: PromptCreate):
    project_name = unquote(project_id)
    try:
        prompt = prompt_service.add_prompt(
            _prompt_dir(), project_name, body.title, body.content, body.tags
        )
    except FileNotFoundError:
        return _error("not_found", "Project not found", 404)
    return prompt


@router.put("/{project_id}/prompts/reorder")
async def reorder_prompts(project_id: str, body: PromptReorder):
    project_name = unquote(project_id)
    try:
        prompt_service.reorder_prompts(_prompt_dir(), project_name, body.order)
    except FileNotFoundError:
        return _error("not_found", "Project not found", 404)
    return Response(status_code=200)


@router.put("/{project_id}/prompts/{prompt_id}")
async def update_prompt(project_id: str, prompt_id: str, body: PromptUpdate):
    project_name = unquote(project_id)
    try:
        prompt = prompt_service.update_prompt(
            _prompt_dir(), project_name, prompt_id,
            body.title, body.content, body.tags,
        )
    except FileNotFoundError:
        return _error("not_found", "Project not found", 404)
    except ValueError as e:
        if "not found" in str(e).lower():
            return _error("not_found", str(e), 404)
        raise
    return prompt


@router.delete("/{project_id}/prompts/{prompt_id}", status_code=204)
async def delete_prompt(project_id: str, prompt_id: str):
    project_name = unquote(project_id)
    try:
        prompt_service.delete_prompt(_prompt_dir(), project_name, prompt_id)
    except FileNotFoundError:
        return _error("not_found", "Project not found", 404)
    return Response(status_code=204)


@router.post("/{project_id}/prompts/{prompt_id}/undo")
async def undo_prompt(project_id: str, prompt_id: str):
    project_name = unquote(project_id)
    try:
        prompt = prompt_service.undo_prompt(_prompt_dir(), project_name, prompt_id)
    except FileNotFoundError:
        return _error("not_found", "Project not found", 404)
    except ValueError as e:
        if "No undo history available" in str(e):
            return _error("no_previous_version", str(e), 409)
        if "not found" in str(e).lower():
            return _error("not_found", str(e), 404)
        raise
    return prompt

"""Search API router — full-text search across prompts."""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.config import get_config
from backend.services import search_service

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
async def search(q: str = Query("", min_length=1)):
    prompt_dir = get_config().storage.prompt_dir
    results = search_service.search_prompts(prompt_dir, q)
    return {"results": results}

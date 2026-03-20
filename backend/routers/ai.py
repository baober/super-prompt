"""AI API router — prompt optimization endpoint."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from backend.config import get_config
from backend.models import AiOptimizeRequest
from backend.services import ai_service

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _error(code: str, message: str, status: int) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message}},
    )


@router.post("/optimize")
async def optimize(body: AiOptimizeRequest):
    config = get_config()
    try:
        result = await ai_service.optimize_prompt(body.content, config)
    except ValueError:
        return _error("no_llm_enabled", "No LLM provider is enabled", 400)
    except RuntimeError as e:
        return _error("llm_request_failed", str(e), 502)
    return {"optimized": result}

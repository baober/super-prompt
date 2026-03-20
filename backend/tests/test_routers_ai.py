"""Tests for the AI router."""

from unittest.mock import AsyncMock, patch


def test_optimize_success(client):
    mock = AsyncMock(return_value="optimized content")
    with patch("backend.routers.ai.ai_service.optimize_prompt", mock):
        resp = client.post("/api/ai/optimize", json={"content": "raw prompt"})
    assert resp.status_code == 200
    assert resp.json() == {"optimized": "optimized content"}


def test_optimize_no_llm(client):
    mock = AsyncMock(side_effect=ValueError("no_llm_enabled"))
    with patch("backend.routers.ai.ai_service.optimize_prompt", mock):
        resp = client.post("/api/ai/optimize", json={"content": "raw"})
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "no_llm_enabled"


def test_optimize_llm_failure(client):
    mock = AsyncMock(side_effect=RuntimeError("llm_request_failed: timeout"))
    with patch("backend.routers.ai.ai_service.optimize_prompt", mock):
        resp = client.post("/api/ai/optimize", json={"content": "raw"})
    assert resp.status_code == 502
    assert resp.json()["error"]["code"] == "llm_request_failed"

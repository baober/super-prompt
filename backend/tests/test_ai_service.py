import pytest
import httpx
from unittest.mock import AsyncMock, patch, MagicMock

from backend.config import AppConfig, LlmProvider
from backend.services.ai_service import optimize_prompt


def _make_config(providers: list[LlmProvider] | None = None, optimize: str = "You are a prompt optimizer.") -> AppConfig:
    if providers is None:
        providers = [
            LlmProvider(id="p1", name="Test", type="openai_compatible", base_url="http://localhost:11434", api_key="sk-test", model="gpt-4", enabled=True),
        ]
    return AppConfig(llm_providers=providers, optimize_prompt=optimize)


@pytest.mark.asyncio
async def test_optimize_success():
    config = _make_config()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.raise_for_status = MagicMock()
    mock_response.json.return_value = {
        "choices": [{"message": {"content": "Optimized prompt result"}}]
    }

    with patch("backend.services.ai_service.httpx.AsyncClient") as MockClient:
        client_instance = AsyncMock()
        MockClient.return_value.__aenter__ = AsyncMock(return_value=client_instance)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)
        client_instance.post.return_value = mock_response

        result = await optimize_prompt("my raw prompt", config)

    assert result == "Optimized prompt result"
    client_instance.post.assert_called_once()
    call_args = client_instance.post.call_args
    assert call_args[0][0] == "http://localhost:11434/chat/completions"
    body = call_args[1]["json"]
    assert body["model"] == "gpt-4"
    assert body["messages"][0]["role"] == "system"
    assert body["messages"][0]["content"] == "You are a prompt optimizer."
    assert body["messages"][1]["role"] == "user"
    assert body["messages"][1]["content"] == "my raw prompt"
    headers = call_args[1]["headers"]
    assert headers["Authorization"] == "Bearer sk-test"
    assert headers["Content-Type"] == "application/json"


@pytest.mark.asyncio
async def test_optimize_no_provider_enabled():
    config = _make_config(providers=[
        LlmProvider(id="p1", name="Test", enabled=False),
    ])
    with pytest.raises(ValueError, match="no_llm_enabled"):
        await optimize_prompt("test", config)


@pytest.mark.asyncio
async def test_optimize_api_failure():
    config = _make_config()
    mock_response = MagicMock()
    mock_response.status_code = 500
    mock_response.text = "Internal Server Error"
    mock_response.raise_for_status.side_effect = httpx.HTTPStatusError(
        "Server Error", request=MagicMock(), response=mock_response
    )

    with patch("backend.services.ai_service.httpx.AsyncClient") as MockClient:
        client_instance = AsyncMock()
        MockClient.return_value.__aenter__ = AsyncMock(return_value=client_instance)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)
        client_instance.post.return_value = mock_response

        with pytest.raises(RuntimeError, match="llm_request_failed"):
            await optimize_prompt("test", config)


@pytest.mark.asyncio
async def test_optimize_timeout():
    config = _make_config()

    with patch("backend.services.ai_service.httpx.AsyncClient") as MockClient:
        client_instance = AsyncMock()
        MockClient.return_value.__aenter__ = AsyncMock(return_value=client_instance)
        MockClient.return_value.__aexit__ = AsyncMock(return_value=False)
        client_instance.post.side_effect = httpx.TimeoutException("Request timed out")

        with pytest.raises(RuntimeError, match="llm_request_failed"):
            await optimize_prompt("test", config)

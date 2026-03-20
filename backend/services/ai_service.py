import httpx

from backend.config import AppConfig


async def optimize_prompt(content: str, config: AppConfig) -> str:
    provider = next((p for p in config.llm_providers if p.enabled), None)
    if provider is None:
        raise ValueError("no_llm_enabled")

    # 智能处理 base_url：如果末尾已包含 /chat/completions 则不再拼接
    base = provider.base_url.rstrip("/")
    if base.endswith("/chat/completions"):
        url = base
    else:
        url = f"{base}/chat/completions"
    headers = {
        "Authorization": f"Bearer {provider.api_key}",
        "Content-Type": "application/json",
    }
    # 合入自定义请求头
    if provider.extra_headers:
        headers.update(provider.extra_headers)
    body = {
        "model": provider.model,
        "messages": [
            {"role": "system", "content": config.optimize_prompt},
            {"role": "user", "content": content},
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
    except (httpx.HTTPStatusError, httpx.TimeoutException) as exc:
        raise RuntimeError(f"llm_request_failed: {exc}") from exc

"""Settings API router — app config and LLM provider management."""

from __future__ import annotations

import os
import platform
import subprocess
import uuid

from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from backend.config import get_config, save_config, LlmProvider
from backend.models import (
    SettingsUpdate,
    LlmProviderCreate,
    LlmProviderUpdate,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _error(code: str, message: str, status: int) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"error": {"code": code, "message": message}},
    )


def _settings_dict(config) -> dict:
    return {
        "storage_dir": os.path.expanduser(config.storage.prompt_dir),
        "optimize_prompt": config.optimize_prompt,
        "theme": config.appearance.theme,
        "language": config.appearance.language,
        "frontend_port": config.server.frontend_port,
        "backend_port": config.server.backend_port,
    }


def _provider_dict(p: LlmProvider, *, include_api_key: bool = False) -> dict:
    d = {
        "id": p.id,
        "name": p.name,
        "type": p.type,
        "base_url": p.base_url,
        "model": p.model,
        "enabled": p.enabled,
        "api_key": p.api_key if include_api_key else _mask_api_key(p.api_key),
        "extra_headers": p.extra_headers or {},
    }
    return d


def _mask_api_key(key: str) -> str:
    """对 API Key 进行脱敏处理，只显示前4位和后4位。"""
    if not key:
        return ""
    if len(key) <= 8:
        return "*" * len(key)
    return key[:4] + "*" * (len(key) - 8) + key[-4:]


# --- Settings ---

@router.get("")
async def get_settings():
    return _settings_dict(get_config())


@router.put("")
async def update_settings(body: SettingsUpdate):
    config = get_config()
    if body.storage_dir is not None:
        config.storage.prompt_dir = os.path.expanduser(body.storage_dir)
    if body.optimize_prompt is not None:
        config.optimize_prompt = body.optimize_prompt
    if body.theme is not None:
        config.appearance.theme = body.theme
    if body.language is not None:
        config.appearance.language = body.language
    save_config(config)
    return _settings_dict(config)


# --- Browse Directory ---

class BrowseDirectoryRequest(BaseModel):
    initial_dir: str | None = None


def _open_directory_dialog_tkinter(initial_dir: str) -> str | None:
    """使用 tkinter 的文件夹选择对话框作为回退方案。"""
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()  # Hide root window
        root.attributes("-topmost", True)  # Bring dialog to front
        path = filedialog.askdirectory(
            title="选择存储目录",
            initialdir=initial_dir,
        )
        root.destroy()
        return path if path else None
    except Exception:
        return None


def _open_directory_dialog(initial_dir: str | None = None) -> str | None:
    """调用系统原生目录选择对话框，返回选中的绝对路径或 None。"""
    start_dir = initial_dir or os.path.expanduser("~")
    start_dir = os.path.expanduser(start_dir)
    # Ensure start_dir exists, fallback to home
    if not os.path.isdir(start_dir):
        start_dir = os.path.expanduser("~")
    system = platform.system()

    try:
        if system == "Darwin":
            # macOS: 使用 osascript 调用原生 Finder 目录选择
            script = (
                f'set defaultDir to POSIX file "{start_dir}" as alias\n'
                'try\n'
                '  set selectedFolder to choose folder with prompt "选择存储目录" default location defaultDir\n'
                '  return POSIX path of selectedFolder\n'
                'on error\n'
                '  return ""\n'
                'end try'
            )
            result = subprocess.run(
                ["osascript", "-e", script],
                capture_output=True, text=True, timeout=120,
            )
            path = result.stdout.strip().rstrip("/")
            if path:
                return path
            # osascript failed or user cancelled — try tkinter fallback
            return _open_directory_dialog_tkinter(start_dir)

        elif system == "Windows":
            # Windows: 使用 PowerShell 调用 FolderBrowserDialog
            ps_script = (
                "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null;"
                "$dialog = New-Object System.Windows.Forms.FolderBrowserDialog;"
                f"$dialog.SelectedPath = '{start_dir}';"
                "$dialog.Description = '选择存储目录';"
                "if ($dialog.ShowDialog() -eq 'OK') { $dialog.SelectedPath } else { '' }"
            )
            result = subprocess.run(
                ["powershell", "-Command", ps_script],
                capture_output=True, text=True, timeout=120,
            )
            path = result.stdout.strip()
            return path if path else None

        else:
            # Linux: 使用 zenity
            result = subprocess.run(
                ["zenity", "--file-selection", "--directory",
                 "--title=选择存储目录", f"--filename={start_dir}/"],
                capture_output=True, text=True, timeout=120,
            )
            path = result.stdout.strip()
            if path:
                return path
            return _open_directory_dialog_tkinter(start_dir)

    except (subprocess.TimeoutExpired, FileNotFoundError, Exception):
        # All native methods failed, try tkinter as last resort
        return _open_directory_dialog_tkinter(start_dir)


@router.post("/browse-directory")
async def browse_directory(body: BrowseDirectoryRequest | None = None):
    """打开系统原生目录选择对话框，返回用户选择的目录路径。"""
    import asyncio
    initial_dir = body.initial_dir if body else None
    loop = asyncio.get_event_loop()
    selected = await loop.run_in_executor(None, _open_directory_dialog, initial_dir)
    if selected:
        return {"path": selected}
    return {"path": None}


# --- LLM Providers ---

@router.get("/llm-providers")
async def list_providers():
    config = get_config()
    return {"providers": [_provider_dict(p) for p in config.llm_providers]}


@router.post("/llm-providers", status_code=201)
async def create_provider(body: LlmProviderCreate):
    config = get_config()
    provider = LlmProvider(
        id=uuid.uuid4().hex[:8],
        name=body.name,
        type=body.type,
        base_url=body.base_url,
        api_key=body.api_key,
        model=body.model,
        enabled=False,
        extra_headers=body.extra_headers or {},
    )
    config.llm_providers.append(provider)
    save_config(config)
    return _provider_dict(provider)


@router.put("/llm-providers/{provider_id}")
async def update_provider(provider_id: str, body: LlmProviderUpdate):
    config = get_config()
    provider = next((p for p in config.llm_providers if p.id == provider_id), None)
    if provider is None:
        return _error("not_found", "Provider not found", 404)

    if body.name is not None:
        provider.name = body.name
    if body.type is not None:
        provider.type = body.type
    if body.base_url is not None:
        provider.base_url = body.base_url
    if body.api_key is not None and "*" not in body.api_key:
        provider.api_key = body.api_key
    if body.model is not None:
        provider.model = body.model
    if body.enabled is not None:
        if body.enabled:
            for p in config.llm_providers:
                p.enabled = False
        provider.enabled = body.enabled
    if body.extra_headers is not None:
        provider.extra_headers = body.extra_headers

    save_config(config)
    return _provider_dict(provider)


@router.delete("/llm-providers/{provider_id}", status_code=204)
async def delete_provider(provider_id: str):
    config = get_config()
    provider = next((p for p in config.llm_providers if p.id == provider_id), None)
    if provider is None:
        return _error("not_found", "Provider not found", 404)
    config.llm_providers = [p for p in config.llm_providers if p.id != provider_id]
    save_config(config)
    return Response(status_code=204)


@router.post("/llm-providers/{provider_id}/test")
async def test_provider(provider_id: str):
    """测试 LLM 供应商连接是否正常，发送一个简单的请求验证 API 可用性。"""
    import httpx

    config = get_config()
    provider = next((p for p in config.llm_providers if p.id == provider_id), None)
    if provider is None:
        return _error("not_found", "Provider not found", 404)

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
        "messages": [{"role": "user", "content": "Hi"}],
        "max_tokens": 5,
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, headers=headers, json=body)
            response.raise_for_status()
            data = response.json()
            model_name = data.get("model", provider.model)
            return {"success": True, "message": f"连接成功，模型: {model_name}"}
    except httpx.TimeoutException:
        return JSONResponse(
            status_code=200,
            content={"success": False, "message": "连接超时，请检查 API 地址是否正确"},
        )
    except httpx.HTTPStatusError as exc:
        status = exc.response.status_code
        if status == 401:
            msg = "认证失败，请检查 API Key 是否正确"
        elif status == 404:
            msg = "API 地址无效，请检查 Base URL 和模型名称"
        else:
            msg = f"请求失败 (HTTP {status})"
        return JSONResponse(
            status_code=200,
            content={"success": False, "message": msg},
        )
    except httpx.ConnectError:
        return JSONResponse(
            status_code=200,
            content={"success": False, "message": "无法连接到服务器，请检查 API 地址"},
        )
    except Exception as exc:
        return JSONResponse(
            status_code=200,
            content={"success": False, "message": f"测试失败: {exc}"},
        )

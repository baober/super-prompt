import yaml
from pathlib import Path
from pydantic import BaseModel
from typing import Optional


class ServerConfig(BaseModel):
    host: str = "127.0.0.1"
    frontend_port: int = 5173
    backend_port: int = 8000


class StorageConfig(BaseModel):
    prompt_dir: str = "./prompts"


class AppearanceConfig(BaseModel):
    theme: str = "dark"
    language: str = "zh"


class LlmProvider(BaseModel):
    id: str = ""
    name: str = ""
    type: str = "openai_compatible"
    base_url: str = ""
    api_key: str = ""
    model: str = ""
    enabled: bool = False
    extra_headers: dict[str, str] = {}


class AppConfig(BaseModel):
    server: ServerConfig = ServerConfig()
    storage: StorageConfig = StorageConfig()
    llm_providers: list[LlmProvider] = []
    optimize_prompt: str = ""
    appearance: AppearanceConfig = AppearanceConfig()


_config_path: str = ""
_config: Optional[AppConfig] = None


def load_config(path: str = "config.yaml") -> AppConfig:
    global _config_path, _config
    _config_path = path
    p = Path(path)
    if p.exists():
        with open(p) as f:
            data = yaml.safe_load(f) or {}
        # Filter out None values so Pydantic defaults apply
        data = {k: v for k, v in data.items() if v is not None}
        _config = AppConfig(**data)
    else:
        _config = AppConfig()
    return _config


def get_config() -> AppConfig:
    global _config
    if _config is None:
        _config = load_config()
    return _config


def save_config(config: AppConfig) -> None:
    global _config
    _config = config
    with open(_config_path, "w") as f:
        yaml.dump(config.model_dump(), f, default_flow_style=False, allow_unicode=True)

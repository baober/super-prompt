from pydantic import BaseModel
from typing import Optional
from datetime import datetime


# --- Project ---
class ProjectSummary(BaseModel):
    id: str
    name: str
    prompt_count: int
    created: datetime
    updated: datetime


class ProjectDetail(ProjectSummary):
    prompts: list["PromptItem"]


class ProjectCreate(BaseModel):
    name: str


class ProjectUpdate(BaseModel):
    name: str


# --- Prompt ---
class PromptItem(BaseModel):
    id: str
    title: str
    content: str
    tags: list[str]
    order: int
    has_previous_version: bool = False


class PromptCreate(BaseModel):
    title: str = ""
    content: str = ""
    tags: list[str] = []


class PromptUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[list[str]] = None


class PromptReorder(BaseModel):
    order: list[str]


# --- AI ---
class AiOptimizeRequest(BaseModel):
    content: str


class AiOptimizeResponse(BaseModel):
    optimized: str


# --- Settings ---
class SettingsResponse(BaseModel):
    storage_dir: str
    optimize_prompt: str
    theme: str
    language: str
    frontend_port: int
    backend_port: int


class SettingsUpdate(BaseModel):
    storage_dir: Optional[str] = None
    optimize_prompt: Optional[str] = None
    theme: Optional[str] = None
    language: Optional[str] = None


class LlmProviderResponse(BaseModel):
    id: str
    name: str
    type: str
    base_url: str
    model: str
    enabled: bool


class LlmProviderCreate(BaseModel):
    name: str
    type: str
    base_url: str
    api_key: str
    model: str
    extra_headers: Optional[dict[str, str]] = None


class LlmProviderUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    base_url: Optional[str] = None
    api_key: Optional[str] = None
    model: Optional[str] = None
    enabled: Optional[bool] = None
    extra_headers: Optional[dict[str, str]] = None


# --- Search ---
class SearchResult(BaseModel):
    project_id: str
    project_name: str
    prompt_id: str
    prompt_title: str
    snippet: str


# --- Error ---
class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    error: ErrorDetail

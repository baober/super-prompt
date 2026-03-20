import pytest
from backend.config import load_config
from fastapi.testclient import TestClient


@pytest.fixture
def tmp_prompt_dir(tmp_path):
    """Provides a temp directory for markdown file storage."""
    prompt_dir = tmp_path / "prompts"
    prompt_dir.mkdir()
    return str(prompt_dir)


@pytest.fixture
def test_config(tmp_prompt_dir, tmp_path):
    """Provides a test config pointing to temp directories."""
    config_file = tmp_path / "config.yaml"
    config_file.write_text(f"""
server:
  frontend_port: 5173
  backend_port: 8000
storage:
  prompt_dir: "{tmp_prompt_dir}"
llm_providers: []
optimize_prompt: "Optimize this prompt."
appearance:
  theme: "dark"
  language: "zh"
""")
    return load_config(str(config_file))


@pytest.fixture
def client(test_config):
    """Provides a FastAPI TestClient with test config."""
    from backend.main import app
    return TestClient(app)

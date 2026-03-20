from backend.config import load_config, save_config, AppConfig


def test_load_config_from_file(tmp_path):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("""
server:
  frontend_port: 3000
  backend_port: 9000
storage:
  prompt_dir: "/tmp/prompts"
llm_providers: []
optimize_prompt: "test prompt"
appearance:
  theme: "light"
  language: "en"
""")
    config = load_config(str(config_file))
    assert config.server.frontend_port == 3000
    assert config.server.backend_port == 9000
    assert config.storage.prompt_dir == "/tmp/prompts"
    assert config.appearance.theme == "light"
    assert config.appearance.language == "en"


def test_load_config_defaults(tmp_path):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("server:\n  frontend_port: 5173\n  backend_port: 8000\n")
    config = load_config(str(config_file))
    assert config.storage.prompt_dir == "./prompts"
    assert config.appearance.theme == "dark"


def test_save_config(tmp_path):
    config_file = tmp_path / "config.yaml"
    config_file.write_text("server:\n  frontend_port: 5173\n  backend_port: 8000\n")
    config = load_config(str(config_file))
    config.appearance.theme = "light"
    save_config(config)
    reloaded = load_config(str(config_file))
    assert reloaded.appearance.theme == "light"

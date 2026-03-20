"""Tests for search_service."""

from backend.services.project_service import create_project
from backend.services.prompt_service import add_prompt
from backend.services.search_service import search_prompts


def test_search_finds_by_content(tmp_path):
    prompt_dir = str(tmp_path)
    proj = create_project(prompt_dir, "My Project")
    add_prompt(prompt_dir, proj["id"], "Greeting", "Hello world, this is a test prompt", tags=["intro"])

    results = search_prompts(prompt_dir, "test prompt")
    assert len(results) == 1
    assert results[0]["project_name"] == "My Project"
    assert results[0]["prompt_title"] == "Greeting"
    assert "test prompt" in results[0]["snippet"].lower()


def test_search_finds_by_tag(tmp_path):
    prompt_dir = str(tmp_path)
    proj = create_project(prompt_dir, "Tag Project")
    add_prompt(prompt_dir, proj["id"], "Tagged", "Some content here", tags=["python", "automation"])

    results = search_prompts(prompt_dir, "automation")
    assert len(results) == 1
    assert results[0]["prompt_title"] == "Tagged"
    assert "automation" in results[0]["snippet"].lower()


def test_search_cross_project(tmp_path):
    prompt_dir = str(tmp_path)
    proj1 = create_project(prompt_dir, "Project Alpha")
    proj2 = create_project(prompt_dir, "Project Beta")
    add_prompt(prompt_dir, proj1["id"], "P1 Prompt", "shared keyword here")
    add_prompt(prompt_dir, proj2["id"], "P2 Prompt", "another shared keyword usage")

    results = search_prompts(prompt_dir, "shared keyword")
    assert len(results) == 2
    project_names = {r["project_name"] for r in results}
    assert project_names == {"Project Alpha", "Project Beta"}


def test_search_snippet_context(tmp_path):
    prompt_dir = str(tmp_path)
    proj = create_project(prompt_dir, "Snippet Project")
    padding = "x" * 80
    content = f"{padding}FINDME{padding}"
    add_prompt(prompt_dir, proj["id"], "Long", content)

    results = search_prompts(prompt_dir, "FINDME")
    assert len(results) == 1
    snippet = results[0]["snippet"]
    assert "FINDME" in snippet
    # Snippet should be roughly 100 chars + match length, not the full content
    assert len(snippet) < len(content)


def test_search_no_results(tmp_path):
    prompt_dir = str(tmp_path)
    proj = create_project(prompt_dir, "Empty Search")
    add_prompt(prompt_dir, proj["id"], "Nothing", "nothing relevant here")

    results = search_prompts(prompt_dir, "zzzznotfound")
    assert results == []

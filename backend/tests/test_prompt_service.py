"""Tests for prompt_service CRUD, undo, and reorder."""

import pytest

from backend.services.project_service import create_project, get_project
from backend.services.prompt_service import (
    add_prompt,
    delete_prompt,
    reorder_prompts,
    undo_prompt,
    update_prompt,
)


def test_add_prompt(tmp_prompt_dir):
    project = create_project(tmp_prompt_dir, "Test Project")
    pid = project["id"]

    prompt = add_prompt(tmp_prompt_dir, pid, title="Hello", content="World", tags=["a", "b"])

    assert prompt["id"]  # uuid assigned
    assert prompt["title"] == "Hello"
    assert prompt["content"] == "World"
    assert prompt["tags"] == ["a", "b"]

    # Persisted to disk
    proj = get_project(tmp_prompt_dir, pid)
    assert len(proj["prompts"]) == 1
    assert proj["prompts"][0]["id"] == prompt["id"]


def test_update_prompt_content(tmp_prompt_dir):
    project = create_project(tmp_prompt_dir, "Test Project")
    pid = project["id"]
    prompt = add_prompt(tmp_prompt_dir, pid, title="Original", content="old content")

    updated = update_prompt(tmp_prompt_dir, pid, prompt["id"], content="new content")

    assert updated["content"] == "new content"
    assert updated["title"] == "Original"  # unchanged

    # Verify persisted
    proj = get_project(tmp_prompt_dir, pid)
    assert proj["prompts"][0]["content"] == "new content"


def test_update_prompt_tags(tmp_prompt_dir):
    project = create_project(tmp_prompt_dir, "Test Project")
    pid = project["id"]
    prompt = add_prompt(tmp_prompt_dir, pid, title="Tagged", content="body", tags=["old"])

    updated = update_prompt(tmp_prompt_dir, pid, prompt["id"], tags=["new", "tags"])

    assert updated["tags"] == ["new", "tags"]
    assert updated["title"] == "Tagged"  # unchanged
    assert updated["content"] == "body"  # unchanged


def test_delete_prompt(tmp_prompt_dir):
    project = create_project(tmp_prompt_dir, "Test Project")
    pid = project["id"]
    prompt = add_prompt(tmp_prompt_dir, pid, title="Delete Me", content="bye")

    delete_prompt(tmp_prompt_dir, pid, prompt["id"])

    proj = get_project(tmp_prompt_dir, pid)
    assert len(proj["prompts"]) == 0


def test_reorder_prompts(tmp_prompt_dir):
    project = create_project(tmp_prompt_dir, "Test Project")
    pid = project["id"]
    p1 = add_prompt(tmp_prompt_dir, pid, title="First")
    p2 = add_prompt(tmp_prompt_dir, pid, title="Second")
    p3 = add_prompt(tmp_prompt_dir, pid, title="Third")

    # Reverse order
    reorder_prompts(tmp_prompt_dir, pid, [p3["id"], p1["id"], p2["id"]])

    proj = get_project(tmp_prompt_dir, pid)
    ids = [p["id"] for p in proj["prompts"]]
    assert ids == [p3["id"], p1["id"], p2["id"]]


def test_undo_prompt(tmp_prompt_dir):
    project = create_project(tmp_prompt_dir, "Test Project")
    pid = project["id"]
    prompt = add_prompt(tmp_prompt_dir, pid, title="V1", content="original", tags=["t1"])

    update_prompt(tmp_prompt_dir, pid, prompt["id"], title="V2", content="changed", tags=["t2"])

    restored = undo_prompt(tmp_prompt_dir, pid, prompt["id"])

    assert restored["title"] == "V1"
    assert restored["content"] == "original"
    assert restored["tags"] == ["t1"]

    # Verify persisted
    proj = get_project(tmp_prompt_dir, pid)
    assert proj["prompts"][0]["title"] == "V1"


def test_undo_no_history(tmp_prompt_dir):
    project = create_project(tmp_prompt_dir, "Test Project")
    pid = project["id"]
    prompt = add_prompt(tmp_prompt_dir, pid, title="No Undo")

    with pytest.raises(ValueError, match="No undo history available"):
        undo_prompt(tmp_prompt_dir, pid, prompt["id"])

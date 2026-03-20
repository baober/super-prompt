"""Tests for project_service CRUD and file I/O."""

import os
import time

import pytest

from backend.services.project_service import (
    create_project,
    delete_project,
    get_project,
    list_projects,
    update_project,
)


def test_list_projects_empty_dir(tmp_prompt_dir):
    result = list_projects(tmp_prompt_dir)
    assert result == []


def test_create_project(tmp_prompt_dir):
    project = create_project(tmp_prompt_dir, "My Project")
    assert project["name"] == "My Project"
    assert project["id"]
    # File should exist
    md_file = os.path.join(tmp_prompt_dir, f"{project['id']}.md")
    assert os.path.exists(md_file)


def test_get_project(tmp_prompt_dir):
    created = create_project(tmp_prompt_dir, "Read Me")
    fetched = get_project(tmp_prompt_dir, created["id"])
    assert fetched["id"] == created["id"]
    assert fetched["name"] == "Read Me"
    assert isinstance(fetched["prompts"], list)


def test_update_project_name(tmp_prompt_dir):
    created = create_project(tmp_prompt_dir, "Old Name")
    updated = update_project(tmp_prompt_dir, created["id"], "New Name")
    assert updated["name"] == "New Name"
    # Re-read from disk to confirm persistence
    fetched = get_project(tmp_prompt_dir, created["id"])
    assert fetched["name"] == "New Name"
    # Updated timestamp should change
    assert updated["updated"] >= created["updated"]


def test_delete_project(tmp_prompt_dir):
    created = create_project(tmp_prompt_dir, "To Delete")
    md_file = os.path.join(tmp_prompt_dir, f"{created['id']}.md")
    assert os.path.exists(md_file)
    delete_project(tmp_prompt_dir, created["id"])
    assert not os.path.exists(md_file)


def test_list_projects_sorted_by_name(tmp_prompt_dir):
    create_project(tmp_prompt_dir, "Banana")
    create_project(tmp_prompt_dir, "Apple")
    create_project(tmp_prompt_dir, "Cherry")

    asc = list_projects(tmp_prompt_dir, sort="name", order="asc")
    assert [p["name"] for p in asc] == ["Apple", "Banana", "Cherry"]

    desc = list_projects(tmp_prompt_dir, sort="name", order="desc")
    assert [p["name"] for p in desc] == ["Cherry", "Banana", "Apple"]


def test_list_projects_sorted_by_modified(tmp_prompt_dir):
    p1 = create_project(tmp_prompt_dir, "First")
    # Touch second file slightly later
    time.sleep(0.05)
    p2 = create_project(tmp_prompt_dir, "Second")

    asc = list_projects(tmp_prompt_dir, sort="modified", order="asc")
    assert asc[0]["id"] == p1["id"]
    assert asc[1]["id"] == p2["id"]

    desc = list_projects(tmp_prompt_dir, sort="modified", order="desc")
    assert desc[0]["id"] == p2["id"]
    assert desc[1]["id"] == p1["id"]

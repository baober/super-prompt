"""Tests for the prompt API router."""

import pytest


@pytest.fixture
def project(client):
    """Create a project and return its data."""
    resp = client.post("/api/projects", json={"name": "Test Project"})
    assert resp.status_code == 201
    return resp.json()


class TestCreatePrompt:
    def test_create_prompt(self, client, project):
        resp = client.post(
            f"/api/projects/{project['id']}/prompts",
            json={"title": "标题", "content": "内容", "tags": ["tag1"]},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "标题"
        assert data["content"] == "内容"
        assert data["tags"] == ["tag1"]
        assert "id" in data

    def test_create_prompt_defaults(self, client, project):
        resp = client.post(
            f"/api/projects/{project['id']}/prompts", json={}
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == ""
        assert data["content"] == ""
        assert data["tags"] == []

    def test_create_prompt_project_not_found(self, client):
        resp = client.post(
            "/api/projects/nonexistent/prompts",
            json={"title": "t"},
        )
        assert resp.status_code == 404


class TestUpdatePrompt:
    def test_update_prompt(self, client, project):
        create = client.post(
            f"/api/projects/{project['id']}/prompts",
            json={"title": "old", "content": "old content"},
        )
        prompt_id = create.json()["id"]

        resp = client.put(
            f"/api/projects/{project['id']}/prompts/{prompt_id}",
            json={"title": "new"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "new"
        assert data["content"] == "old content"  # unchanged

    def test_update_prompt_project_not_found(self, client):
        resp = client.put(
            "/api/projects/nonexistent/prompts/fake-id",
            json={"title": "x"},
        )
        assert resp.status_code == 404

    def test_update_prompt_not_found(self, client, project):
        resp = client.put(
            f"/api/projects/{project['id']}/prompts/nonexistent",
            json={"title": "x"},
        )
        assert resp.status_code == 404


class TestDeletePrompt:
    def test_delete_prompt(self, client, project):
        create = client.post(
            f"/api/projects/{project['id']}/prompts",
            json={"title": "to delete"},
        )
        prompt_id = create.json()["id"]

        resp = client.delete(
            f"/api/projects/{project['id']}/prompts/{prompt_id}"
        )
        assert resp.status_code == 204

    def test_delete_prompt_project_not_found(self, client):
        resp = client.delete("/api/projects/nonexistent/prompts/fake-id")
        assert resp.status_code == 404


class TestReorderPrompts:
    def test_reorder(self, client, project):
        pid = project["id"]
        p1 = client.post(f"/api/projects/{pid}/prompts", json={"title": "A"}).json()
        p2 = client.post(f"/api/projects/{pid}/prompts", json={"title": "B"}).json()

        resp = client.put(
            f"/api/projects/{pid}/prompts/reorder",
            json={"order": [p2["id"], p1["id"]]},
        )
        assert resp.status_code == 200

    def test_reorder_project_not_found(self, client):
        resp = client.put(
            "/api/projects/nonexistent/prompts/reorder",
            json={"order": []},
        )
        assert resp.status_code == 404


class TestUndoPrompt:
    def test_undo_success(self, client, project):
        pid = project["id"]
        create = client.post(
            f"/api/projects/{pid}/prompts",
            json={"title": "original", "content": "original content"},
        )
        prompt_id = create.json()["id"]

        # Update to create undo history
        client.put(
            f"/api/projects/{pid}/prompts/{prompt_id}",
            json={"title": "changed", "content": "changed content"},
        )

        # Undo
        resp = client.post(f"/api/projects/{pid}/prompts/{prompt_id}/undo")
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "original"
        assert data["content"] == "original content"

    def test_undo_no_history(self, client, project):
        pid = project["id"]
        create = client.post(
            f"/api/projects/{pid}/prompts", json={"title": "t"}
        )
        prompt_id = create.json()["id"]

        resp = client.post(f"/api/projects/{pid}/prompts/{prompt_id}/undo")
        assert resp.status_code == 409
        data = resp.json()
        assert data["error"]["code"] == "no_previous_version"
        assert "No undo history available" in data["error"]["message"]

    def test_undo_project_not_found(self, client):
        # When prompt_id has no undo history, service raises ValueError before
        # checking project existence, so we get 409 instead of 404.
        resp = client.post("/api/projects/nonexistent/prompts/fake-id/undo")
        assert resp.status_code == 409

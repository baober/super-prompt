"""Tests for the project API router."""


class TestListProjects:
    def test_empty(self, client):
        resp = client.get("/api/projects")
        assert resp.status_code == 200
        assert resp.json() == {"projects": []}

    def test_returns_created_projects(self, client):
        client.post("/api/projects", json={"name": "B Project"})
        client.post("/api/projects", json={"name": "A Project"})
        resp = client.get("/api/projects")
        assert resp.status_code == 200
        names = [p["name"] for p in resp.json()["projects"]]
        assert names == ["A Project", "B Project"]  # default sort by name asc

    def test_sort_desc(self, client):
        client.post("/api/projects", json={"name": "A"})
        client.post("/api/projects", json={"name": "B"})
        resp = client.get("/api/projects?sort=name&order=desc")
        names = [p["name"] for p in resp.json()["projects"]]
        assert names == ["B", "A"]


class TestCreateProject:
    def test_create(self, client):
        resp = client.post("/api/projects", json={"name": "My Project"})
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "My Project"
        assert data["prompt_count"] == 0
        assert "id" in data
        assert "created" in data
        assert "updated" in data

    def test_missing_name(self, client):
        resp = client.post("/api/projects", json={})
        assert resp.status_code == 422


class TestGetProject:
    def test_get(self, client):
        create_resp = client.post("/api/projects", json={"name": "Test"})
        project_id = create_resp.json()["id"]
        resp = client.get(f"/api/projects/{project_id}")
        assert resp.status_code == 200
        assert resp.json()["name"] == "Test"
        assert "prompts" in resp.json()

    def test_not_found(self, client):
        resp = client.get("/api/projects/nonexistent")
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "not_found"


class TestUpdateProject:
    def test_update(self, client):
        create_resp = client.post("/api/projects", json={"name": "Old"})
        project_id = create_resp.json()["id"]
        resp = client.put(f"/api/projects/{project_id}", json={"name": "New"})
        assert resp.status_code == 200
        assert resp.json()["name"] == "New"

    def test_not_found(self, client):
        resp = client.put("/api/projects/nonexistent", json={"name": "X"})
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "not_found"


class TestDeleteProject:
    def test_delete(self, client):
        create_resp = client.post("/api/projects", json={"name": "ToDelete"})
        project_id = create_resp.json()["id"]
        resp = client.delete(f"/api/projects/{project_id}")
        assert resp.status_code == 204
        # Verify gone
        resp = client.get(f"/api/projects/{project_id}")
        assert resp.status_code == 404

    def test_not_found(self, client):
        resp = client.delete("/api/projects/nonexistent")
        assert resp.status_code == 404

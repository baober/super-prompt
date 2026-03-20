"""Tests for the export API router."""


class TestExportProject:
    def test_export_returns_markdown(self, client):
        # Create a project first
        create_resp = client.post("/api/projects", json={"name": "Test Export"})
        assert create_resp.status_code == 201
        project_id = create_resp.json()["id"]

        # Export the project
        resp = client.get(f"/api/projects/{project_id}/export")
        assert resp.status_code == 200
        assert "text/markdown" in resp.headers["content-type"]
        assert "attachment" in resp.headers["content-disposition"]
        assert "Test%20Export.md" in resp.headers["content-disposition"]
        assert "Test Export" in resp.text

    def test_export_not_found(self, client):
        resp = client.get("/api/projects/nonexistent-id/export")
        assert resp.status_code == 404

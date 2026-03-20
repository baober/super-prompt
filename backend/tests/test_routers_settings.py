"""Tests for the Settings router."""


def test_get_settings(client):
    resp = client.get("/api/settings")
    assert resp.status_code == 200
    data = resp.json()
    assert "storage_dir" in data
    assert "optimize_prompt" in data
    assert "theme" in data
    assert "language" in data
    assert "frontend_port" in data
    assert "backend_port" in data


def test_update_settings(client):
    resp = client.put("/api/settings", json={"theme": "light", "language": "en"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["theme"] == "light"
    assert data["language"] == "en"


def test_update_settings_partial(client):
    resp = client.put("/api/settings", json={"theme": "light"})
    assert resp.status_code == 200
    assert resp.json()["theme"] == "light"
    # language should remain unchanged
    assert resp.json()["language"] == "zh"


def test_list_providers_empty(client):
    resp = client.get("/api/settings/llm-providers")
    assert resp.status_code == 200
    assert resp.json() == {"providers": []}


def test_create_provider(client):
    body = {
        "name": "OpenAI",
        "type": "openai_compatible",
        "base_url": "https://api.openai.com/v1",
        "api_key": "sk-secret",
        "model": "gpt-4",
    }
    resp = client.post("/api/settings/llm-providers", json=body)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "OpenAI"
    assert data["model"] == "gpt-4"
    assert "api_key" not in data
    assert data["enabled"] is False
    assert "id" in data


def test_update_provider(client):
    # Create a provider first
    body = {
        "name": "Test",
        "type": "openai_compatible",
        "base_url": "https://example.com",
        "api_key": "key",
        "model": "m1",
    }
    create_resp = client.post("/api/settings/llm-providers", json=body)
    pid = create_resp.json()["id"]

    # Update it
    resp = client.put(f"/api/settings/llm-providers/{pid}", json={"name": "Updated"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Updated"


def test_enable_provider_disables_others(client):
    # Create two providers
    for name in ("A", "B"):
        client.post("/api/settings/llm-providers", json={
            "name": name, "type": "openai_compatible",
            "base_url": "https://example.com", "api_key": "k", "model": "m",
        })

    providers = client.get("/api/settings/llm-providers").json()["providers"]
    id_a, id_b = providers[0]["id"], providers[1]["id"]

    # Enable A
    client.put(f"/api/settings/llm-providers/{id_a}", json={"enabled": True})
    # Enable B — should disable A
    client.put(f"/api/settings/llm-providers/{id_b}", json={"enabled": True})

    providers = client.get("/api/settings/llm-providers").json()["providers"]
    a = next(p for p in providers if p["id"] == id_a)
    b = next(p for p in providers if p["id"] == id_b)
    assert a["enabled"] is False
    assert b["enabled"] is True


def test_delete_provider(client):
    body = {
        "name": "Del",
        "type": "openai_compatible",
        "base_url": "https://example.com",
        "api_key": "k",
        "model": "m",
    }
    pid = client.post("/api/settings/llm-providers", json=body).json()["id"]
    resp = client.delete(f"/api/settings/llm-providers/{pid}")
    assert resp.status_code == 204

    providers = client.get("/api/settings/llm-providers").json()["providers"]
    assert all(p["id"] != pid for p in providers)


def test_update_nonexistent_provider(client):
    resp = client.put("/api/settings/llm-providers/nope", json={"name": "X"})
    assert resp.status_code == 404


def test_delete_nonexistent_provider(client):
    resp = client.delete("/api/settings/llm-providers/nope")
    assert resp.status_code == 404

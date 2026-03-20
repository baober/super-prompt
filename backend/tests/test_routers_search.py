"""Tests for the Search router."""

from unittest.mock import patch


def test_search_returns_results(client):
    mock_results = [
        {
            "project_id": "p1",
            "project_name": "Project 1",
            "prompt_id": "pr1",
            "prompt_title": "Title",
            "snippet": "...matching snippet...",
        }
    ]
    with patch("backend.routers.search.search_service.search_prompts", return_value=mock_results):
        resp = client.get("/api/search", params={"q": "keyword"})
    assert resp.status_code == 200
    assert resp.json() == {"results": mock_results}


def test_search_empty_results(client):
    with patch("backend.routers.search.search_service.search_prompts", return_value=[]):
        resp = client.get("/api/search", params={"q": "nothing"})
    assert resp.status_code == 200
    assert resp.json() == {"results": []}


def test_search_missing_query(client):
    resp = client.get("/api/search")
    assert resp.status_code == 422

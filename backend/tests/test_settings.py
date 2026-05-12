from __future__ import annotations

from fastapi.testclient import TestClient


def test_list_settings_returns_defaults(client: TestClient):
    response = client.get("/api/settings")
    assert response.status_code == 200
    settings = response.json()
    assert len(settings) == 20
    keys = {s["key"] for s in settings}
    assert "workspace_name" in keys
    assert "dark_mode" in keys


def test_list_settings_filter_by_category(client: TestClient):
    client.get("/api/settings")
    response = client.get("/api/settings?category=general")
    assert response.status_code == 200
    settings = response.json()
    assert all(s["category"] == "general" for s in settings)
    assert len(settings) == 4


def test_update_setting(client: TestClient):
    client.get("/api/settings")
    response = client.put("/api/settings/workspace_name", json={"value": "My Workspace"})
    assert response.status_code == 200
    data = response.json()
    assert data["key"] == "workspace_name"
    assert data["value"] == "My Workspace"


def test_update_setting_not_found(client: TestClient):
    response = client.put("/api/settings/nonexistent_key", json={"value": "test"})
    assert response.status_code == 404


def test_update_setting_persists(client: TestClient):
    client.get("/api/settings")
    client.put("/api/settings/dark_mode", json={"value": "true"})
    response = client.get("/api/settings?category=features")
    settings = response.json()
    dark_mode = next(s for s in settings if s["key"] == "dark_mode")
    assert dark_mode["value"] == "true"


def test_bulk_update_settings(client: TestClient):
    client.get("/api/settings")
    payload = {
        "settings": [
            {"key": "workspace_name", "value": "Bulk Updated", "category": "general"},
            {"key": "dark_mode", "value": "true", "category": "features"},
        ]
    }
    response = client.put("/api/settings", json=payload)
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 2
    assert results[0]["value"] == "Bulk Updated"
    assert results[1]["value"] == "true"

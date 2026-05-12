from __future__ import annotations

from fastapi.testclient import TestClient


def test_list_models_empty(client: TestClient):
    response = client.get("/api/models")
    assert response.status_code == 200
    assert response.json() == []


def test_create_model(client: TestClient):
    payload = {
        "name": "YOLOv8s Detection",
        "model_type": "Object Detection",
        "architecture": "YOLOv8s",
        "framework": "PyTorch",
        "dataset_name": "COCO",
    }
    response = client.post("/api/models", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "YOLOv8s Detection"
    assert data["architecture"] == "YOLOv8s"
    assert data["status"] == "Ready"
    assert data["id"] >= 1


def test_get_model_by_id(client: TestClient):
    create_resp = client.post("/api/models", json={"name": "Find Me"})
    model_id = create_resp.json()["id"]
    response = client.get(f"/api/models/{model_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Find Me"


def test_get_model_not_found(client: TestClient):
    response = client.get("/api/models/9999")
    assert response.status_code == 404


def test_update_model(client: TestClient):
    create_resp = client.post("/api/models", json={"name": "Update Me"})
    model_id = create_resp.json()["id"]
    response = client.patch(f"/api/models/{model_id}", json={"status": "Production", "map50": 0.92})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Production"
    assert data["map50"] == 0.92


def test_delete_model(client: TestClient):
    create_resp = client.post("/api/models", json={"name": "Delete Me"})
    model_id = create_resp.json()["id"]
    response = client.delete(f"/api/models/{model_id}")
    assert response.status_code == 204
    response = client.get(f"/api/models/{model_id}")
    assert response.status_code == 404

from __future__ import annotations

from fastapi.testclient import TestClient


def test_list_training_runs_empty(client: TestClient):
    response = client.get("/api/training")
    assert response.status_code == 200
    assert response.json() == []


def test_create_training_run(client: TestClient):
    payload = {
        "name": "Test Run",
        "model_name": "YOLOv8n",
        "epochs": 10,
        "batch_size": 8,
        "image_size": 640,
    }
    response = client.post("/api/training", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Run"
    assert data["model_name"] == "YOLOv8n"
    assert data["epochs"] == 10
    assert data["batch_size"] == 8
    assert data["status"] == "Running"
    assert data["id"] >= 1


def test_list_training_runs_after_create(client: TestClient):
    client.post("/api/training", json={"name": "Run A"})
    client.post("/api/training", json={"name": "Run B"})
    response = client.get("/api/training")
    assert response.status_code == 200
    runs = response.json()
    assert len(runs) == 2


def test_get_training_run_by_id(client: TestClient):
    create_resp = client.post("/api/training", json={"name": "Get Me"})
    run_id = create_resp.json()["id"]
    response = client.get(f"/api/training/{run_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Get Me"


def test_get_training_run_not_found(client: TestClient):
    response = client.get("/api/training/9999")
    assert response.status_code == 404


def test_update_training_run(client: TestClient):
    create_resp = client.post("/api/training", json={"name": "Patch Me"})
    run_id = create_resp.json()["id"]
    response = client.patch(f"/api/training/{run_id}", json={"status": "Completed", "current_epoch": 50})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "Completed"
    assert data["current_epoch"] == 50


def test_delete_training_run(client: TestClient):
    create_resp = client.post("/api/training", json={"name": "Delete Me"})
    run_id = create_resp.json()["id"]
    response = client.delete(f"/api/training/{run_id}")
    assert response.status_code == 204
    response = client.get(f"/api/training/{run_id}")
    assert response.status_code == 404


def test_filter_training_runs_by_status(client: TestClient):
    client.post("/api/training", json={"name": "Run 1"})
    create_resp = client.post("/api/training", json={"name": "Run 2"})
    run_id = create_resp.json()["id"]
    client.patch(f"/api/training/{run_id}", json={"status": "Completed"})
    response = client.get("/api/training?status=Running")
    assert response.status_code == 200
    runs = response.json()
    assert len(runs) == 1
    assert runs[0]["name"] == "Run 1"

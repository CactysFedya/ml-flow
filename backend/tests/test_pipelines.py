from __future__ import annotations

from fastapi.testclient import TestClient


def test_list_pipelines_empty(client: TestClient):
    response = client.get("/api/pipelines")
    assert response.status_code == 200
    assert response.json() == []


def test_create_pipeline(client: TestClient):
    payload = {
        "name": "Detection Pipeline",
        "description": "End-to-end detection",
        "template": "yolo_detection",
    }
    response = client.post("/api/pipelines", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Detection Pipeline"
    assert data["template"] == "yolo_detection"
    assert data["status"] == "Idle"


def test_get_pipeline_detail(client: TestClient):
    create_resp = client.post("/api/pipelines", json={"name": "Detail Pipeline"})
    pipeline_id = create_resp.json()["id"]
    response = client.get(f"/api/pipelines/{pipeline_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Detail Pipeline"
    assert "steps" in data
    assert "runs" in data


def test_pipeline_not_found(client: TestClient):
    response = client.get("/api/pipelines/9999")
    assert response.status_code == 404


def test_add_pipeline_step(client: TestClient):
    create_resp = client.post("/api/pipelines", json={"name": "Step Pipeline"})
    pipeline_id = create_resp.json()["id"]
    step_payload = {"name": "Preprocessing", "step_type": "transform"}
    response = client.post(f"/api/pipelines/{pipeline_id}/steps", json=step_payload)
    assert response.status_code == 201
    step = response.json()
    assert step["name"] == "Preprocessing"
    assert step["step_type"] == "transform"
    assert step["step_order"] == 1


def test_start_pipeline_run(client: TestClient):
    create_resp = client.post("/api/pipelines", json={"name": "Run Pipeline"})
    pipeline_id = create_resp.json()["id"]
    response = client.post(f"/api/pipelines/{pipeline_id}/run")
    assert response.status_code == 201
    run = response.json()
    assert run["run_number"] == 1
    assert run["status"] == "Running"


def test_delete_pipeline(client: TestClient):
    create_resp = client.post("/api/pipelines", json={"name": "Delete Me"})
    pipeline_id = create_resp.json()["id"]
    response = client.delete(f"/api/pipelines/{pipeline_id}")
    assert response.status_code == 204
    response = client.get(f"/api/pipelines/{pipeline_id}")
    assert response.status_code == 404

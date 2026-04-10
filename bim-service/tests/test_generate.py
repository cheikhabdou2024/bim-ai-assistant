import pytest
from moto import mock_s3
from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.routes.generate import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)

VALID_PAYLOAD = {
    "type": "building",
    "name": "Immeuble Test Génération",
    "floors": 3,
    "width": 20.0,
    "length": 30.0,
    "height": 3.5,
}

PAYLOAD_WITH_ROOMS = {
    **VALID_PAYLOAD,
    "rooms": [
        {"name": "Salon", "area": 25},
        {"name": "Chambre", "area": 18},
        {"name": "Cuisine", "area": 10},
    ],
}


@mock_s3
def test_TC_PY_005_generate_returns_s3_key_and_url(s3_mock):
    """TC-PY-005 : POST /generate valid payload → 201 + s3Key + downloadUrl"""
    response = client.post("/generate", json=VALID_PAYLOAD)
    assert response.status_code == 201
    data = response.json()
    assert "s3Key" in data
    assert data["s3Key"].startswith("models/")
    assert data["s3Key"].endswith(".ifc")
    assert "downloadUrl" in data
    assert "models/" in data["downloadUrl"]


@mock_s3
def test_TC_PY_006_ifc_file_exists_in_s3(s3_mock):
    """TC-PY-006 : generated IFC file is actually stored in S3 (moto bucket)"""
    response = client.post("/generate", json=VALID_PAYLOAD)
    assert response.status_code == 201
    s3_key = response.json()["s3Key"]

    # Verify object exists in mocked S3
    obj = s3_mock.get_object(Bucket="bim-ai-models-test", Key=s3_key)
    content = obj["Body"].read()
    assert len(content) > 0
    # IFC files start with ISO-10303
    assert b"ISO-10303" in content or b"FILE_DESCRIPTION" in content


@mock_s3
def test_TC_PY_007_ifc_project_name_matches(s3_mock):
    """TC-PY-007 : IfcProject.Name matches bimData.name"""
    payload = {**VALID_PAYLOAD, "name": "Projet BIM Dakar"}
    response = client.post("/generate", json=payload)
    assert response.status_code == 201
    s3_key = response.json()["s3Key"]

    obj = s3_mock.get_object(Bucket="bim-ai-models-test", Key=s3_key)
    ifc_content = obj["Body"].read().decode("utf-8", errors="ignore")
    assert "Projet BIM Dakar" in ifc_content


@mock_s3
def test_TC_PY_008_s3_unavailable_returns_503(monkeypatch):
    """TC-PY-008 : S3 unavailable → 503 (no crash)"""
    import app.services.s3_service as s3_mod

    def broken_upload(*args, **kwargs):
        from fastapi import HTTPException
        raise HTTPException(status_code=503, detail="S3 upload failed: connection refused")

    monkeypatch.setattr(s3_mod, "upload_ifc", broken_upload)
    response = client.post("/generate", json=VALID_PAYLOAD)
    assert response.status_code == 503


@mock_s3
def test_TC_PY_005_with_rooms(s3_mock):
    """TC-PY-005 variant : payload with rooms → 201 + valid IFC"""
    response = client.post("/generate", json=PAYLOAD_WITH_ROOMS)
    assert response.status_code == 201
    data = response.json()
    assert data["s3Key"].endswith(".ifc")

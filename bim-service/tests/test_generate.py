import pytest
import ifcopenshell
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


# ── Sprint 3 tests (kept) ──────────────────────────────────────────────────────

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

    obj = s3_mock.get_object(Bucket="bim-ai-models-test", Key=s3_key)
    content = obj["Body"].read()
    assert len(content) > 0
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


# ── Sprint 4 tests — IFC Geometry ─────────────────────────────────────────────

@mock_s3
def test_TC_PY_009_ifc_contains_walls(s3_mock):
    """TC-PY-009 : generated IFC contains IfcWallStandardCase entities"""
    response = client.post("/generate", json=VALID_PAYLOAD)
    assert response.status_code == 201
    s3_key = response.json()["s3Key"]

    obj = s3_mock.get_object(Bucket="bim-ai-models-test", Key=s3_key)
    ifc_bytes = obj["Body"].read()

    import tempfile, os
    with tempfile.NamedTemporaryFile(suffix=".ifc", delete=False) as tmp:
        tmp.write(ifc_bytes)
        tmp_path = tmp.name

    try:
        ifc = ifcopenshell.open(tmp_path)
        walls = ifc.by_type("IfcWallStandardCase")
        # 4 walls per floor × 3 floors = 12 walls
        assert len(walls) == 4 * VALID_PAYLOAD["floors"], (
            f"Expected {4 * VALID_PAYLOAD['floors']} walls, got {len(walls)}"
        )
    finally:
        os.unlink(tmp_path)


@mock_s3
def test_TC_PY_010_ifc_contains_extruded_area_solid(s3_mock):
    """TC-PY-010 : IfcExtrudedAreaSolid entities present (real geometry)"""
    response = client.post("/generate", json={**VALID_PAYLOAD, "floors": 1})
    assert response.status_code == 201
    s3_key = response.json()["s3Key"]

    obj = s3_mock.get_object(Bucket="bim-ai-models-test", Key=s3_key)
    ifc_bytes = obj["Body"].read()

    import tempfile, os
    with tempfile.NamedTemporaryFile(suffix=".ifc", delete=False) as tmp:
        tmp.write(ifc_bytes)
        tmp_path = tmp.name

    try:
        ifc = ifcopenshell.open(tmp_path)
        extrusions = ifc.by_type("IfcExtrudedAreaSolid")
        # At minimum: 1 slab + 4 walls = 5 extrusions per floor
        assert len(extrusions) >= 5, (
            f"Expected >= 5 IfcExtrudedAreaSolid, got {len(extrusions)}"
        )
    finally:
        os.unlink(tmp_path)


@mock_s3
def test_TC_PY_011_storey_count_matches_floors(s3_mock):
    """TC-PY-011 : number of IfcBuildingStorey matches bimData.floors"""
    floors = 5
    response = client.post("/generate", json={**VALID_PAYLOAD, "floors": floors})
    assert response.status_code == 201
    s3_key = response.json()["s3Key"]

    obj = s3_mock.get_object(Bucket="bim-ai-models-test", Key=s3_key)
    ifc_bytes = obj["Body"].read()

    import tempfile, os
    with tempfile.NamedTemporaryFile(suffix=".ifc", delete=False) as tmp:
        tmp.write(ifc_bytes)
        tmp_path = tmp.name

    try:
        ifc = ifcopenshell.open(tmp_path)
        storeys = ifc.by_type("IfcBuildingStorey")
        assert len(storeys) == floors, (
            f"Expected {floors} storeys, got {len(storeys)}"
        )
    finally:
        os.unlink(tmp_path)


@mock_s3
def test_TC_PY_012_upload_returns_s3key_and_filename(s3_mock):
    """TC-PY-012 : upload_ifc returns dict with s3Key and fileName (Sprint 4)"""
    response = client.post("/generate", json=VALID_PAYLOAD)
    assert response.status_code == 201
    data = response.json()

    # Sprint 4: fileName must be present and non-empty
    assert "fileName" in data, "fileName missing from response"
    assert data["fileName"].endswith(".ifc"), f"fileName should end with .ifc, got {data['fileName']}"
    assert data["fileName"] in data["s3Key"], (
        f"fileName '{data['fileName']}' should be part of s3Key '{data['s3Key']}'"
    )
    # status field
    assert data.get("status") == "COMPLETED"
    assert data.get("floors") == VALID_PAYLOAD["floors"]

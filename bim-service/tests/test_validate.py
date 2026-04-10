import pytest
from fastapi.testclient import TestClient

# Import after stripping middleware is applied — use the inner FastAPI app directly
from app.routes.validate import router
from fastapi import FastAPI

app = FastAPI()
app.include_router(router)
client = TestClient(app)

VALID_PAYLOAD = {
    "type": "building",
    "name": "Immeuble Test",
    "floors": 3,
    "width": 20.0,
    "length": 30.0,
    "height": 3.5,
}


def test_TC_PY_001_valid_payload():
    """TC-PY-001 : valid BIM JSON → { valid: true, errors: [] }"""
    response = client.post("/validate", json=VALID_PAYLOAD)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is True
    assert data["errors"] == []


def test_TC_PY_002_floors_zero():
    """TC-PY-002 : floors=0 → { valid: false, errors contains floors }"""
    payload = {**VALID_PAYLOAD, "floors": 0}
    response = client.post("/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert any("floors" in e for e in data["errors"])


def test_TC_PY_003_width_too_large():
    """TC-PY-003 : width=600 (>500) → { valid: false }"""
    payload = {**VALID_PAYLOAD, "width": 600}
    response = client.post("/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert any("width" in e for e in data["errors"])


def test_TC_PY_004_missing_required_fields():
    """TC-PY-004 : missing required fields → 422 from FastAPI validation"""
    response = client.post("/validate", json={"type": "building"})
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False
    assert len(data["errors"]) > 0


def test_TC_PY_004b_wrong_type():
    """TC-PY-004b : type != 'building' → { valid: false }"""
    payload = {**VALID_PAYLOAD, "type": "house"}
    response = client.post("/validate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["valid"] is False


def test_TC_PY_001_with_rooms():
    """TC-PY-001 variant : valid payload with rooms → { valid: true }"""
    payload = {
        **VALID_PAYLOAD,
        "rooms": [
            {"name": "Salon", "area": 25},
            {"name": "Chambre", "area": 18},
        ],
    }
    response = client.post("/validate", json=payload)
    assert response.status_code == 200
    assert response.json()["valid"] is True

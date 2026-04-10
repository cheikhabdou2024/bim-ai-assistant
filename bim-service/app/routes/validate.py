from fastapi import APIRouter
from pydantic import ValidationError
from app.models import BIMInput

router = APIRouter()


@router.post("/validate")
async def validate_bim(payload: dict) -> dict:
    """
    Validate a BIM JSON structure against the BIMInput schema.
    Returns { valid: bool, errors: list[str] }.
    Response time target: < 100ms (pure Pydantic, no IfcOpenShell).
    """
    errors: list[str] = []

    try:
        BIMInput(**payload)
    except ValidationError as exc:
        for error in exc.errors():
            field = " → ".join(str(loc) for loc in error["loc"]) if error["loc"] else "root"
            errors.append(f"{field}: {error['msg']}")

    return {"valid": len(errors) == 0, "errors": errors}

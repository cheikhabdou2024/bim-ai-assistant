from fastapi import APIRouter
import ifcopenshell

router = APIRouter()

@router.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "bim-service",
        "ifcopenshell_version": ifcopenshell.version,
    }

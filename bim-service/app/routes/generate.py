import io
import ifcopenshell
import ifcopenshell.api as api

from fastapi import APIRouter
from app.models import BIMInput
from app.services.s3_service import upload_ifc, generate_presigned_url

router = APIRouter()


def _build_ifc(bim: BIMInput) -> bytes:
    """
    Generate an IFC file from BIMInput data using IfcOpenShell 0.8.4.

    IMPORTANT: aggregate.assign_object requires products=[...] (list), not product=...
    This is a breaking change in IfcOpenShell 0.8.x — see fix in memory.
    """
    ifc = ifcopenshell.file()

    # Project
    project = api.run("root.create_entity", ifc, ifc_class="IfcProject", name=bim.name)
    api.run("unit.assign_unit", ifc)

    # Site
    site = api.run("root.create_entity", ifc, ifc_class="IfcSite", name="Site")
    api.run("aggregate.assign_object", ifc, products=[site], relating_object=project)

    # Building
    building = api.run(
        "root.create_entity", ifc, ifc_class="IfcBuilding", name=bim.name
    )
    api.run("aggregate.assign_object", ifc, products=[building], relating_object=site)

    # Building storeys — one per floor
    for floor_idx in range(bim.floors):
        floor_name = "Rez-de-chaussée" if floor_idx == 0 else f"Étage {floor_idx}"
        storey = api.run(
            "root.create_entity",
            ifc,
            ifc_class="IfcBuildingStorey",
            name=floor_name,
        )
        # Set elevation for each storey
        storey.Elevation = floor_idx * bim.height
        api.run(
            "aggregate.assign_object", ifc, products=[storey], relating_object=building
        )

        # Create spaces from rooms (first floor only for MVP — Sprint 4 will add geometry)
        if bim.rooms and floor_idx == 0:
            for room in bim.rooms:
                space = api.run(
                    "root.create_entity",
                    ifc,
                    ifc_class="IfcSpace",
                    name=room.name,
                )
                api.run(
                    "aggregate.assign_object",
                    ifc,
                    products=[space],
                    relating_object=storey,
                )

    # Serialize to bytes via a temporary in-memory buffer
    buffer = io.StringIO()
    ifc.write(buffer.name if hasattr(buffer, "name") else "/tmp/_bim_ai_tmp.ifc")

    # IfcOpenShell writes to file path — use a temp path and read back
    import tempfile
    import os

    with tempfile.NamedTemporaryFile(suffix=".ifc", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        ifc.write(tmp_path)
        with open(tmp_path, "rb") as f:
            content = f.read()
    finally:
        os.unlink(tmp_path)

    return content


@router.post("/generate", status_code=201)
async def generate_bim(bim: BIMInput) -> dict:
    """
    Generate an IFC file from a validated BIM JSON structure.
    Uploads to S3 and returns a presigned download URL (1 hour).

    ADR-011: bimData is persisted in NestJS DB (Message.bimData)
    BEFORE this endpoint is called — this endpoint only handles IFC generation.

    Timeout target: 30s (sync, acceptable for Sprint 3 MVP).
    """
    ifc_bytes = _build_ifc(bim)
    s3_key = upload_ifc(ifc_bytes)
    download_url = generate_presigned_url(s3_key, expires=3600)

    return {"s3Key": s3_key, "downloadUrl": download_url}

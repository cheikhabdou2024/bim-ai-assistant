import io
import os
import tempfile
import ifcopenshell
import ifcopenshell.api as api

from fastapi import APIRouter
from app.models import BIMInput
from app.services.s3_service import upload_ifc, generate_presigned_url

router = APIRouter()

# ── Constants ─────────────────────────────────────────────────────────────────
WALL_THICKNESS = 0.2   # metres
SLAB_THICKNESS = 0.25  # metres


# ── Geometry helpers ───────────────────────────────────────────────────────────

def _get_body_context(ifc: ifcopenshell.file):
    """Return the Body geometry sub-context, creating it if absent."""
    for sub in ifc.by_type("IfcGeometricRepresentationSubContext"):
        if sub.ContextIdentifier == "Body":
            return sub

    model_contexts = ifc.by_type("IfcGeometricRepresentationContext")
    parent = model_contexts[0] if model_contexts else ifc.createIfcGeometricRepresentationContext(
        None, "Model", 3, 1.0e-5,
        ifc.createIfcAxis2Placement3D(ifc.createIfcCartesianPoint((0., 0., 0.))),
        None,
    )
    return ifc.createIfcGeometricRepresentationSubContext(
        "Body", "Model", None, None, None, None, parent, None, "MODEL_VIEW", None
    )


def _make_extrusion(
    ifc: ifcopenshell.file,
    body_ctx,
    profile_width: float,
    profile_depth: float,
    extrusion_height: float,
    x: float = 0.0,
    y: float = 0.0,
    z: float = 0.0,
    x_axis: tuple = (1.0, 0.0, 0.0),
) -> "ifcopenshell.entity_instance":
    """
    Build IfcExtrudedAreaSolid + IfcShapeRepresentation for a rectangular solid.

    Args:
        profile_width / profile_depth : footprint dimensions
        extrusion_height              : height along Z
        x, y, z                       : placement origin in world coords
        x_axis                        : local X direction (use (0,1,0) for 90° rotation)
    """
    # 2D profile (rectangle in local XY plane)
    placement_2d = ifc.createIfcAxis2Placement2D(
        ifc.createIfcCartesianPoint((0.0, 0.0)),
        ifc.createIfcDirection((1.0, 0.0)),
    )
    profile = ifc.createIfcRectangleProfileDef(
        "AREA", None, placement_2d, profile_width, profile_depth
    )

    # 3D placement
    placement_3d = ifc.createIfcAxis2Placement3D(
        ifc.createIfcCartesianPoint((x, y, z)),
        ifc.createIfcDirection((0.0, 0.0, 1.0)),   # Z-up
        ifc.createIfcDirection(x_axis),
    )

    solid = ifc.createIfcExtrudedAreaSolid(
        profile,
        placement_3d,
        ifc.createIfcDirection((0.0, 0.0, 1.0)),
        extrusion_height,
    )

    shape_rep = ifc.createIfcShapeRepresentation(
        body_ctx, "Body", "SweptSolid", [solid]
    )
    return ifc.createIfcProductDefinitionShape(None, None, [shape_rep])


def _assign_geometry(product, shape):
    """Attach a ProductDefinitionShape to a product entity."""
    product.Representation = shape


# ── IFC builder ────────────────────────────────────────────────────────────────

def _build_ifc(bim: BIMInput) -> bytes:
    """
    Generate an IFC4 file with real 3D geometry (IfcExtrudedAreaSolid).

    Sprint 4 geometry:
      - IfcSlab  : floor slab per storey (building footprint, SLAB_THICKNESS deep)
      - IfcWallStandardCase : 4 perimeter walls per storey (WALL_THICKNESS)

    IMPORTANT: aggregate.assign_object requires products=[...] (list).
    This is a breaking change in IfcOpenShell 0.8.x.
    """
    ifc = ifcopenshell.file()

    # ── Hierarchy ────────────────────────────────────────────────────────────
    project = api.run("root.create_entity", ifc, ifc_class="IfcProject", name=bim.name)
    api.run("unit.assign_unit", ifc)

    site = api.run("root.create_entity", ifc, ifc_class="IfcSite", name="Site")
    api.run("aggregate.assign_object", ifc, products=[site], relating_object=project)

    building = api.run("root.create_entity", ifc, ifc_class="IfcBuilding", name=bim.name)
    api.run("aggregate.assign_object", ifc, products=[building], relating_object=site)

    body_ctx = _get_body_context(ifc)
    floor_height = bim.height  # height per storey

    for floor_idx in range(bim.floors):
        elevation = floor_idx * floor_height
        floor_name = "Rez-de-chaussée" if floor_idx == 0 else f"Étage {floor_idx}"

        storey = api.run(
            "root.create_entity", ifc, ifc_class="IfcBuildingStorey", name=floor_name
        )
        storey.Elevation = elevation
        api.run(
            "aggregate.assign_object", ifc, products=[storey], relating_object=building
        )

        children: list = []

        # ── Floor slab ───────────────────────────────────────────────────────
        slab = api.run("root.create_entity", ifc, ifc_class="IfcSlab", name=f"Dalle {floor_name}")
        slab_shape = _make_extrusion(
            ifc, body_ctx,
            profile_width=bim.width,
            profile_depth=bim.length,
            extrusion_height=SLAB_THICKNESS,
            x=0.0, y=0.0, z=elevation - SLAB_THICKNESS,
        )
        _assign_geometry(slab, slab_shape)
        children.append(slab)

        # ── 4 perimeter walls ────────────────────────────────────────────────
        wall_height = floor_height - SLAB_THICKNESS
        w, l = bim.width, bim.length

        walls_data = [
            # (name, profile_w, profile_d, x, y, z, x_axis)
            # South wall — along X axis
            (f"Mur Sud {floor_name}",  w, WALL_THICKNESS, 0.0, 0.0, elevation, (1.0, 0.0, 0.0)),
            # North wall — along X axis, offset by (length - thickness)
            (f"Mur Nord {floor_name}", w, WALL_THICKNESS, 0.0, l - WALL_THICKNESS, elevation, (1.0, 0.0, 0.0)),
            # West wall — along Y axis
            (f"Mur Ouest {floor_name}", l, WALL_THICKNESS, 0.0, 0.0, elevation, (0.0, 1.0, 0.0)),
            # East wall — along Y axis, offset by (width - thickness)
            (f"Mur Est {floor_name}",  l, WALL_THICKNESS, w - WALL_THICKNESS, 0.0, elevation, (0.0, 1.0, 0.0)),
        ]

        for wall_name, pw, pd, wx, wy, wz, x_ax in walls_data:
            wall = api.run(
                "root.create_entity", ifc,
                ifc_class="IfcWallStandardCase", name=wall_name,
            )
            wall_shape = _make_extrusion(
                ifc, body_ctx,
                profile_width=pw, profile_depth=pd,
                extrusion_height=wall_height,
                x=wx, y=wy, z=wz, x_axis=x_ax,
            )
            _assign_geometry(wall, wall_shape)
            children.append(wall)

        # ── Rooms (first floor only) ─────────────────────────────────────────
        # IfcSpace is a SPATIAL element, not a physical one.
        # Physical elements  → IfcRelContainedInSpatialStructure (spatial.assign_container)
        # Spatial elements   → IfcRelAggregates              (aggregate.assign_object)
        if bim.rooms and floor_idx == 0:
            spaces: list = []
            for room in bim.rooms:
                space = api.run(
                    "root.create_entity", ifc, ifc_class="IfcSpace", name=room.name
                )
                spaces.append(space)
            if spaces:
                api.run(
                    "aggregate.assign_object", ifc,
                    products=spaces, relating_object=storey,
                )

        # IfcRelContainedInSpatialStructure — physical elements only.
        # NOTE: IfcOpenShell 0.8.4 uses `relating_structure` (not `relating_object`).
        api.run(
            "spatial.assign_container", ifc,
            products=children, relating_structure=storey,
        )

    # ── Serialize ─────────────────────────────────────────────────────────────
    with tempfile.NamedTemporaryFile(suffix=".ifc", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        ifc.write(tmp_path)
        with open(tmp_path, "rb") as f:
            content = f.read()
    finally:
        os.unlink(tmp_path)

    return content


# ── Route ──────────────────────────────────────────────────────────────────────

@router.post("/generate", status_code=201)
async def generate_bim(bim: BIMInput) -> dict:
    """
    Generate an IFC file from a validated BIM JSON structure.
    Uploads to S3 and returns s3Key + presigned download URL + fileName.

    ADR-011: bimData is persisted in NestJS DB (Message.bimData) BEFORE
    this endpoint is called — this endpoint only handles IFC generation.

    Sprint 4: returns fileName for UI display (ADR-013).
    Timeout target: 35s (geometry is more expensive than Sprint 3 MVP).
    """
    ifc_bytes = _build_ifc(bim)
    result = upload_ifc(ifc_bytes)
    download_url = generate_presigned_url(result["s3Key"], expires=3600)

    return {
        "s3Key": result["s3Key"],
        "fileName": result["fileName"],
        "downloadUrl": download_url,
        "status": "COMPLETED",
        "floors": bim.floors,
    }

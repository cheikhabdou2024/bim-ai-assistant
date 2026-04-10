from typing import List, Optional
from pydantic import BaseModel, Field, field_validator


class BIMRoom(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    area: float = Field(..., gt=0, le=10000)


class BIMInput(BaseModel):
    type: str = Field(..., pattern=r"^building$")
    name: str = Field(..., min_length=1, max_length=255)
    floors: int = Field(..., ge=1, le=100)
    width: float = Field(..., ge=1, le=500)
    length: float = Field(..., ge=1, le=500)
    height: float = Field(..., ge=2, le=20)
    rooms: Optional[List[BIMRoom]] = Field(default=None, max_length=100)

    @field_validator("type")
    @classmethod
    def type_must_be_building(cls, v: str) -> str:
        if v != "building":
            raise ValueError("type must be 'building'")
        return v

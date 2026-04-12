import uuid
import boto3
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import HTTPException
from app.config import settings


def _get_client():
    """Create a boto3 S3 client using env vars (never hardcoded credentials)."""
    return boto3.client("s3", region_name=settings.aws_region)


def upload_ifc(content: bytes) -> dict:
    """
    Upload IFC bytes to S3.
    Returns { "s3Key": str, "fileName": str }.
    Raises HTTP 503 if S3 is unavailable.
    """
    if not settings.aws_s3_bucket:
        raise HTTPException(status_code=503, detail="S3 bucket not configured")

    file_name = f"{uuid.uuid4()}.ifc"
    s3_key = f"models/{file_name}"

    try:
        client = _get_client()
        client.put_object(
            Bucket=settings.aws_s3_bucket,
            Key=s3_key,
            Body=content,
            ContentType="application/x-step",
        )
    except (BotoCoreError, ClientError) as exc:
        raise HTTPException(status_code=503, detail=f"S3 upload failed: {exc}") from exc

    return {"s3Key": s3_key, "fileName": file_name}


def generate_presigned_url(s3_key: str, expires: int = 3600) -> str:
    """
    Generate a presigned download URL (default expiry: 1 hour).
    Raises HTTP 503 if S3 is unavailable.
    """
    try:
        client = _get_client()
        url: str = client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.aws_s3_bucket, "Key": s3_key},
            ExpiresIn=expires,
        )
        return url
    except (BotoCoreError, ClientError) as exc:
        raise HTTPException(status_code=503, detail=f"S3 presign failed: {exc}") from exc

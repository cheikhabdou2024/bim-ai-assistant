import os
import pytest
import boto3
from moto import mock_aws

# Set env vars BEFORE any app imports to avoid pydantic-settings validation errors
os.environ.setdefault("AWS_S3_BUCKET", "bim-ai-models-test")
os.environ.setdefault("AWS_REGION", "eu-west-1")
os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.setdefault("AWS_DEFAULT_REGION", "eu-west-1")


@pytest.fixture
def s3_mock():
    """Moto S3 mock — creates a test bucket and yields the boto3 client."""
    with mock_aws():
        client = boto3.client("s3", region_name="eu-west-1")
        client.create_bucket(
            Bucket="bim-ai-models-test",
            CreateBucketConfiguration={"LocationConstraint": "eu-west-1"},
        )
        yield client

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    environment: str = "development"
    host: str = "0.0.0.0"
    port: int = 8000
    aws_s3_bucket: str = ""
    aws_region: str = "eu-west-1"

    class Config:
        env_file = ".env"


settings = Settings()

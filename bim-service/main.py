from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.health import router as health_router
from app.config import settings


class StripPrefixMiddleware:
    """Strip /bim path prefix forwarded by the ALB listener rule."""

    def __init__(self, app, prefix: str = "/bim"):
        self.app = app
        self.prefix = prefix.encode()
        self.prefix_str = prefix

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path: str = scope["path"]
            if path.startswith(self.prefix_str):
                scope = dict(scope)
                scope["path"] = path[len(self.prefix_str):] or "/"
                raw = scope.get("raw_path", b"")
                if raw.startswith(self.prefix):
                    scope["raw_path"] = raw[len(self.prefix):] or b"/"
        await self.app(scope, receive, send)


app = FastAPI(
    title="BIM AI — BIM Service",
    version="0.1.0",
    docs_url="/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app = StripPrefixMiddleware(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)

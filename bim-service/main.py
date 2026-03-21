from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.health import router as health_router
from app.config import settings

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)

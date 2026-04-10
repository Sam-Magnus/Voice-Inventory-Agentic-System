from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog

from src.config import get_settings
from src.api.routes import voice, health, queue, chat, voice_demo

structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.dev.ConsoleRenderer(),
    ]
)

logger = structlog.get_logger()

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Agentic Voice AI System for IT Hardware Shops",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Reply-Text", "X-Tools-Used", "X-Session-Id"],
)

# Routes
app.include_router(health.router, tags=["health"])
app.include_router(voice.router, prefix="/api/v1/voice", tags=["voice"])
app.include_router(queue.router, prefix="/api/v1/voice/queue", tags=["queue"])
app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
app.include_router(voice_demo.router, prefix="/api/v1/voice-demo", tags=["voice-demo"])


@app.on_event("startup")
async def startup():
    logger.info("Voice Agent starting", app=settings.app_name)


@app.on_event("shutdown")
async def shutdown():
    logger.info("Voice Agent shutting down")

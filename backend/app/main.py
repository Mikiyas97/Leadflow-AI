"""LeadFlow AI Agent - FastAPI Application Entrypoint"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings
from backend.app.database import init_db
from backend.app.routes.profiles import router as profiles_router
from backend.app.routes.discovery import router as discovery_router
from backend.app.routes.leads import router as leads_router
from backend.app.routes.drafts import router as drafts_router
from backend.app.routes.activity import router as activity_router
from backend.app.routes.dashboard import router as dashboard_router
from backend.app.routes.chat import router as chat_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="AI-powered sales operations agent for B2B lead discovery, qualification, and outreach.",
    lifespan=lifespan
)

# CORS setup for React frontend
origins = [
    settings.FRONTEND_ORIGIN,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers under /api
app.include_router(chat_router, prefix=settings.API_V1_STR)
app.include_router(profiles_router, prefix=settings.API_V1_STR)
app.include_router(discovery_router, prefix=settings.API_V1_STR)
app.include_router(leads_router, prefix=settings.API_V1_STR)
app.include_router(drafts_router, prefix=settings.API_V1_STR)
app.include_router(activity_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs_url": "/docs"
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "hunter_configured": bool(settings.HUNTER_API_KEY),
        "firecrawl_configured": bool(settings.FIRECRAWL_API_KEY),
    }

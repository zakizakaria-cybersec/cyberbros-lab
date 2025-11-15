from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager
from .routes import auth_router, challenges_router, vms_router
from .database import engine, SessionLocal
from .models import User, Challenge, VMInstance
from .database import Base
from .scheduler import start_scheduler
from .services.challenge_service import ChallengeService
from .config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events"""
    # Startup
    logger.info("Starting CyberBros Lab API")
    
    # Create database tables
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created")
    
    # Seed challenges
    db = SessionLocal()
    try:
        ChallengeService.seed_challenges(db)
        logger.info("Challenges seeded")
    finally:
        db.close()
    
    # Start background scheduler
    scheduler = start_scheduler()
    
    yield
    
    # Shutdown
    logger.info("Shutting down CyberBros Lab API")
    scheduler.shutdown()


# Create FastAPI app
app = FastAPI(
    title="CyberBros Lab API",
    description="API for cybersecurity training platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", settings.frontend_url, "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(challenges_router)
app.include_router(vms_router)


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "CyberBros Lab API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health():
    """Health check endpoint"""
    return {"status": "healthy"}

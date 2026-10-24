"""LeadFlow AI - Database Engine and Session Management"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

# SQLite needs check_same_thread=False for multi-threaded FastAPI workers
is_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False} if is_sqlite else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency that yields a database session and closes it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables in the database if they do not exist."""
    from backend.app import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    
    # Safe migration for new fields in existing SQLite database
    from sqlalchemy import text
    with engine.connect() as conn:
        for stmt in [
            "ALTER TABLE leads ADD COLUMN follow_up_notes TEXT",
            "ALTER TABLE leads ADD COLUMN follow_up_status VARCHAR(50) DEFAULT 'SCHEDULED'",
            "ALTER TABLE leads ADD COLUMN website_status VARCHAR(50) DEFAULT 'HAS_OFFICIAL_WEBSITE'",
            "ALTER TABLE outreach_drafts ADD COLUMN sent_at DATETIME",
            "ALTER TABLE outreach_drafts ADD COLUMN send_error TEXT",
            "ALTER TABLE outreach_drafts ADD COLUMN idempotency_key VARCHAR(255)"
        ]:
            try:
                conn.execute(text(stmt))
                conn.commit()
            except Exception:
                pass


# Auto-initialize database tables and columns on module load
try:
    init_db()
except Exception:
    pass


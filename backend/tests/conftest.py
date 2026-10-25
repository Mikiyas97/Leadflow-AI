"""Pytest configuration to ensure tests run in an isolated test database."""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Set test database URL
TEST_DB_URL = "sqlite:///./test_leadflow.db"
os.environ["DATABASE_URL"] = TEST_DB_URL

from backend.app.config import settings
settings.DATABASE_URL = TEST_DB_URL

from backend.app import database
database.engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
database.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=database.engine)
database.init_db()

from backend.app.main import app
from backend.app.database import get_db

def override_get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

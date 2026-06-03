"""Test configuration — uses SQLite, skips PostgreSQL-specific schema tables."""
import os
import sys
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

os.environ["DATABASE_URL"] = "sqlite:///./test_wms.db"
os.environ.setdefault("JWT_SECRET", "test-secret-key-for-unit-tests")

# Block CREATE SCHEMA before any import
from sqlalchemy.engine import base as _sae
_real_exec = _sae.Connection.execute
def _safe_exec(self, obj, *args, **kwargs):
    s = str(obj).upper()
    if "CREATE SCHEMA" in s:
        return None
    return _real_exec(self, obj, *args, **kwargs)
_sae.Connection.execute = _safe_exec

from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client():
    import core.database as _db
    import main as _main
    # Only create tables without a schema (SQLite doesn't support schemas)
    tables = [t for t in _db.Base.metadata.sorted_tables if t.schema is None]
    _db.Base.metadata.create_all(bind=_db.engine, tables=tables)
    return TestClient(_main.app, raise_server_exceptions=False)


@pytest.fixture
def auth_token():
    from jose import jwt
    from datetime import datetime, timedelta
    payload = {
        "admin_id": "test-user", "admin_name": "Tester", "role": "admin",
        "exp": datetime.utcnow() + timedelta(hours=1), "type": "access",
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm="HS256")

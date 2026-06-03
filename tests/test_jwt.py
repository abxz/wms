"""Tests for JWT token generation and verification."""
import os
from datetime import datetime, timedelta
from jose import jwt, JWTError

JWT_SECRET = os.environ.get("JWT_SECRET", "test-secret-key-for-unit-tests")


def _make_token(payload: dict, token_type: str, expires_delta) -> str:
    expire = datetime.utcnow() + expires_delta
    return jwt.encode({**payload, "exp": expire, "type": token_type}, JWT_SECRET, algorithm="HS256")


def test_access_token_verifiable():
    payload = {"admin_id": "u1", "admin_name": "Alice", "role": "admin"}
    token = _make_token(payload, "access", timedelta(minutes=60))
    decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    assert decoded["admin_id"] == "u1"
    assert decoded["type"] == "access"


def test_refresh_token_verifiable():
    payload = {"admin_id": "u1", "admin_name": "Alice", "role": "admin"}
    token = _make_token(payload, "refresh", timedelta(days=30))
    decoded = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    assert decoded["type"] == "refresh"


def test_invalid_token_raises():
    try:
        jwt.decode("not.a.valid.token", JWT_SECRET, algorithms=["HS256"])
        assert False, "should have raised"
    except JWTError:
        pass


def test_tampered_token_raises():
    token = _make_token({"admin_id": "u1", "admin_name": "x", "role": "admin"}, "access", timedelta(minutes=60))
    tampered = token[:-5] + "XXXXX"
    try:
        jwt.decode(tampered, JWT_SECRET, algorithms=["HS256"])
        assert False, "should have raised"
    except JWTError:
        pass

"""Tests for /api/auth/login endpoint."""
from unittest.mock import patch


def test_login_success(client):
    with patch("modules.auth.router.routes", client.app.routes):
        resp = client.post("/api/auth/login", json={"username": "admin", "password": "123"})
    assert resp.status_code == 200
    assert "token" in resp.json()


def test_login_wrong_password(client):
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "wrong"})
    assert resp.status_code == 401


def test_login_missing_fields(client):
    resp = client.post("/api/auth/login", json={"username": ""})
    assert resp.status_code == 400


def test_login_returns_refresh_token(client):
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "123"})
    data = resp.json()
    assert "refresh_token" in data
    assert "expires_in" in data

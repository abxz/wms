"""Tests for inbound endpoint authentication gating."""


def test_inbound_no_token_returns_401(client):
    resp = client.get("/api/inbound")
    assert resp.status_code == 401


def test_inbound_invalid_token_returns_401(client):
    resp = client.get("/api/inbound", headers={"Authorization": "Bearer invalid.token.here"})
    assert resp.status_code == 401


def test_inbound_with_valid_token_not_401(client, auth_token):
    resp = client.get("/api/inbound", headers={"Authorization": f"Bearer {auth_token}"})
    # May return 200, 404, 500 depending on DB state — just not 401
    assert resp.status_code != 401


def test_dashboard_requires_auth(client):
    resp = client.get("/api/dashboard/summary")
    assert resp.status_code == 401

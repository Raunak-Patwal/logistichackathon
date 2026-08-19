import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check_root(async_client: AsyncClient):
    """Test health endpoint at root /health."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "AI Logistics Brain"
    assert data["environment"] in ("development", "testing")



@pytest.mark.asyncio
async def test_health_check_v1(async_client: AsyncClient):
    """Test health endpoint at /api/v1/health."""
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"

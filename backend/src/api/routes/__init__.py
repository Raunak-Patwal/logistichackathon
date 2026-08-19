from fastapi import APIRouter
from src.api.routes.health import router as health_router
from src.api.routes.events import router as events_router
from src.api.routes.parcels import router as parcels_router
from src.api.routes.incidents import router as incidents_router
from src.api.routes.world import router as world_router
from src.api.routes.websocket import router as websocket_router
from src.api.routes.auth_routes import router as auth_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["Health"])
api_router.include_router(auth_router)
api_router.include_router(events_router)
api_router.include_router(parcels_router)
api_router.include_router(incidents_router)
api_router.include_router(world_router)
api_router.include_router(websocket_router)

__all__ = ["api_router"]




import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from .database import Base, engine, SessionLocal, PROJECT_ROOT
from . import models  # noqa: F401  ensure models registered
from .routers import auth, opportunities, orders, dashboard, settings, upload

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    from .seed import seed_if_empty
    db = SessionLocal()
    try:
        seed_if_empty(db)
    finally:
        db.close()
    yield


app = FastAPI(title="翼嘉通讯 - 天耘科技 ERP", lifespan=lifespan)

# 跨域放行：默认允许本地调试；生产通过环境变量 CORS_ORIGINS 指定前端域名（逗号分隔）
# 注意：带凭证（Bearer）时不能用 "*"，必须显式列出前端来源
_cors_env = os.environ.get("CORS_ORIGINS", "http://localhost:8000,http://localhost:5173")
cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOADS_DIR = os.path.join(PROJECT_ROOT, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

app.include_router(auth.router)
app.include_router(opportunities.router)
app.include_router(orders.router)
app.include_router(dashboard.router)
app.include_router(settings.router)
app.include_router(upload.router)

FRONTEND_DIST = os.path.join(PROJECT_ROOT, "frontend", "dist")


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/{full_path:path}")
def serve_spa(full_path: str):
    if full_path.startswith("api/"):
        return JSONResponse(status_code=404, content={"detail": "Not Found"})
    asset = os.path.join(FRONTEND_DIST, full_path)
    if os.path.isfile(asset):
        return FileResponse(asset)
    index = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.isfile(index):
        return FileResponse(index)
    return JSONResponse(status_code=404, content={"detail": "frontend not built"})

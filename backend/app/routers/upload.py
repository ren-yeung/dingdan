import os
import secrets
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException

from ..deps import get_current_user
from ..models import User
from ..database import PROJECT_ROOT

router = APIRouter(prefix="/api", tags=["upload"])

ALLOWED = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
EXTS = {".jpg", ".jpeg", ".png", ".webp"}

UPLOAD_DIR = os.path.join(PROJECT_ROOT, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
async def upload(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    if file.content_type not in ALLOWED:
        raise HTTPException(status_code=400, detail="仅支持图片格式 (jpg/png/webp)")
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in EXTS:
        ext = ".jpg"
    fname = "IMG" + secrets.token_hex(8) + ext
    path = os.path.join(UPLOAD_DIR, fname)
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="文件为空")
    with open(path, "wb") as f:
        f.write(content)
    return {"url": "/uploads/" + fname}

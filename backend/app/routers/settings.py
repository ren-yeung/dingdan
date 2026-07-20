from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User, Product
from ..schemas import (
    UserCreate, UserUpdate, UserOut, ProductCreate, ProductUpdate,
    ProductOut, ChangePasswordIn,
)
from ..deps import get_current_user, require_role
from ..auth import hash_password, verify_password

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_role("admin"))):
    return db.query(User).order_by(User.id).all()


@router.post("/users", response_model=UserOut)
def create_user(payload: UserCreate, db: Session = Depends(get_db),
                _: User = Depends(require_role("admin"))):
    username = payload.username.strip()
    password = payload.password.strip()
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="用户名已存在")
    if payload.role not in ("admin", "sales", "manager"):
        raise HTTPException(status_code=400, detail="角色非法")
    salt, h = hash_password(password)
    u = User(username=username, name=payload.name, password_salt=salt,
             password_hash=h, role=payload.role, active=payload.active)
    db.add(u)
    db.commit()
    db.refresh(u)
    return u


@router.put("/users/{uid}", response_model=UserOut)
def update_user(uid: int, payload: UserUpdate, db: Session = Depends(get_db),
                _: User = Depends(require_role("admin"))):
    u = db.get(User, uid)
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")
    data = payload.model_dump(exclude_unset=True)
    if data.get("username"):
        data["username"] = data["username"].strip()
    if data.get("password"):
        salt, h = hash_password(data["password"].strip())
        u.password_salt = salt
        u.password_hash = h
        del data["password"]
    for k, v in data.items():
        setattr(u, k, v)
    db.commit()
    db.refresh(u)
    return u


@router.delete("/users/{uid}")
def delete_user(uid: int, db: Session = Depends(get_db),
                _: User = Depends(require_role("admin"))):
    u = db.get(User, uid)
    if not u:
        raise HTTPException(status_code=404, detail="用户不存在")
    db.delete(u)
    db.commit()
    return {"ok": True}


@router.get("/products", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Product).order_by(Product.id).all()


@router.post("/products", response_model=ProductOut)
def create_product(payload: ProductCreate, db: Session = Depends(get_db),
                   _: User = Depends(require_role("admin"))):
    p = Product(name=payload.name, description=payload.description, active=True)
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.put("/products/{pid}", response_model=ProductOut)
def update_product(pid: int, payload: ProductUpdate, db: Session = Depends(get_db),
                   _: User = Depends(require_role("admin"))):
    p = db.get(Product, pid)
    if not p:
        raise HTTPException(status_code=404, detail="产品不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/products/{pid}")
def delete_product(pid: int, db: Session = Depends(get_db),
                   _: User = Depends(require_role("admin"))):
    p = db.get(Product, pid)
    if not p:
        raise HTTPException(status_code=404, detail="产品不存在")
    db.delete(p)
    db.commit()
    return {"ok": True}


@router.post("/me/password")
def change_password(payload: ChangePasswordIn, db: Session = Depends(get_db),
                    user: User = Depends(get_current_user)):
    if not verify_password(payload.old_password.strip(), user.password_salt, user.password_hash):
        raise HTTPException(status_code=400, detail="原密码错误")
    salt, h = hash_password(payload.new_password.strip())
    user.password_salt = salt
    user.password_hash = h
    db.commit()
    return {"ok": True}

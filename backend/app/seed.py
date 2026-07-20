from .database import SessionLocal
from .models import User, Product
from .auth import hash_password


def seed_if_empty(db):
    if db.query(User).count() > 0:
        return
    admin_salt, admin_hash = hash_password("admin123")
    sales_salt, sales_hash = hash_password("sales123")
    mgr_salt, mgr_hash = hash_password("manager123")

    admin = User(username="admin", name="管理员", password_salt=admin_salt,
                 password_hash=admin_hash, role="admin", active=True)
    manager = User(username="manager", name="销售主管", password_salt=mgr_salt,
                   password_hash=mgr_hash, role="manager", active=True)
    sales = User(username="sales", name="销售员", password_salt=sales_salt,
                 password_hash=sales_hash, role="sales", active=True)

    db.add_all([admin, manager, sales])
    db.add(Product(name="SDWAN专线", description="软件定义广域网（SD-WAN）专线服务", active=True))
    db.commit()

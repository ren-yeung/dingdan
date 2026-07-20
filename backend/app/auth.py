import hashlib
import os
import secrets
from datetime import datetime, timedelta

from itsdangerous import URLSafeTimedSerializer

SECRET_KEY = os.environ.get("ERP_SECRET_KEY", "yijia-erp-dev-secret-change-me")
TOKEN_SALT = "erp-auth"
TOKEN_MAX_AGE = 60 * 60 * 24 * 7  # 7 天

_serializer = URLSafeTimedSerializer(SECRET_KEY, salt=TOKEN_SALT)


def hash_password(password: str) -> tuple[str, str]:
    """返回 (salt_hex, hash_hex)"""
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return salt.hex(), dk.hex()


def verify_password(password: str, salt_hex: str, hash_hex: str) -> bool:
    try:
        salt = bytes.fromhex(salt_hex)
    except Exception:
        return False
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100000)
    return secrets.compare_digest(dk.hex(), hash_hex)


def create_token(user_id: int, role: str) -> str:
    return _serializer.dumps({"user_id": user_id, "role": role})


def parse_token(token: str) -> dict | None:
    try:
        return _serializer.loads(token, max_age=TOKEN_MAX_AGE)
    except Exception:
        return None


def gen_order_no() -> str:
    """订单号：YJ + 日期 + 随机"""
    return "YJ" + datetime.utcnow().strftime("%Y%m%d") + secrets.token_hex(3).upper()

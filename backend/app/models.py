from datetime import datetime, date
from sqlalchemy import (
    Column, Integer, String, Text, Float, Date, DateTime,
    ForeignKey, Boolean, Enum as SAEnum,
)
from sqlalchemy.orm import relationship
from .database import Base

ROLES = ("admin", "sales", "manager")
OPP_STATUS = ("pending", "approved", "rejected", "converted")
ORDER_STATUS = ("active", "ended")


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    name = Column(String(64), nullable=False)
    password_hash = Column(String(200), nullable=False)
    password_salt = Column(String(64), nullable=False)
    role = Column(SAEnum(*ROLES), nullable=False, default="sales")
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    opportunities = relationship("Opportunity", back_populates="submitter",
                                 foreign_keys="Opportunity.submitter_id")
    orders = relationship("Order", back_populates="owner",
                          foreign_keys="Order.owner_id")


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    description = Column(Text, default="")
    active = Column(Boolean, default=True)


class Opportunity(Base):
    __tablename__ = "opportunities"
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(200), nullable=False)
    handler = Column(String(64), nullable=False)
    phone = Column(String(64), nullable=False)
    install_address = Column(String(300), default="")
    business_license = Column(String(300), default="")   # 公司营业执照 图片
    storefront_photo = Column(String(300), default="")    # 公司门头照片 图片
    office_photo = Column(String(300), default="")        # 公司办公环境照片 图片
    local_operator = Column(String(120), default="")      # 本地运营商网络
    bandwidth = Column(String(120), default="")           # 需求带宽
    country = Column(String(120), default="")             # 需求国家
    website = Column(String(300), default="")             # 访问网站
    submitter_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(SAEnum(*OPP_STATUS), default="pending")
    admin_reply = Column(Text, default="")
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    submitter = relationship("User", back_populates="opportunities",
                             foreign_keys=[submitter_id])


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(40), unique=True, index=True, nullable=False)
    source_opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=True)
    party_a = Column(String(200), default="")            # 甲方
    party_b = Column(String(200), default="")            # 乙方
    tech_provider = Column(String(120), default="天耘科技")  # 技术提供方
    bandwidth = Column(String(120), default="")           # 带宽
    monthly_rent = Column(Float, default=0.0)             # 月租
    cooperation_period = Column(String(120), default="")  # 合作周期
    cooperation_date = Column(Date, nullable=True)        # 合作日期
    actual_user = Column(String(200), default="")         # 实际使用方
    handler = Column(String(64), default="")              # 经办人
    contact_phone = Column(String(64), default="")        # 联系电话
    install_address = Column(String(300), default="")     # 安装地址
    country = Column(String(120), default="")             # 合作国家
    next_payment_date = Column(Date, nullable=True)       # 下一个付款日
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    status = Column(SAEnum(*ORDER_STATUS), default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="orders", foreign_keys=[owner_id])
    source = relationship("Opportunity", foreign_keys=[source_opportunity_id])

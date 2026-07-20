from __future__ import annotations
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


# ---------- Auth ----------
class LoginIn(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    name: str
    role: str
    active: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str


# ---------- Opportunity / 商机（测试需求）----------
class OpportunityCreate(BaseModel):
    company_name: str
    handler: str
    phone: str
    install_address: str = ""
    business_license: str = ""
    storefront_photo: str = ""
    office_photo: str = ""
    local_operator: str = ""
    bandwidth: str = ""
    country: str = ""
    website: str = ""


class OpportunityUpdate(BaseModel):
    company_name: Optional[str] = None
    handler: Optional[str] = None
    phone: Optional[str] = None
    install_address: Optional[str] = None
    business_license: Optional[str] = None
    storefront_photo: Optional[str] = None
    office_photo: Optional[str] = None
    local_operator: Optional[str] = None
    bandwidth: Optional[str] = None
    country: Optional[str] = None
    website: Optional[str] = None


class OpportunityOut(BaseModel):
    id: int
    company_name: str
    handler: str
    phone: str
    install_address: str
    business_license: str
    storefront_photo: str
    office_photo: str
    local_operator: str
    bandwidth: str
    country: str
    website: str
    submitter_id: int
    submitter_name: Optional[str] = None
    status: str
    admin_reply: str
    reviewer_id: Optional[int] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ReviewIn(BaseModel):
    status: str  # approved | rejected
    admin_reply: str = ""


# ---------- Order / 正式订单 ----------
class OrderCreate(BaseModel):
    party_a: str = ""       # 甲方
    party_b: str = ""       # 乙方
    tech_provider: str = "天耘科技"
    bandwidth: str = ""
    monthly_rent: float = 0.0
    cooperation_period: str = ""
    cooperation_date: Optional[date] = None
    actual_user: str = ""
    handler: str = ""
    contact_phone: str = ""
    install_address: str = ""
    country: str = ""
    next_payment_date: Optional[date] = None
    owner_id: Optional[int] = None
    status: str = "active"


class OrderUpdate(BaseModel):
    party_a: Optional[str] = None
    party_b: Optional[str] = None
    tech_provider: Optional[str] = None
    bandwidth: Optional[str] = None
    monthly_rent: Optional[float] = None
    cooperation_period: Optional[str] = None
    cooperation_date: Optional[date] = None
    actual_user: Optional[str] = None
    handler: Optional[str] = None
    contact_phone: Optional[str] = None
    install_address: Optional[str] = None
    country: Optional[str] = None
    next_payment_date: Optional[date] = None
    owner_id: Optional[int] = None
    status: Optional[str] = None


class OrderOut(BaseModel):
    id: int
    order_no: str
    source_opportunity_id: Optional[int] = None
    party_a: str
    party_b: str
    tech_provider: str
    bandwidth: str
    monthly_rent: float
    cooperation_period: str
    cooperation_date: Optional[date] = None
    actual_user: str
    handler: str
    contact_phone: str
    install_address: str
    country: str
    next_payment_date: Optional[date] = None
    owner_id: int
    owner_name: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ---------- Settings ----------
class UserCreate(BaseModel):
    username: str
    name: str
    password: str
    role: str = "sales"
    active: bool = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None


class ProductCreate(BaseModel):
    name: str
    description: str = ""


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class ProductOut(BaseModel):
    id: int
    name: str
    description: str
    active: bool

    model_config = {"from_attributes": True}


# ---------- Dashboard ----------
class DashboardOut(BaseModel):
    month: str
    total_performance: float       # 月度总业绩（本月签约订单月租合计）
    total_orders: int              # 月度总订单量
    total_opportunities: int       # 月度商机
    ranking: list                  # 销售排行
    recent_orders: list            # 最近订单
    recent_opportunities: list = []  # 最近商机

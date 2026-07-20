from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime

from ..database import get_db
from ..models import Order, Opportunity, User
from ..schemas import OrderCreate, OrderUpdate, OrderOut
from ..deps import get_current_user
from ..auth import gen_order_no

router = APIRouter(prefix="/api/orders", tags=["orders"])


def to_out(o: Order) -> OrderOut:
    r = OrderOut.model_validate(o)
    r.owner_name = o.owner.name if o.owner else None
    return r


@router.post("", response_model=OrderOut)
def create_order(payload: OrderCreate, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅管理员可新建订单")
    if payload.owner_id is None:
        raise HTTPException(status_code=400, detail="请指定订单归属销售")
    order = Order(order_no=gen_order_no(), **payload.model_dump())
    db.add(order)
    db.commit()
    db.refresh(order)
    return to_out(order)


@router.post("/convert/{opp_id}", response_model=OrderOut)
def convert_order(opp_id: int, payload: OrderCreate, db: Session = Depends(get_db),
                  user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅管理员可将测试转正式订单")
    opp = db.get(Opportunity, opp_id)
    if not opp:
        raise HTTPException(status_code=404, detail="商机不存在")
    if opp.status == "converted":
        raise HTTPException(status_code=400, detail="该商机已转订单")
    data = payload.model_dump()
    # 测试 -> 正式 字段映射
    data["actual_user"] = payload.actual_user or opp.company_name
    data["handler"] = payload.handler or opp.handler
    data["contact_phone"] = payload.contact_phone or opp.phone
    data["install_address"] = payload.install_address or opp.install_address
    data["country"] = payload.country or opp.country
    data["owner_id"] = payload.owner_id or opp.submitter_id
    # 下一个付款日：首次转订单默认为合作日期
    if data.get("next_payment_date") is None and payload.cooperation_date is not None:
        data["next_payment_date"] = payload.cooperation_date
    order = Order(order_no=gen_order_no(), source_opportunity_id=opp.id, **data)
    opp.status = "converted"
    db.add(order)
    db.commit()
    db.refresh(order)
    return to_out(order)


@router.get("", response_model=list[OrderOut])
def list_orders(status: str = None, db: Session = Depends(get_db),
                user: User = Depends(get_current_user)):
    q = db.query(Order)
    if user.role == "sales":
        q = q.filter(Order.owner_id == user.id)
    if status:
        q = q.filter(Order.status == status)
    orders = q.order_by(Order.created_at.desc()).all()
    return [to_out(o) for o in orders]


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db),
              user: User = Depends(get_current_user)):
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    if user.role == "sales" and o.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限查看该订单")
    return to_out(o)


@router.put("/{order_id}", response_model=OrderOut)
def update_order(order_id: int, payload: OrderUpdate, db: Session = Depends(get_db),
                 user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅管理员可编辑订单")
    o = db.get(Order, order_id)
    if not o:
        raise HTTPException(status_code=404, detail="订单不存在")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(o, k, v)
    o.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(o)
    return to_out(o)

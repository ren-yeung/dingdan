from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime

from ..database import get_db
from ..models import Order, Opportunity, User
from ..deps import get_current_user
from ..schemas import DashboardOut

router = APIRouter(prefix="/api", tags=["dashboard"])


def month_bounds(month: str):
    y, m = map(int, month.split("-"))
    start = datetime(y, m, 1)
    if m == 12:
        end = datetime(y + 1, 1, 1)
    else:
        end = datetime(y, m + 1, 1)
    return start, end


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(month: str = Query(None), db: Session = Depends(get_db),
              user: User = Depends(get_current_user)):
    if not month:
        now = datetime.utcnow()
        month = f"{now.year}-{now.month:02d}"
    start, end = month_bounds(month)

    orders_month = (
        db.query(Order)
        .filter(Order.cooperation_date >= start.date(),
                Order.cooperation_date < end.date())
        .all()
    )
    total_performance = round(sum(o.monthly_rent or 0 for o in orders_month), 2)
    total_orders = len(orders_month)

    total_opportunities = (
        db.query(Opportunity)
        .filter(Opportunity.created_at >= start, Opportunity.created_at < end)
        .count()
    )

    # 销售排行（按销售本月业绩）
    sales_users = db.query(User).filter(User.role == "sales", User.active == True).all()
    rank = []
    for s in sales_users:
        owned = [o for o in orders_month if o.owner_id == s.id]
        rank.append({
            "user_id": s.id,
            "name": s.name,
            "performance": round(sum(o.monthly_rent or 0 for o in owned), 2),
            "order_count": len(owned),
        })
    rank.sort(key=lambda x: x["performance"], reverse=True)

    recent = db.query(Order).order_by(Order.created_at.desc()).limit(8).all()
    recent_orders = [{
        "order_no": o.order_no,
        "actual_user": o.actual_user,
        "owner_name": o.owner.name if o.owner else "",
        "monthly_rent": o.monthly_rent,
        "cooperation_date": o.cooperation_date.isoformat() if o.cooperation_date else None,
        "status": o.status,
    } for o in recent]

    # 最近商机
    recent_opp = db.query(Opportunity).order_by(Opportunity.created_at.desc()).limit(8).all()
    recent_opportunities = [{
        "id": opp.id,
        "company_name": opp.company_name,
        "contact_person": opp.handler,
        "bandwidth": opp.bandwidth,
        "country": opp.country,
        "status": opp.status,
        "status_label": {"pending": "待审核", "approved": "已通过", "rejected": "已驳回", "converted": "已转订单"}.get(opp.status, opp.status),
        "created_at": opp.created_at.strftime("%Y-%m-%d %H:%M") if opp.created_at else None,
        "owner_name": opp.submitter.name if opp.submitter else "",
    } for opp in recent_opp]

    return DashboardOut(
        month=month,
        total_performance=total_performance,
        total_orders=total_orders,
        total_opportunities=total_opportunities,
        ranking=rank,
        recent_orders=recent_orders,
        recent_opportunities=recent_opportunities,
    )

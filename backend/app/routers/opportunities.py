from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import datetime

from ..database import get_db
from ..models import Opportunity, User
from ..schemas import (
    OpportunityCreate, OpportunityUpdate, OpportunityOut, ReviewIn,
)
from ..deps import get_current_user

router = APIRouter(prefix="/api/opportunities", tags=["opportunities"])


def to_out(opp: Opportunity) -> OpportunityOut:
    o = OpportunityOut.model_validate(opp)
    o.submitter_name = opp.submitter.name if opp.submitter else None
    return o


def can_edit(user: User, opp: Opportunity) -> bool:
    if user.role == "admin":
        return True
    if user.role == "manager":
        return opp.status != "converted"
    if user.role == "sales":
        return opp.submitter_id == user.id and opp.status in ("pending", "rejected")
    return False


@router.post("", response_model=OpportunityOut)
def create_opp(payload: OpportunityCreate, db: Session = Depends(get_db),
               user: User = Depends(get_current_user)):
    if user.role not in ("sales", "manager", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限提交商机")
    opp = Opportunity(submitter_id=user.id, status="pending", **payload.model_dump())
    db.add(opp)
    db.commit()
    db.refresh(opp)
    return to_out(opp)


@router.get("", response_model=list[OpportunityOut])
def list_opps(status: str = None, db: Session = Depends(get_db),
              user: User = Depends(get_current_user)):
    q = db.query(Opportunity)
    if user.role == "sales":
        q = q.filter(Opportunity.submitter_id == user.id)
    if status:
        q = q.filter(Opportunity.status == status)
    opps = q.order_by(Opportunity.created_at.desc()).all()
    return [to_out(o) for o in opps]


@router.get("/{opp_id}", response_model=OpportunityOut)
def get_opp(opp_id: int, db: Session = Depends(get_db),
            user: User = Depends(get_current_user)):
    opp = db.get(Opportunity, opp_id)
    if not opp:
        raise HTTPException(status_code=404, detail="商机不存在")
    if user.role == "sales" and opp.submitter_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权限查看该商机")
    return to_out(opp)


@router.put("/{opp_id}", response_model=OpportunityOut)
def update_opp(opp_id: int, payload: OpportunityUpdate, db: Session = Depends(get_db),
               user: User = Depends(get_current_user)):
    opp = db.get(Opportunity, opp_id)
    if not opp:
        raise HTTPException(status_code=404, detail="商机不存在")
    if not can_edit(user, opp):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="当前状态或角色无权限修改该商机")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(opp, k, v)
    opp.updated_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(opp)
    return to_out(opp)


@router.post("/{opp_id}/review", response_model=OpportunityOut)
def review_opp(opp_id: int, payload: ReviewIn, db: Session = Depends(get_db),
               user: User = Depends(get_current_user)):
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="仅管理员可审核商机")
    if payload.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="审核状态只能是 approved 或 rejected")
    opp = db.get(Opportunity, opp_id)
    if not opp:
        raise HTTPException(status_code=404, detail="商机不存在")
    opp.status = payload.status
    opp.admin_reply = payload.admin_reply
    opp.reviewer_id = user.id
    opp.reviewed_at = datetime.datetime.utcnow()
    db.commit()
    db.refresh(opp)
    return to_out(opp)

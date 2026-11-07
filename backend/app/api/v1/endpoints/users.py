from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Optional
from app.core.security import require_admin, AuthenticatedUser
from app.core.firebase import firebase_manager

router = APIRouter()


class UserItem(BaseModel):
    uid: str
    email: str
    name: str
    role: str
    status: str


class UpdateUserStatusRequest(BaseModel):
    status: str  # "active" or "disabled"


class UpdateUserRoleRequest(BaseModel):
    role: str  # "admin" or "student"


@router.get("", response_model=List[UserItem])
async def list_users(
    role: Optional[str] = Query(None, description="Filter by role ('student' or 'admin')"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    current_admin: AuthenticatedUser = Depends(require_admin)
):
    filters = {}
    if role:
        filters["role"] = role

    all_users = firebase_manager.list_documents("users", filters=filters if filters else None)
    results = []

    for u in all_users:
        name = u.get("name", "")
        email = u.get("email", "")
        if search:
            s = search.lower()
            if s not in name.lower() and s not in email.lower():
                continue
        results.append(UserItem(
            uid=u.get("uid", u.get("id", "")),
            email=email,
            name=name,
            role=u.get("role", "student"),
            status=u.get("status", "active")
        ))
    return results


@router.get("/{uid}", response_model=UserItem)
async def get_user_by_id(uid: str, current_admin: AuthenticatedUser = Depends(require_admin)):
    u = firebase_manager.get_document("users", uid)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")
    return UserItem(
        uid=u.get("uid", uid),
        email=u.get("email", ""),
        name=u.get("name", ""),
        role=u.get("role", "student"),
        status=u.get("status", "active")
    )


@router.patch("/{uid}/status")
async def update_user_status(uid: str, payload: UpdateUserStatusRequest, current_admin: AuthenticatedUser = Depends(require_admin)):
    if payload.status not in ["active", "disabled"]:
        raise HTTPException(status_code=400, detail="Invalid status. Allowed values: 'active', 'disabled'.")

    # Prevent admin from disabling their own account
    if uid == current_admin.uid:
        raise HTTPException(status_code=400, detail="Administrators cannot disable their own account.")

    u = firebase_manager.get_document("users", uid)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    firebase_manager.set_document("users", uid, {"status": payload.status})
    return {"message": f"User account status updated to {payload.status}.", "uid": uid, "status": payload.status}


@router.patch("/{uid}/role")
async def update_user_role(uid: str, payload: UpdateUserRoleRequest, current_admin: AuthenticatedUser = Depends(require_admin)):
    if payload.role not in ["admin", "student"]:
        raise HTTPException(status_code=400, detail="Invalid role. Allowed values: 'admin', 'student'.")

    u = firebase_manager.get_document("users", uid)
    if not u:
        raise HTTPException(status_code=404, detail="User not found")

    firebase_manager.set_document("users", uid, {"role": payload.role})
    return {"message": f"User role updated to {payload.role}.", "uid": uid, "role": payload.role}

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
import os
from app.core.security import get_current_user, AuthenticatedUser
from app.core.firebase import firebase_manager

router = APIRouter()


class SyncUserRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


class UserProfileResponse(BaseModel):
    uid: str
    email: str
    name: str
    role: str
    status: str


class ProvisionAdminRequest(BaseModel):
    secret: str
    target_email: str


@router.get("/me", response_model=UserProfileResponse)
async def get_my_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    return UserProfileResponse(
        uid=current_user.uid,
        email=current_user.email,
        name=current_user.name,
        role=current_user.role,
        status=current_user.status
    )


@router.post("/sync", response_model=UserProfileResponse)
async def sync_user_profile(payload: SyncUserRequest, current_user: AuthenticatedUser = Depends(get_current_user)):
    user_data = firebase_manager.get_document("users", current_user.uid) or {}
    updated = {
        "uid": current_user.uid,
        "email": payload.email or current_user.email,
        "name": payload.name or current_user.name,
        "role": user_data.get("role", current_user.role),
        "status": user_data.get("status", "active")
    }
    firebase_manager.set_document("users", current_user.uid, updated)
    return UserProfileResponse(**updated)


@router.post("/provision-admin")
async def provision_admin(payload: ProvisionAdminRequest):
    """
    Secure server-side administrator provisioning endpoint.
    Protected by ADMIN_SETUP_SECRET from server environment.
    """
    expected_secret = os.environ.get("ADMIN_SETUP_SECRET", "academic-admin-secret-2026")
    if payload.secret != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid administrator provisioning secret."
        )

    # Search user by email
    users = firebase_manager.list_documents("users", filters={"email": payload.target_email})
    if not users:
        # Create user entry placeholder if user hasn't logged in yet
        placeholder_uid = f"admin_{payload.target_email.split('@')[0]}"
        firebase_manager.set_document("users", placeholder_uid, {
            "uid": placeholder_uid,
            "email": payload.target_email,
            "name": "Platform Administrator",
            "role": "admin",
            "status": "active"
        })
        return {"message": f"Administrator profile created for {payload.target_email}", "role": "admin"}

    user = users[0]
    firebase_manager.set_document("users", user["uid"], {"role": "admin"})
    return {"message": f"Successfully promoted {payload.target_email} to administrator role.", "role": "admin"}

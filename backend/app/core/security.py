"""
Authentication and Authorization dependencies enforcing role-based access control.
"""
from typing import Optional, List
from fastapi import Header, HTTPException, status, Depends
from app.core.firebase import firebase_manager


class AuthenticatedUser:
    def __init__(self, uid: str, email: str, name: str, role: str, status: str = "active"):
        self.uid = uid
        self.email = email
        self.name = name
        self.role = role
        self.status = status

    def to_dict(self):
        return {
            "uid": self.uid,
            "email": self.email,
            "name": self.name,
            "role": self.role,
            "status": self.status
        }


async def get_current_user(authorization: Optional[str] = Header(None)) -> AuthenticatedUser:
    """Validate Bearer token from header and return authenticated user."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization Bearer token is required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.split("Bearer ")[1].strip()
    decoded = firebase_manager.verify_token(token)

    if not decoded or "uid" not in decoded:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, or revoked authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    uid = decoded["uid"]
    email = decoded.get("email", "")
    name = decoded.get("name") or decoded.get("displayName") or email.split("@")[0] or "Student"

    # Fetch user profile from Firestore users collection
    user_data = firebase_manager.get_document("users", uid)

    if not user_data:
        # Default registration role is student
        # Admin can only be created via privileged setup or provisioning
        role = "admin" if decoded.get("role") == "admin" else "student"
        user_data = {
            "uid": uid,
            "email": email,
            "name": name,
            "role": role,
            "status": "active",
            "created_at": "2026-10-27T00:00:00Z"
        }
        firebase_manager.set_document("users", uid, user_data)

    user_status = user_data.get("status", "active")
    if user_status == "disabled":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled by an administrator."
        )

    return AuthenticatedUser(
        uid=uid,
        email=user_data.get("email", email),
        name=user_data.get("name", name),
        role=user_data.get("role", "student"),
        status=user_status
    )


def require_role(allowed_roles: List[str]):
    """Enforce that the authenticated user possesses one of the allowed roles."""
    async def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: requires one of {allowed_roles} roles. Your role is '{current_user.role}'."
            )
        return current_user
    return role_checker


# Convenient role dependencies
require_admin = require_role(["admin"])
require_student = require_role(["student", "admin"])

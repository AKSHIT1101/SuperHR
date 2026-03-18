from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Dict, Optional

from core.config import settings
from core.database import DatabaseManager

# ------------------------------------------------------------------ #
#  DB singleton                                                        #
# ------------------------------------------------------------------ #

_db: Optional[DatabaseManager] = None


def get_db() -> DatabaseManager:
    global _db
    if _db is None:
        _db = DatabaseManager()
    return _db


# ------------------------------------------------------------------ #
#  JWT helpers                                                         #
# ------------------------------------------------------------------ #

def create_access_token(data: Dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )


# ------------------------------------------------------------------ #
#  Auth dependency                                                     #
# ------------------------------------------------------------------ #

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: DatabaseManager = Depends(get_db),
) -> Dict:
    payload = decode_token(credentials.credentials)
    user_id = payload.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")

    user = db.get_user_by_id(int(user_id))
    if not user or not user["is_active"]:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    return user


# ------------------------------------------------------------------ #
#  Role guards                                                         #
# ------------------------------------------------------------------ #

def require_admin(current_user: Dict = Depends(get_current_user)) -> Dict:
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_manager_or_above(current_user: Dict = Depends(get_current_user)) -> Dict:
    if current_user["role"] not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Manager or admin access required")
    return current_user
from functools import wraps
from flask import request, g, current_app
from app.services.auth_service import AuthService
from app.repositories.user_repo import UserRepository
from app.utils.errors import AuthenticationException

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # 1. Look for token in Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
        # 2. Fallback to access_token cookie
        if not token:
            token = request.cookies.get("access_token")
            
        if not token:
            raise AuthenticationException("Access token is missing or expired")
            
        try:
            payload = AuthService.verify_access_token(token)
        except AuthenticationException as e:
            current_app.logger.warning(f"require_auth failed for token '{token[:10]}...': {e.message}")
            raise

        sub = payload.get("sub")
        user_id = int(sub) if sub is not None else None

        
        user = UserRepository.get_by_id(user_id)
        if not user or not user.is_active:
            current_app.logger.warning(f"require_auth failed: user_id {user_id} not found or inactive")
            raise AuthenticationException("Active user session could not be established")
            
        g.current_user = user
        return f(*args, **kwargs)
    return decorated



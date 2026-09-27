from flask import request, jsonify, make_response, current_app, g
from flask_smorest import Blueprint
from app.services.auth_service import AuthService
from app.schemas.auth import RegisterRequestSchema, LoginRequestSchema, UserResponseSchema
from app.utils.errors import AuthenticationException

auth_bp = Blueprint("auth", "auth", url_prefix="/api/v1/auth", description="Authentication operations")

def _set_auth_cookies(response, access_token, refresh_token):
    is_dev = current_app.config.get("FLASK_ENV") == "development"
    secure = not is_dev
    
    # Access token HttpOnly cookie
    response.set_cookie(
        "access_token",
        access_token,
        httponly=True,
        secure=secure,
        samesite="Lax",
        path="/",
        max_age=15 * 60 # 15 minutes
    )
    
    # Refresh token HttpOnly cookie
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        secure=secure,
        samesite="Lax",
        path="/",
        max_age=7 * 24 * 60 * 60 # 7 days
    )


def _clear_auth_cookies(response):
    response.set_cookie("access_token", "", httponly=True, path="/", expires=0)
    response.set_cookie("refresh_token", "", httponly=True, path="/", expires=0)


@auth_bp.route("/register", methods=["POST"])
@auth_bp.arguments(RegisterRequestSchema)
@auth_bp.response(201, UserResponseSchema)
def register(data):
    user = AuthService.register(
        email=data["email"],
        password_plain=data["password"],
        first_name=data["first_name"],
        last_name=data["last_name"]
    )
    return user

@auth_bp.route("/login", methods=["POST"])
@auth_bp.arguments(LoginRequestSchema)
def login(data):
    ip = request.remote_addr
    user_agent = request.headers.get("User-Agent")
    
    user, access_token, refresh_token = AuthService.login(
        email=data["email"],
        password_plain=data["password"],
        ip=ip,
        user_agent=user_agent
    )
    
    user_data = UserResponseSchema().dump(user)
    response_payload = {
        "user": user_data,
        "access_token": access_token
    }
    
    response = make_response(jsonify(response_payload), 200)
    _set_auth_cookies(response, access_token, refresh_token)
    return response

@auth_bp.route("/refresh", methods=["POST"])
def refresh():
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        # Fallback to Authorization Header if cookies are disabled
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            refresh_token = auth_header.split(" ")[1]
            
    if not refresh_token:
        raise AuthenticationException("Refresh token is missing")
        
    ip = request.remote_addr
    user_agent = request.headers.get("User-Agent")
    
    new_access_token, new_refresh_token = AuthService.rotate_refresh_token(
        token_str=refresh_token,
        ip=ip,
        user_agent=user_agent
    )
    
    response = make_response(jsonify({"access_token": new_access_token}), 200)
    _set_auth_cookies(response, new_access_token, new_refresh_token)
    return response

@auth_bp.route("/logout", methods=["POST"])
def logout():
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        AuthService.logout(refresh_token)
        
    response = make_response("", 204)
    _clear_auth_cookies(response)
    return response

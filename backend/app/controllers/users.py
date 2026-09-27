from flask import g
from flask_smorest import Blueprint
from app.middleware.auth import require_auth
from app.schemas.auth import UserResponseSchema

from app.repositories.user_repo import UserRepository

users_bp = Blueprint("users", "users", url_prefix="/api/v1/users", description="User operations")

@users_bp.route("", methods=["GET"])
@require_auth
@users_bp.response(200, UserResponseSchema(many=True))
def list_users():
    return UserRepository.list_all()

@users_bp.route("/me", methods=["GET"])
@require_auth
@users_bp.response(200, UserResponseSchema)
def get_me():
    return g.current_user


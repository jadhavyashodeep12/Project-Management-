from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import uuid
import jwt
from flask import current_app
from app.extensions import db
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.repositories.user_repo import UserRepository
from app.utils.errors import AuthenticationException, ConflictException, ValidationException

class AuthService:
    
    @staticmethod
    def generate_access_token(user: User) -> str:
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15),
            "iat": datetime.now(timezone.utc)
        }
        return jwt.encode(payload, current_app.config["JWT_SECRET_KEY"], algorithm="HS256")


    @staticmethod
    def verify_access_token(token: str) -> dict:
        try:
            return jwt.decode(token, current_app.config["JWT_SECRET_KEY"], algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise AuthenticationException("Access token has expired")
        except jwt.InvalidTokenError as e:
            current_app.logger.error(f"PyJWT decode error: {type(e).__name__}: {str(e)}")
            raise AuthenticationException("Invalid access token")



    @classmethod
    def register(cls, email: str, password_plain: str, first_name: str, last_name: str) -> User:
        if UserRepository.get_by_email(email):
            raise ConflictException("Email is already registered")
        
        if len(password_plain) < 8:
            raise ValidationException("Password must be at least 8 characters long")
            
        return UserRepository.create(email, password_plain, first_name, last_name)

    @classmethod
    def login(cls, email: str, password_plain: str, ip: str = None, user_agent: str = None) -> tuple:
        user = UserRepository.get_by_email(email)
        if not user or not user.check_password(password_plain):
            raise AuthenticationException("Invalid email or password")
        
        if not user.is_active:
            raise AuthenticationException("User account is inactive")
            
        user.last_login_at = datetime.now(timezone.utc)
        UserRepository.save(user)

        access_token = cls.generate_access_token(user)
        refresh_token_str = cls._create_refresh_token(user.id, ip, user_agent)
        
        return user, access_token, refresh_token_str

    @classmethod
    def rotate_refresh_token(cls, token_str: str, ip: str = None, user_agent: str = None) -> tuple:
        token_hash = cls._hash_token(token_str)
        token_record = RefreshToken.query.filter_by(token_hash=token_hash).first()
        
        if not token_record:
            raise AuthenticationException("Invalid refresh token")

        # Reuse detection: if the token is already revoked, revoke the entire family
        if token_record.revoked_at is not None:
            cls._revoke_token_family(token_record.family_id)
            db.session.commit()
            raise AuthenticationException("Compromised refresh token used. Revoking active sessions.")

        if token_record.is_expired:
            raise AuthenticationException("Expired refresh token")

        token_record.revoked_at = datetime.now(timezone.utc)
        
        user = UserRepository.get_by_id(token_record.user_id)
        if not user or not user.is_active:
            raise AuthenticationException("User not found or inactive")
            
        new_token_str = secrets.token_hex(32)
        new_token_hash = cls._hash_token(new_token_str)
        
        new_token_record = RefreshToken(
            user_id=user.id,
            token_hash=new_token_hash,
            family_id=token_record.family_id,
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            ip=ip,
            user_agent=user_agent
        )
        db.session.add(new_token_record)
        db.session.flush() # Populate ID for replaced_by relation
        
        token_record.replaced_by = new_token_record.id
        db.session.commit()

        new_access_token = cls.generate_access_token(user)
        return new_access_token, new_token_str

    @classmethod
    def logout(cls, token_str: str) -> None:
        token_hash = cls._hash_token(token_str)
        token_record = RefreshToken.query.filter_by(token_hash=token_hash).first()
        if token_record:
            token_record.revoked_at = datetime.now(timezone.utc)
            db.session.commit()

    @staticmethod
    def _create_refresh_token(user_id: int, ip: str = None, user_agent: str = None) -> str:
        token_str = secrets.token_hex(32)
        token_hash = AuthService._hash_token(token_str)
        
        token_record = RefreshToken(
            user_id=user_id,
            token_hash=token_hash,
            family_id=uuid.uuid4(),
            expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            ip=ip,
            user_agent=user_agent
        )
        db.session.add(token_record)
        db.session.commit()
        return token_str

    @staticmethod
    def _hash_token(token_str: str) -> str:
        return hashlib.sha256(token_str.encode()).hexdigest()

    @staticmethod
    def _revoke_token_family(family_id) -> None:
        db.session.query(RefreshToken).filter_by(family_id=family_id).update({
            "revoked_at": datetime.now(timezone.utc)
        }, synchronize_session=False)

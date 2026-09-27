from app.models.user import User
from app.extensions import db

class UserRepository:
    @staticmethod
    def get_by_id(user_id: int) -> User:
        return User.query_active().filter_by(id=user_id).first()

    @staticmethod
    def get_by_email(email: str) -> User:
        return User.query_active().filter_by(email=email.strip().lower()).first()

    @staticmethod
    def list_all() -> list:
        return User.query_active().order_by(User.first_name.asc()).all()


    @staticmethod
    def create(email: str, password_plain: str, first_name: str, last_name: str) -> User:
        user = User(
            email=email.strip().lower(),
            first_name=first_name.strip(),
            last_name=last_name.strip()
        )
        user.set_password(password_plain)
        db.session.add(user)
        db.session.commit()
        return user

    @staticmethod
    def save(user: User) -> None:
        db.session.add(user)
        db.session.commit()

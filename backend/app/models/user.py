from argon2 import PasswordHasher
from app.models.base import BaseModel
from app.extensions import db

ph = PasswordHasher()

class User(BaseModel):
    __tablename__ = 'users'

    email = db.Column(db.String(255), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    avatar_key = db.Column(db.String(255), nullable=True)
    bio = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    is_email_verified = db.Column(db.Boolean, nullable=False, default=False)
    last_login_at = db.Column(db.DateTime(timezone=True), nullable=True)
    failed_login_count = db.Column(db.SmallInteger, nullable=False, default=0)
    locked_until = db.Column(db.DateTime(timezone=True), nullable=True)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id', ondelete='RESTRICT'), nullable=False, default=3)

    role = db.relationship('Role', foreign_keys=[role_id], backref=db.backref('users', lazy=True))

    def set_password(self, password):
        self.password_hash = ph.hash(password)

    def check_password(self, password):
        try:
            return ph.verify(self.password_hash, password)
        except Exception:
            return False

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def role_code(self):
        if self.role:
            return self.role.code
        if self.role_id == 1:
            return 'admin'
        elif self.role_id == 2:
            return 'project_manager'
        return 'team_member'



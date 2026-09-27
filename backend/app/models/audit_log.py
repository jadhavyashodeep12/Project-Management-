from app.extensions import db
from datetime import datetime, timezone

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    actor_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)  # Nullable for anonymous actions (like login attempts)
    action = db.Column(db.String(100), nullable=False)  # e.g., 'user.login.success', 'project.create'
    resource_type = db.Column(db.String(50), nullable=False)  # e.g., 'user', 'project'
    resource_id = db.Column(db.BigInteger, nullable=True)
    ip_address = db.Column(db.String(45), nullable=True)  # Supports both IPv4 and IPv6
    user_agent = db.Column(db.String(255), nullable=True)
    request_id = db.Column(db.String(64), nullable=True)
    details = db.Column(db.JSON, nullable=True)  # Detailed context of the mutation
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    actor = db.relationship('User', backref=db.backref('audit_logs', lazy=True))

from app.extensions import db
from datetime import datetime, timezone

class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    project_id = db.Column(db.BigInteger, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    actor_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    entity_type = db.Column(db.String(50), nullable=False)  # e.g., 'task', 'comment', 'attachment'
    entity_id = db.Column(db.BigInteger, nullable=False)
    action = db.Column(db.String(50), nullable=False)  # e.g., 'created', 'updated', 'deleted', 'moved'
    changes = db.Column(db.JSON, nullable=True)  # JSON object representing field changes (before/after diff)
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

    # Relationships
    project = db.relationship('Project', backref=db.backref('activities', lazy=True, cascade='all, delete-orphan'))
    actor = db.relationship('User', backref=db.backref('activities', lazy=True))

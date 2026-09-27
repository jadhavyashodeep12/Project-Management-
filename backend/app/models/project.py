from app.extensions import db
from app.models.base import BaseModel
from datetime import datetime, timezone

# Association table for Project Members and their Project-scoped Roles
project_members = db.Table(
    'project_members',
    db.Column('project_id', db.BigInteger, db.ForeignKey('projects.id', ondelete='CASCADE'), primary_key=True),
    db.Column('user_id', db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    db.Column('role_id', db.Integer, db.ForeignKey('roles.id', ondelete='RESTRICT'), nullable=False),
    db.Column('joined_at', db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
)

class Project(BaseModel):
    __tablename__ = 'projects'

    key = db.Column(db.String(10), nullable=False, unique=True)
    name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    owner_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    status = db.Column(db.String(50), nullable=False, default='active')  # 'active', 'archived'
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)

    # Relationships
    owner = db.relationship('User', foreign_keys=[owner_id], backref=db.backref('owned_projects', lazy=True))
    members = db.relationship('User', secondary=project_members, backref=db.backref('projects', lazy=True))

from app.extensions import db
from app.models.base import BaseModel
from datetime import datetime, timezone

# Association table for Team Members
team_members = db.Table(
    'team_members',
    db.Column('team_id', db.BigInteger, db.ForeignKey('teams.id', ondelete='CASCADE'), primary_key=True),
    db.Column('user_id', db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
    db.Column('joined_at', db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
)

class Team(BaseModel):
    __tablename__ = 'teams'

    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    project_id = db.Column(db.BigInteger, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    lead_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)

    # Relationships
    project = db.relationship('Project', backref=db.backref('teams', lazy=True))
    lead = db.relationship('User', foreign_keys=[lead_id], backref=db.backref('led_teams', lazy=True))
    members = db.relationship('User', secondary=team_members, backref=db.backref('teams_membership', lazy=True))

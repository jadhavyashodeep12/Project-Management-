from app.extensions import db
from app.models.base import BaseModel

class Sprint(BaseModel):
    __tablename__ = 'sprints'

    project_id = db.Column(db.BigInteger, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    goal = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), nullable=False, default='planned')  # 'planned', 'active', 'completed'
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)

    # Relationships
    project = db.relationship('Project', backref=db.backref('sprints', lazy=True))

from app.extensions import db
from app.models.base import BaseModel

class SavedFilter(BaseModel):
    __tablename__ = 'saved_filters'

    user_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    filter_json = db.Column(db.JSON, nullable=False)  # stores key-value filter parameters (e.g. status, assignee)
    is_default = db.Column(db.Boolean, nullable=False, default=False)

    # Relationships
    user = db.relationship('User', backref=db.backref('saved_filters', lazy=True, cascade='all, delete-orphan'))

from app.extensions import db
from app.models.base import BaseModel
from datetime import datetime, timezone

class Comment(BaseModel):
    __tablename__ = 'comments'

    task_id = db.Column(db.BigInteger, db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    author_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    body = db.Column(db.Text, nullable=False)
    parent_id = db.Column(db.BigInteger, db.ForeignKey('comments.id', ondelete='CASCADE'), nullable=True)
    mentions = db.Column(db.JSON, nullable=True)  # stores list of user IDs mentioned
    edited_at = db.Column(db.DateTime(timezone=True), nullable=True)

    # Relationships
    task = db.relationship('Task', backref=db.backref('comments', lazy=True, cascade='all, delete-orphan'))
    author = db.relationship('User', backref=db.backref('comments', lazy=True))
    
    # Self-referencing relationship for threaded replies (parent -> replies)
    parent = db.relationship('Comment', remote_side='Comment.id', backref=db.backref('replies', lazy=True, cascade='all, delete-orphan'))

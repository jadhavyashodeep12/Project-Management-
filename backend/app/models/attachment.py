from app.extensions import db
from app.models.base import BaseModel

class Attachment(BaseModel):
    __tablename__ = 'attachments'

    task_id = db.Column(db.BigInteger, db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=False)
    uploader_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    original_name = db.Column(db.String(255), nullable=False)
    storage_key = db.Column(db.String(255), nullable=False)
    content_type = db.Column(db.String(100), nullable=False)
    size_bytes = db.Column(db.BigInteger, nullable=False)
    thumbnail_key = db.Column(db.String(255), nullable=True)

    # Relationships
    task = db.relationship('Task', backref=db.backref('attachments', lazy=True, cascade='all, delete-orphan'))
    uploader = db.relationship('User', backref=db.backref('attachments', lazy=True))

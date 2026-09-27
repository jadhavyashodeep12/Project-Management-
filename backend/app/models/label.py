from app.extensions import db
from app.models.base import BaseModel

# Association table for Task and Label relationship
task_labels = db.Table(
    'task_labels',
    db.Column('task_id', db.BigInteger, db.ForeignKey('tasks.id', ondelete='CASCADE'), primary_key=True),
    db.Column('label_id', db.BigInteger, db.ForeignKey('labels.id', ondelete='CASCADE'), primary_key=True)
)

class Label(BaseModel):
    __tablename__ = 'labels'

    project_id = db.Column(db.BigInteger, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(50), nullable=False)
    color = db.Column(db.String(20), nullable=True)

    # Relationships
    project = db.relationship('Project', backref=db.backref('labels', lazy=True))
    tasks = db.relationship('Task', secondary=task_labels, backref=db.backref('labels', lazy=True))

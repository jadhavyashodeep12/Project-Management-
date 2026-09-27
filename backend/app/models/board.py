from app.extensions import db
from app.models.base import BaseModel

class Board(BaseModel):
    __tablename__ = 'boards'

    project_id = db.Column(db.BigInteger, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(100), nullable=False, default='Board')
    is_default = db.Column(db.Boolean, nullable=False, default=False)

    # Relationships
    project = db.relationship('Project', backref=db.backref('boards', lazy=True))
    columns = db.relationship('Column', back_populates='board', order_by='Column.position', cascade='all, delete-orphan')

class Column(BaseModel):
    __tablename__ = 'columns'

    board_id = db.Column(db.BigInteger, db.ForeignKey('boards.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    position = db.Column(db.Integer, nullable=False)
    wip_limit = db.Column(db.SmallInteger, nullable=True)
    color = db.Column(db.String(20), nullable=True)

    # Relationships
    board = db.relationship('Board', back_populates='columns')

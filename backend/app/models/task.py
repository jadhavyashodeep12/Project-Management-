from app.extensions import db
from app.models.base import BaseModel

# Association table for extra Task Assignees (in case of multiple assignees)
task_assignees = db.Table(
    'task_assignees',
    db.Column('task_id', db.BigInteger, db.ForeignKey('tasks.id', ondelete='CASCADE'), primary_key=True),
    db.Column('user_id', db.BigInteger, db.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True)
)

class Task(BaseModel):
    __tablename__ = 'tasks'

    project_id = db.Column(db.BigInteger, db.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False)
    key = db.Column(db.String(20), nullable=False, unique=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(50), nullable=False, default='todo')  # 'todo', 'in_progress', 'in_review', 'done'
    priority = db.Column(db.String(50), nullable=False, default='medium')  # 'low', 'medium', 'high', 'urgent'
    type = db.Column(db.String(50), nullable=False, default='task')  # 'task', 'bug', 'story', 'epic'
    story_points = db.Column(db.Numeric(4, 1), nullable=True)
    due_date = db.Column(db.DateTime(timezone=True), nullable=True)
    estimate_hours = db.Column(db.Numeric(6, 2), nullable=True)
    column_id = db.Column(db.BigInteger, db.ForeignKey('columns.id', ondelete='SET NULL'), nullable=True)
    board_position = db.Column(db.Integer, nullable=True)
    sprint_id = db.Column(db.BigInteger, db.ForeignKey('sprints.id', ondelete='SET NULL'), nullable=True)
    parent_id = db.Column(db.BigInteger, db.ForeignKey('tasks.id', ondelete='CASCADE'), nullable=True)
    creator_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='RESTRICT'), nullable=False)
    assignee_id = db.Column(db.BigInteger, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True)
    order_index = db.Column(db.Integer, nullable=False, default=0)

    # Relationships
    project = db.relationship('Project', backref=db.backref('tasks', lazy=True))
    column = db.relationship('Column', backref=db.backref('tasks', lazy=True))
    sprint = db.relationship('Sprint', backref=db.backref('tasks', lazy=True))
    creator = db.relationship('User', foreign_keys=[creator_id], backref=db.backref('created_tasks', lazy=True))
    assignee = db.relationship('User', foreign_keys=[assignee_id], backref=db.backref('assigned_tasks', lazy=True))
    
    # Self-referencing relationship for sub-tasks (parent -> child)
    parent = db.relationship('Task', remote_side='Task.id', backref=db.backref('subtasks', lazy=True, cascade='all, delete-orphan'))
    
    # Extra assignees relationship
    extra_assignees = db.relationship('User', secondary=task_assignees, backref=db.backref('extra_assigned_tasks', lazy=True))

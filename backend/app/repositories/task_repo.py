from datetime import datetime, timezone
from app.models.task import Task
from app.extensions import db

class TaskRepository:
    @staticmethod
    def create(
        project_id: int,
        key: str,
        title: str,
        creator_id: int,
        description: str = None,
        priority: str = "medium",
        type: str = "task",
        column_id: int = None,
        assignee_id: int = None,
        due_date = None,
        story_points = None
    ) -> Task:
        task = Task(
            project_id=project_id,
            key=key,
            title=title.strip(),
            description=description.strip() if description else None,
            priority=priority,
            type=type,
            column_id=column_id,
            creator_id=creator_id,
            assignee_id=assignee_id,
            due_date=due_date,
            story_points=story_points,
            status="todo"
        )
        db.session.add(task)
        db.session.commit()
        return task

    @staticmethod
    def get_by_id(task_id: int) -> Task:
        return Task.query_active().filter_by(id=task_id).first()

    @staticmethod
    def list_for_project(project_id: int) -> list:
        return (
            Task.query_active()
            .filter_by(project_id=project_id)
            .order_by(Task.created_at.desc())
            .all()
        )

    @staticmethod
    def count_by_project(project_id: int) -> int:
        return Task.query.filter_by(project_id=project_id).count()

    @staticmethod
    def save(task: Task) -> Task:
        db.session.add(task)
        db.session.commit()
        return task

    @staticmethod
    def delete(task: Task) -> None:
        task.deleted_at = datetime.now(timezone.utc)
        db.session.commit()

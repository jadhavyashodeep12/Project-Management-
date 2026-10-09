from flask import g
from flask_smorest import Blueprint
from app.middleware.auth import require_auth, require_project_access, require_project_manager_access
from app.services.task_service import TaskService
from app.schemas.task import (
    TaskResponseSchema,
    TaskCreateRequestSchema,
    TaskUpdateRequestSchema
)

tasks_bp = Blueprint("tasks", "tasks", url_prefix="/api/v1", description="Task operations")

@tasks_bp.route("/projects/<int:project_id>/tasks", methods=["GET"])
@require_auth
@require_project_access()
@tasks_bp.response(200, TaskResponseSchema(many=True))
def list_project_tasks(project_id):
    return TaskService.list_tasks_for_project(project_id, g.current_user.id)


@tasks_bp.route("/projects/<int:project_id>/tasks", methods=["POST"])
@require_auth
@require_project_manager_access()
@tasks_bp.arguments(TaskCreateRequestSchema)
@tasks_bp.response(201, TaskResponseSchema)
def create_task(data, project_id):

    return TaskService.create_task(
        project_id=project_id,
        title=data["title"],
        creator_id=g.current_user.id,
        description=data.get("description"),
        priority=data.get("priority", "medium"),
        type=data.get("type", "task"),
        column_id=data.get("column_id"),
        assignee_id=data.get("assignee_id"),
        due_date=data.get("due_date"),
        story_points=data.get("story_points")
    )

@tasks_bp.route("/tasks/<int:task_id>", methods=["GET"])
@require_auth
@tasks_bp.response(200, TaskResponseSchema)
def get_task(task_id):
    return TaskService.get_task(task_id)

@tasks_bp.route("/tasks/<int:task_id>", methods=["PATCH"])
@require_auth
@tasks_bp.arguments(TaskUpdateRequestSchema)
@tasks_bp.response(200, TaskResponseSchema)
def update_task(data, task_id):
    return TaskService.update_task(
        task_id=task_id,
        data=data,
        current_user_id=g.current_user.id
    )

@tasks_bp.route("/tasks/<int:task_id>", methods=["DELETE"])
@require_auth
def delete_task(task_id):
    TaskService.delete_task(task_id, g.current_user.id)
    return "", 204

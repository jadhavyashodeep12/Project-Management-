from flask import g
from flask_smorest import Blueprint
from app.middleware.auth import require_auth
from app.services.project_service import ProjectService
from app.schemas.project import (
    ProjectResponseSchema,
    ProjectCreateRequestSchema,
    ProjectUpdateRequestSchema,
    AddMemberRequestSchema,
    ProjectMemberResponseSchema
)
from app.schemas.auth import UserResponseSchema
from app.repositories.project_repo import ProjectRepository


projects_bp = Blueprint("projects", "projects", url_prefix="/api/v1/projects", description="Project operations")

@projects_bp.route("", methods=["GET"])
@require_auth
@projects_bp.response(200, ProjectResponseSchema(many=True))
def list_projects():
    # Returns all projects the current user belongs to (as owner or member)
    return ProjectService.list_projects(g.current_user.id)

@projects_bp.route("", methods=["POST"])
@require_auth
@projects_bp.arguments(ProjectCreateRequestSchema)
@projects_bp.response(201, ProjectResponseSchema)
def create_project(data):
    return ProjectService.create_project(
        key=data["key"],
        name=data["name"],
        description=data.get("description"),
        owner_id=g.current_user.id,
        start_date=data.get("start_date"),
        end_date=data.get("end_date")
    )

@projects_bp.route("/<int:project_id>", methods=["GET"])
@require_auth
@projects_bp.response(200, ProjectResponseSchema)
def get_project(project_id):
    return ProjectService.get_project(project_id)

@projects_bp.route("/<int:project_id>", methods=["PATCH"])
@require_auth
@projects_bp.arguments(ProjectUpdateRequestSchema)
@projects_bp.response(200, ProjectResponseSchema)
def update_project(data, project_id):
    # Retrieve current project
    project = ProjectService.get_project(project_id)
    
    # Simple check: only owner can edit metadata
    from app.utils.errors import AuthorizationException
    if project.owner_id != g.current_user.id:
        raise AuthorizationException("Only the project owner can update project settings")
        
    for field in ["name", "description", "status", "start_date", "end_date"]:
        if field in data:
            setattr(project, field, data[field])
            
    from app.repositories.project_repo import ProjectRepository
    ProjectRepository.save(project)
    return project

@projects_bp.route("/<int:project_id>/members", methods=["GET"])
@require_auth
@projects_bp.response(200, ProjectMemberResponseSchema(many=True))
def list_members(project_id):
    ProjectService.get_project(project_id)
    return ProjectRepository.list_members_with_roles(project_id)


@projects_bp.route("/<int:project_id>/members", methods=["POST"])
@require_auth
@projects_bp.arguments(AddMemberRequestSchema)
def add_member(data, project_id):
    ProjectService.add_project_member(
        project_id=project_id,
        user_id=data["user_id"],
        role_id=data["role_id"],
        current_user_id=g.current_user.id
    )
    return {"message": "Member added successfully"}, 200

@projects_bp.route("/<int:project_id>/members/<int:user_id>", methods=["DELETE"])
@require_auth
def remove_member(project_id, user_id):
    ProjectService.remove_project_member(
        project_id=project_id,
        user_id=user_id,
        current_user_id=g.current_user.id
    )
    return "", 204

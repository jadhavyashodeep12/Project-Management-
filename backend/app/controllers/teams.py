from flask import g
from flask_smorest import Blueprint
from app.middleware.auth import require_auth
from app.services.team_service import TeamService
from app.schemas.team import (
    TeamResponseSchema,
    TeamCreateRequestSchema,
    TeamUpdateRequestSchema,
    TeamMemberRequestSchema
)
from app.schemas.auth import UserResponseSchema

teams_bp = Blueprint("teams", "teams", url_prefix="/api/v1/teams", description="Team operations")

@teams_bp.route("/project/<int:project_id>", methods=["GET"])
@require_auth
@teams_bp.response(200, TeamResponseSchema(many=True))
def list_project_teams(project_id):
    return TeamService.list_teams_for_project(project_id)

@teams_bp.route("", methods=["POST"])
@require_auth
@teams_bp.arguments(TeamCreateRequestSchema)
@teams_bp.response(201, TeamResponseSchema)
def create_team(data):
    return TeamService.create_team(
        name=data["name"],
        description=data.get("description"),
        project_id=data["project_id"],
        lead_id=data.get("lead_id"),
        current_user_id=g.current_user.id
    )

@teams_bp.route("/<int:team_id>", methods=["GET"])
@require_auth
@teams_bp.response(200, TeamResponseSchema)
def get_team(team_id):
    return TeamService.get_team(team_id)

@teams_bp.route("/<int:team_id>", methods=["PATCH"])
@require_auth
@teams_bp.arguments(TeamUpdateRequestSchema)
@teams_bp.response(200, TeamResponseSchema)
def update_team(data, team_id):
    team = TeamService.get_team(team_id)
    
    # Simple check: project owner or team lead can update team info
    from app.repositories.project_repo import ProjectRepository
    from app.utils.errors import AuthorizationException
    project = ProjectRepository.get_by_id(team.project_id)
    if g.current_user.id != project.owner_id:
        raise AuthorizationException("Only the project owner can update team settings and change team lead")


    for field in ["name", "description", "lead_id"]:
        if field in data:
            setattr(team, field, data[field])

    # If lead changes, automatically add new lead to members
    if "lead_id" in data and data["lead_id"]:
        from app.repositories.team_repo import TeamRepository
        TeamRepository.add_member(team_id, data["lead_id"])

    from app.repositories.team_repo import TeamRepository
    TeamRepository.save(team)
    return team

@teams_bp.route("/<int:team_id>/members", methods=["GET"])
@require_auth
@teams_bp.response(200, UserResponseSchema(many=True))
def list_team_members(team_id):
    team = TeamService.get_team(team_id)
    return team.members

@teams_bp.route("/<int:team_id>/members", methods=["POST"])
@require_auth
@teams_bp.arguments(TeamMemberRequestSchema)
def add_member(data, team_id):
    TeamService.add_team_member(
        team_id=team_id,
        user_id=data["user_id"],
        current_user_id=g.current_user.id
    )
    return {"message": "Member added to team successfully"}, 200

@teams_bp.route("/<int:team_id>/members/<int:user_id>", methods=["DELETE"])
@require_auth
def remove_member(team_id, user_id):
    TeamService.remove_team_member(
        team_id=team_id,
        user_id=user_id,
        current_user_id=g.current_user.id
    )
    return "", 204

@teams_bp.route("/<int:team_id>", methods=["DELETE"])
@require_auth
def delete_team(team_id):
    TeamService.delete_team(team_id=team_id, current_user_id=g.current_user.id)
    return "", 204


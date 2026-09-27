from app.repositories.team_repo import TeamRepository
from app.repositories.project_repo import ProjectRepository
from app.utils.errors import NotFoundException, AuthorizationException, ConflictException
from app.extensions import db

class TeamService:
    @staticmethod
    def get_team(team_id: int):
        team = TeamRepository.get_by_id(team_id)
        if not team:
            raise NotFoundException("Team not found")
        return team

    @staticmethod
    def list_teams_for_project(project_id: int):
        return TeamRepository.list_for_project(project_id)

    @staticmethod
    def list_user_teams(user_id: int):
        return TeamRepository.list_for_user(user_id)

    @staticmethod
    def create_team(name: str, description: str, project_id: int, lead_id: int, current_user_id: int):
        project = ProjectRepository.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project not found")

        # Authorization: only project owner can create teams for a project
        is_owner = (project.owner_id == current_user_id)

        if not is_owner:
            raise AuthorizationException("Only the project owner can create new teams for this project")


        team = TeamRepository.create(
            name=name,
            description=description,
            project_id=project_id,
            lead_id=lead_id
        )

        # Automatically add the team lead as a member of the team
        if lead_id:
            TeamRepository.add_member(team.id, lead_id)

        return team

    @staticmethod
    def add_team_member(team_id: int, user_id: int, current_user_id: int):
        team = TeamRepository.get_by_id(team_id)
        if not team:
            raise NotFoundException("Team not found")

        project = ProjectRepository.get_by_id(team.project_id)
        
        # Authorization: only project owner or team lead can manage members
        if current_user_id != project.owner_id and current_user_id != team.lead_id:
            raise AuthorizationException("Only project owners or team leads can manage members")

        TeamRepository.add_member(team_id, user_id)

    @staticmethod
    def remove_team_member(team_id: int, user_id: int, current_user_id: int):
        team = TeamRepository.get_by_id(team_id)
        if not team:
            raise NotFoundException("Team not found")

        project = ProjectRepository.get_by_id(team.project_id)

        if current_user_id != project.owner_id and current_user_id != team.lead_id:
            raise AuthorizationException("Only project owners or team leads can manage members")

        TeamRepository.remove_member(team_id, user_id)

    @staticmethod
    def delete_team(team_id: int, current_user_id: int):
        team = TeamRepository.get_by_id(team_id)
        if not team:
            raise NotFoundException("Team not found")

        project = ProjectRepository.get_by_id(team.project_id)
        if current_user_id != project.owner_id:
            raise AuthorizationException("Only the project owner can delete teams from this project")

        TeamRepository.delete(team)


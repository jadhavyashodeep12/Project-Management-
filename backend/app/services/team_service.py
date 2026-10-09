from app.repositories.team_repo import TeamRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.user_repo import UserRepository
from app.models.project import Project, project_members
from app.utils.errors import NotFoundException, AuthorizationException, ConflictException
from app.extensions import db
from sqlalchemy import and_

class TeamService:
    @staticmethod
    def get_team(team_id: int):
        team = TeamRepository.get_by_id(team_id)
        if not team:
            raise NotFoundException("Team not found")
        return team

    @staticmethod
    def list_teams_for_project(project_id: int, current_user_id: int = None):
        if not current_user_id:
            return TeamRepository.list_for_project(project_id)

        user = UserRepository.get_by_id(current_user_id)
        project = ProjectRepository.get_by_id(project_id)
        if not user or not project:
            return TeamRepository.list_for_project(project_id)

        is_admin = (user.role_code == 'admin')
        is_pm = (user.role_code == 'project_manager' and (project.manager_id == current_user_id or project.owner_id == current_user_id))

        if is_admin or is_pm:
            return TeamRepository.list_for_project(project_id)

        # Team members only see teams they are added to
        all_teams = TeamRepository.list_for_project(project_id)
        return [t for t in all_teams if any(m.id == current_user_id for m in t.members) or t.lead_id == current_user_id]

    @staticmethod
    def list_user_teams(user_id: int):
        return TeamRepository.list_for_user(user_id)

    @staticmethod
    def _verify_project_manager_authorization(project_id: int, current_user_id: int):
        user = UserRepository.get_by_id(current_user_id)
        if not user:
            raise AuthorizationException("User not found")
        if user.role_code == 'admin':
            raise AuthorizationException("Admin cannot create or manage teams. Only assigned Project Managers can manage teams.")
        project = ProjectRepository.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project not found")
        is_manager = (project.manager_id == current_user_id or project.owner_id == current_user_id)
        if not (user.role_code == 'project_manager' and is_manager):
            raise AuthorizationException("Only the assigned Project Manager can manage teams for this project")
        return True

    @staticmethod
    def create_team(name: str, description: str, project_id: int, lead_id: int, current_user_id: int):
        # Rule 4: Validate caller is assigned PM or Admin for project_id
        TeamService._verify_project_manager_authorization(project_id, current_user_id)

        team = TeamRepository.create(
            name=name,
            description=description,
            project_id=project_id,
            lead_id=lead_id
        )

        if lead_id:
            TeamService.add_team_member(team.id, lead_id, current_user_id)

        return team

    @staticmethod
    def add_team_member(team_id: int, user_id: int, current_user_id: int):
        team = TeamRepository.get_by_id(team_id)
        if not team:
            raise NotFoundException("Team not found")

        # Rule 4: Validate caller is assigned PM or Admin for team.project_id
        TeamService._verify_project_manager_authorization(team.project_id, current_user_id)

        target_user = UserRepository.get_by_id(user_id)
        if not target_user:
            raise NotFoundException("Target user not found")

        # Rule 1: Project Manager cannot be a Team Member elsewhere
        is_pm = Project.query_active().filter(
            (Project.manager_id == user_id) |
            ((Project.owner_id == user_id) & (target_user.role_id == 2))
        ).first()
        if is_pm or target_user.role_code == 'project_manager':
            raise ConflictException("A Project Manager cannot be added as a Team Member.")

        # Rule 2: One member = one team per project
        project_teams = TeamRepository.list_for_project(team.project_id)
        for pt in project_teams:
            if pt.id != team_id and any(m.id == user_id for m in pt.members):
                raise ConflictException("Selected user is already part of a team in this project.")

        # Rule 3: Maximum 2 projects per member (only active projects)
        user_existing_teams = TeamRepository.list_for_user(user_id)
        user_project_ids = set(t.project_id for t in user_existing_teams)

        pm_stmt = (
            db.select(project_members.c.project_id)
            .join(Project, Project.id == project_members.c.project_id)
            .where(and_(project_members.c.user_id == user_id, Project.deleted_at.is_(None)))
        )
        pm_project_ids = db.session.execute(pm_stmt).scalars().all()
        user_project_ids.update(pm_project_ids)

        if team.project_id not in user_project_ids and len(user_project_ids) >= 2:
            raise ConflictException("Selected user is already part of 2 projects.")

        TeamRepository.add_member(team_id, user_id)
        # Ensure user is also registered as a member of the project roster
        target_role_id = target_user.role_id if target_user.role_id else 3
        ProjectRepository.add_member(team.project_id, user_id, role_id=target_role_id)

    @staticmethod
    def remove_team_member(team_id: int, user_id: int, current_user_id: int):
        team = TeamRepository.get_by_id(team_id)
        if not team:
            raise NotFoundException("Team not found")

        TeamService._verify_project_manager_authorization(team.project_id, current_user_id)
        TeamRepository.remove_member(team_id, user_id)
        ProjectRepository.remove_member(team.project_id, user_id)

    @staticmethod
    def update_team(team_id: int, name: str = None, description: str = None, lead_id: int = None, current_user_id: int = None):
        team = TeamRepository.get_by_id(team_id)
        if not team:
            raise NotFoundException("Team not found")

        TeamService._verify_project_manager_authorization(team.project_id, current_user_id)

        if name is not None:
            team.name = name.strip()
        if description is not None:
            team.description = description.strip() if description else None
        if lead_id is not None:
            team.lead_id = lead_id
            if lead_id:
                TeamService.add_team_member(team.id, lead_id, current_user_id)

        TeamRepository.save(team)
        return team

    @staticmethod
    def delete_team(team_id: int, current_user_id: int):
        team = TeamRepository.get_by_id(team_id)
        if not team:
            raise NotFoundException("Team not found")

        TeamService._verify_project_manager_authorization(team.project_id, current_user_id)
        for member in list(team.members):
            ProjectRepository.remove_member(team.project_id, member.id)
        TeamRepository.delete(team)



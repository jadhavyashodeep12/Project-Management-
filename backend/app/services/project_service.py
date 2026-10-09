from app.repositories.project_repo import ProjectRepository
from app.models.board import Board, Column
from app.models.role import Role
from app.models.project import Project, project_members
from app.extensions import db
from app.utils.errors import ConflictException, NotFoundException, AuthorizationException
from sqlalchemy import and_

class ProjectService:
    @staticmethod
    def get_project(project_id: int):
        project = ProjectRepository.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project not found")
        return project

    @staticmethod
    def list_projects(user_id: int):
        from app.repositories.user_repo import UserRepository
        user = UserRepository.get_by_id(user_id)
        if user and user.role_code == 'admin':
            return ProjectRepository.list_all()
        return ProjectRepository.list_for_user(user_id)

    @staticmethod
    def create_project(key: str, name: str, description: str, owner_id: int, manager_id: int = None, start_date=None, end_date=None):
        # 1. Validate key uniqueness
        if ProjectRepository.get_by_key(key):
            raise ConflictException("Project key is already in use")

        # Validate manager if provided
        if manager_id:
            from app.repositories.user_repo import UserRepository
            mgr = UserRepository.get_by_id(manager_id)
            if not mgr:
                raise NotFoundException("Assigned Project Manager not found")
            # Upgrade user system role to project_manager if needed
            if mgr.role_code == 'team_member':
                mgr.role_id = 2
                UserRepository.save(mgr)

        # 2. Create the project
        project = ProjectRepository.create(
            key=key,
            name=name,
            description=description,
            owner_id=owner_id,
            manager_id=manager_id,
            start_date=start_date,
            end_date=end_date
        )

        try:
            # 3. Create a default Board for the project
            board = Board(project_id=project.id, name="Default Board", is_default=True)
            db.session.add(board)
            db.session.flush()

            # 4. Create default Columns for this board
            columns = [
                Column(board_id=board.id, name="To Do", position=0, color="#6b7280"),
                Column(board_id=board.id, name="In Progress", position=1, color="#3b82f6"),
                Column(board_id=board.id, name="In Review", position=2, color="#a855f7"),
                Column(board_id=board.id, name="Done", position=3, color="#22c55e")
            ]
            db.session.add_all(columns)

            # 5. Add owner/manager to project_members
            admin_role = Role.query.filter_by(code='admin').first()
            admin_role_id = admin_role.id if admin_role else 1
            
            ProjectRepository.add_member(
                project_id=project.id,
                user_id=owner_id,
                role_id=admin_role_id
            )

            if manager_id and manager_id != owner_id:
                pm_role = Role.query.filter_by(code='project_manager').first()
                ProjectRepository.add_member(
                    project_id=project.id,
                    user_id=manager_id,
                    role_id=pm_role.id if pm_role else 2
                )
            
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            raise e

        return project

    @staticmethod
    def assign_or_replace_manager(project_id: int, manager_id: int, current_user_id: int):
        project = ProjectService.get_project(project_id)
        
        from app.repositories.user_repo import UserRepository
        current_user = UserRepository.get_by_id(current_user_id)
        if not current_user or current_user.role_code != 'admin':
            raise AuthorizationException("Only System Admin can assign or replace a Project Manager")

        if manager_id:
            new_mgr = UserRepository.get_by_id(manager_id)
            if not new_mgr:
                raise NotFoundException("Target Project Manager user not found")
            
            # Rule 1 Check: Ensure new manager is not a Team Member elsewhere
            # If they are currently a team member elsewhere, promote them to project_manager role
            if new_mgr.role_code == 'team_member':
                new_mgr.role_id = 2
                UserRepository.save(new_mgr)

            project.manager_id = manager_id
            # Also add to project_members if not present
            ProjectRepository.add_member(project.id, manager_id, role_id=2)
        else:
            # Remove current PM assignment (Rule 5: leaves teams and tasks intact)
            project.manager_id = None

        ProjectRepository.save(project)
        return project

    @staticmethod
    def delete_project(project_id: int, current_user_id: int):
        project = ProjectService.get_project(project_id)
        
        from app.repositories.user_repo import UserRepository
        current_user = UserRepository.get_by_id(current_user_id)
        if not current_user or current_user.role_code != 'admin':
            raise AuthorizationException("Only System Admin can delete projects")

        ProjectRepository.delete(project)

    @staticmethod
    def add_project_member(project_id: int, user_id: int, role_id: int, current_user_id: int):
        project = ProjectRepository.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project not found")

        from app.repositories.user_repo import UserRepository
        current_user = UserRepository.get_by_id(current_user_id)
        if current_user.role_code == 'admin':
            raise AuthorizationException("Admin cannot add members. Only assigned Project Managers can manage members.")
        if project.manager_id != current_user_id and project.owner_id != current_user_id:
            raise AuthorizationException("Only assigned Project Manager can manage members")

        # Rule: A member can be part of maximum 2 projects
        from app.repositories.team_repo import TeamRepository
        user_existing_teams = TeamRepository.list_for_user(user_id)
        user_project_ids = set(t.project_id for t in user_existing_teams)

        pm_stmt = (
            db.select(project_members.c.project_id)
            .join(Project, Project.id == project_members.c.project_id)
            .where(and_(project_members.c.user_id == user_id, Project.deleted_at.is_(None)))
        )
        pm_project_ids = db.session.execute(pm_stmt).scalars().all()
        user_project_ids.update(pm_project_ids)

        if project_id not in user_project_ids and len(user_project_ids) >= 2:
            raise ConflictException("Selected user is already part of 2 projects.")

        ProjectRepository.add_member(project_id, user_id, role_id)

    @staticmethod
    def remove_project_member(project_id: int, user_id: int, current_user_id: int):
        project = ProjectRepository.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project not found")

        from app.repositories.user_repo import UserRepository
        current_user = UserRepository.get_by_id(current_user_id)
        if current_user.role_code == 'admin':
            raise AuthorizationException("Admin cannot remove members. Only assigned Project Managers can manage members.")
        if project.manager_id != current_user_id and project.owner_id != current_user_id:
            raise AuthorizationException("Only assigned Project Manager can manage members")

        if user_id == project.owner_id or user_id == project.manager_id:
            raise ConflictException("Cannot remove the project owner/manager from project members list")

        ProjectRepository.remove_member(project_id, user_id)


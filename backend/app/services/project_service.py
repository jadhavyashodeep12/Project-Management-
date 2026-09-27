from app.repositories.project_repo import ProjectRepository
from app.models.board import Board, Column
from app.models.role import Role
from app.extensions import db
from app.utils.errors import ConflictException, NotFoundException, AuthorizationException

class ProjectService:
    @staticmethod
    def get_project(project_id: int):
        project = ProjectRepository.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project not found")
        return project

    @staticmethod
    def list_projects(user_id: int):
        return ProjectRepository.list_for_user(user_id)

    @staticmethod
    def create_project(key: str, name: str, description: str, owner_id: int, start_date=None, end_date=None):
        # 1. Validate key uniqueness
        if ProjectRepository.get_by_key(key):
            raise ConflictException("Project key is already in use")

        # 2. Create the project
        project = ProjectRepository.create(
            key=key,
            name=name,
            description=description,
            owner_id=owner_id,
            start_date=start_date,
            end_date=end_date
        )

        try:
            # 3. Create a default Board for the project
            board = Board(project_id=project.id, name="Default Board", is_default=True)
            db.session.add(board)
            db.session.flush()  # Flushes session to database to assign the board ID for columns

            # 4. Create default Columns for this board
            columns = [
                Column(board_id=board.id, name="To Do", position=0, color="#6b7280"),
                Column(board_id=board.id, name="In Progress", position=1, color="#3b82f6"),
                Column(board_id=board.id, name="In Review", position=2, color="#a855f7"),
                Column(board_id=board.id, name="Done", position=3, color="#22c55e")
            ]
            db.session.add_all(columns)

            # 5. Add owner to project_members with the 'admin' role
            admin_role = Role.query.filter_by(code='admin').first()
            admin_role_id = admin_role.id if admin_role else 1  # Fallback if roles seed hasn't run yet
            
            ProjectRepository.add_member(
                project_id=project.id,
                user_id=owner_id,
                role_id=admin_role_id
            )
            
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            raise e

        return project

    @staticmethod
    def add_project_member(project_id: int, user_id: int, role_id: int, current_user_id: int):
        project = ProjectRepository.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project not found")

        # Basic Authorization check (only owner can add members)
        if project.owner_id != current_user_id:
            raise AuthorizationException("Only the project owner can manage members")

        ProjectRepository.add_member(project_id, user_id, role_id)

    @staticmethod
    def remove_project_member(project_id: int, user_id: int, current_user_id: int):
        project = ProjectRepository.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project not found")

        # Basic Authorization check (only owner can remove members)
        if project.owner_id != current_user_id:
            raise AuthorizationException("Only the project owner can manage members")

        if user_id == project.owner_id:
            raise ConflictException("Cannot remove the project owner from the project")

        ProjectRepository.remove_member(project_id, user_id)

from app.models.project import Project, project_members
from app.models.user import User
from app.models.role import Role
from app.extensions import db
from sqlalchemy import and_


class ProjectRepository:
    @staticmethod
    def get_by_id(project_id: int) -> Project:
        return Project.query_active().filter_by(id=project_id).first()

    @staticmethod
    def get_by_key(key: str) -> Project:
        return Project.query_active().filter_by(key=key.upper()).first()

    @staticmethod
    def list_for_user(user_id: int) -> list[Project]:
        # Returns projects where the user is either the owner OR a member
        return Project.query_active().filter(
            (Project.owner_id == user_id) |
            (Project.members.any(id=user_id))
        ).all()

    @staticmethod
    def create(key: str, name: str, description: str, owner_id: int, start_date=None, end_date=None) -> Project:
        project = Project(
            key=key.strip().upper(),
            name=name.strip(),
            description=description.strip() if description else None,
            owner_id=owner_id,
            start_date=start_date,
            end_date=end_date
        )
        db.session.add(project)
        db.session.commit()
        return project

    @staticmethod
    def add_member(project_id: int, user_id: int, role_id: int) -> None:
        # Check if the user is already a member
        stmt = db.select(project_members).where(
            and_(
                project_members.c.project_id == project_id,
                project_members.c.user_id == user_id
            )
        )
        existing = db.session.execute(stmt).first()
        if not existing:
            ins = project_members.insert().values(
                project_id=project_id,
                user_id=user_id,
                role_id=role_id
            )
            db.session.execute(ins)
            db.session.commit()

    @staticmethod
    def remove_member(project_id: int, user_id: int) -> None:
        delete_stmt = project_members.delete().where(
            and_(
                project_members.c.project_id == project_id,
                project_members.c.user_id == user_id
            )
        )
        db.session.execute(delete_stmt)
        db.session.commit()

    @staticmethod
    def save(project: Project) -> None:
        db.session.add(project)
        db.session.commit()

    @staticmethod
    def list_members_with_roles(project_id: int) -> list[dict]:
        stmt = (
            db.select(
                User.id,
                User.email,
                User.first_name,
                User.last_name,
                Role.id.label("role_id"),
                Role.name.label("role_name"),
                Role.code.label("role_code")
            )
            .select_from(project_members)
            .join(User, User.id == project_members.c.user_id)
            .outerjoin(Role, Role.id == project_members.c.role_id)
            .where(project_members.c.project_id == project_id)
        )
        results = db.session.execute(stmt).all()
        return [
            {
                "id": r.id,
                "email": r.email,
                "first_name": r.first_name,
                "last_name": r.last_name,
                "full_name": f"{r.first_name} {r.last_name}",
                "role_id": r.role_id,
                "role_name": r.role_name,
                "role_code": r.role_code
            }
            for r in results
        ]


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
    def list_all() -> list[Project]:
        return Project.query_active().order_by(Project.created_at.desc()).all()

    @staticmethod
    def list_for_user(user_id: int) -> list[Project]:
        # Returns projects where the user is owner, manager, or a member
        return Project.query_active().filter(
            (Project.owner_id == user_id) |
            (Project.manager_id == user_id) |
            (Project.members.any(id=user_id))
        ).order_by(Project.created_at.desc()).all()

    @staticmethod
    def create(key: str, name: str, description: str, owner_id: int, manager_id: int = None, start_date=None, end_date=None) -> Project:
        project = Project(
            key=key.strip().upper(),
            name=name.strip(),
            description=description.strip() if description else None,
            owner_id=owner_id,
            manager_id=manager_id,
            start_date=start_date,
            end_date=end_date
        )
        db.session.add(project)
        db.session.commit()
        return project

    @staticmethod
    def delete(project: Project) -> None:
        from datetime import datetime, timezone
        from app.models.team import Team, team_members
        now = datetime.now(timezone.utc)
        project.deleted_at = now

        # Soft-delete teams and clear team_members for this project
        teams = Team.query.filter_by(project_id=project.id).all()
        for t in teams:
            t.deleted_at = now
            db.session.execute(team_members.delete().where(team_members.c.team_id == t.id))

        # Clear project_members entries for this project
        db.session.execute(project_members.delete().where(project_members.c.project_id == project.id))

        db.session.add(project)
        db.session.commit()


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
        project = ProjectRepository.get_by_id(project_id)
        if not project:
            return []

        user_ids = set()
        if project.owner_id:
            user_ids.add(project.owner_id)
        if project.manager_id:
            user_ids.add(project.manager_id)

        # Users from project_members table
        pm_stmt = db.select(project_members.c.user_id).where(project_members.c.project_id == project_id)
        for uid in db.session.execute(pm_stmt).scalars().all():
            user_ids.add(uid)

        # Users from team_members table belonging to this project's active teams
        from app.models.team import Team, team_members
        tm_stmt = (
            db.select(team_members.c.user_id)
            .join(Team, Team.id == team_members.c.team_id)
            .where(and_(Team.project_id == project_id, Team.deleted_at.is_(None)))
        )
        for uid in db.session.execute(tm_stmt).scalars().all():
            user_ids.add(uid)

        if not user_ids:
            return []

        users = User.query.filter(User.id.in_(user_ids)).all()
        return [
            {
                "id": u.id,
                "email": u.email,
                "first_name": u.first_name,
                "last_name": u.last_name,
                "full_name": f"{u.first_name} {u.last_name}",
                "role_id": u.role_id,
                "role_name": u.role.name if u.role else None,
                "role_code": u.role_code
            }
            for u in users
        ]


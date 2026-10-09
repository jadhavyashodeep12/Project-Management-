from app.models.team import Team, team_members
from app.extensions import db
from sqlalchemy import and_

class TeamRepository:
    @staticmethod
    def get_by_id(team_id: int) -> Team:
        return Team.query_active().filter_by(id=team_id).first()

    @staticmethod
    def list_for_project(project_id: int) -> list[Team]:
        return Team.query_active().filter_by(project_id=project_id).all()

    @staticmethod
    def list_for_user(user_id: int) -> list[Team]:
        # Returns all teams in active projects where the user is either the lead OR a member
        from app.models.project import Project
        return (
            Team.query_active()
            .join(Project, Project.id == Team.project_id)
            .filter(Project.deleted_at.is_(None))
            .filter(
                (Team.lead_id == user_id) |
                (Team.members.any(id=user_id))
            )
            .all()
        )

    @staticmethod
    def create(name: str, description: str, project_id: int, lead_id: int = None) -> Team:
        team = Team(
            name=name.strip(),
            description=description.strip() if description else None,
            project_id=project_id,
            lead_id=lead_id
        )
        db.session.add(team)
        db.session.commit()
        return team

    @staticmethod
    def add_member(team_id: int, user_id: int) -> None:
        stmt = db.select(team_members).where(
            and_(
                team_members.c.team_id == team_id,
                team_members.c.user_id == user_id
            )
        )
        existing = db.session.execute(stmt).first()
        if not existing:
            ins = team_members.insert().values(
                team_id=team_id,
                user_id=user_id
            )
            db.session.execute(ins)
            db.session.commit()

    @staticmethod
    def remove_member(team_id: int, user_id: int) -> None:
        delete_stmt = team_members.delete().where(
            and_(
                team_members.c.team_id == team_id,
                team_members.c.user_id == user_id
            )
        )
        db.session.execute(delete_stmt)
        db.session.commit()

    @staticmethod
    def save(team: Team) -> None:
        db.session.add(team)
        db.session.commit()

    @staticmethod
    def delete(team: Team) -> None:
        from datetime import datetime, timezone
        team.deleted_at = datetime.now(timezone.utc)
        delete_stmt = team_members.delete().where(team_members.c.team_id == team.id)
        db.session.execute(delete_stmt)
        db.session.add(team)
        db.session.commit()



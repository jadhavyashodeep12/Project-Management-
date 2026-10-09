import os
from dotenv import load_dotenv

load_dotenv()

from app import create_app

app = create_app()

with app.app_context():
    try:
        from app.extensions import db
        from app.models.role import Role
        roles_def = [
            (1, "admin", "Admin", "System Admin"),
            (2, "project_manager", "Project Manager", "Project Manager"),
            (3, "team_member", "Team Member", "Team Member"),
        ]
        for role_id, code, name, desc in roles_def:
            r = Role.query.get(role_id)
            if not r:
                r = Role(id=role_id, code=code, name=name, description=desc)
                db.session.add(r)
            else:
                r.code = code
                r.name = name
                r.description = desc
        db.session.commit()
        print("RBAC roles seeded/synced successfully into database!")
    except Exception as e:
        print(f"Role seeding check: {e}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)


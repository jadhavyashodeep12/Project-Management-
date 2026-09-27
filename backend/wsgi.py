import os
from dotenv import load_dotenv

load_dotenv()

from app import create_app

app = create_app()

with app.app_context():
    try:
        from app.extensions import db
        from app.models.role import Role
        if Role.query.count() == 0:
            default_roles = [
                Role(id=1, code="admin", name="Admin", description="Workspace Admin"),
                Role(id=2, code="project_manager", name="Project Manager", description="Project Manager"),
                Role(id=3, code="developer", name="Developer", description="Software Developer"),
                Role(id=4, code="viewer", name="Viewer", description="Read-only Viewer"),
            ]
            db.session.add_all(default_roles)
            db.session.commit()
            print("Default roles seeded successfully into database!")
    except Exception as e:
        print(f"Role seeding check: {e}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)


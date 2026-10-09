import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.extensions import db
from app.models.role import Role
from app.models.user import User
from app.models.project import Project
from app.models.team import Team, team_members
from app.models.task import Task
from sqlalchemy import text

app = create_app()

with app.app_context():
    print("Truncating existing user and project data...")
    db.session.execute(text("""
        TRUNCATE TABLE 
            activity_logs, audit_logs, comments, attachments, task_labels, 
            task_assignees, tasks, team_members, teams, projects, 
            refresh_tokens, email_verifications, notifications, saved_filters, 
            user_roles, users
        RESTART IDENTITY CASCADE;
    """))
    db.session.commit()
    print("Database truncated successfully.")

    # Ensure Roles exist
    roles_data = [
        (1, 'admin', 'Admin', 'Full System Administrator'),
        (2, 'project_manager', 'Project Manager', 'Manages assigned projects and teams'),
        (3, 'team_member', 'Team Member', 'Executes tasks and updates status')
    ]
    for r_id, code, name, desc in roles_data:
        role = db.session.get(Role, r_id)
        if not role:
            role = Role(id=r_id, code=code, name=name, description=desc)
            db.session.add(role)
        else:
            role.code = code
            role.name = name
            role.description = desc
    db.session.commit()
    print("Roles synchronized.")

    # 1. Create EXACTLY 1 ADMIN (Marathi Name)
    admin = User(
        email='admin@pms.com',
        first_name='Yashodeep',
        last_name='Jadhav',
        role_id=1,
        is_active=True,
        is_email_verified=True
    )
    admin.set_password('AdminPassword123!')
    db.session.add(admin)

    # 2. Create PROJECT MANAGERS (Marathi Names)
    pm1 = User(
        email='pm.aarav@pms.com',
        first_name='Aarav',
        last_name='Patil',
        role_id=2,
        is_active=True,
        is_email_verified=True
    )
    pm1.set_password('PMPassword123!')
    db.session.add(pm1)

    pm2 = User(
        email='pm.tanvi@pms.com',
        first_name='Tanvi',
        last_name='Deshmukh',
        role_id=2,
        is_active=True,
        is_email_verified=True
    )
    pm2.set_password('PMPassword123!')
    db.session.add(pm2)

    pm3 = User(
        email='pm.yash@pms.com',
        first_name='Yash',
        last_name='Jadhav',
        role_id=2,
        is_active=True,
        is_email_verified=True
    )
    pm3.set_password('PMPassword123!')
    db.session.add(pm3)

    # 3. Create 4 TEAM MEMBERS (Marathi Names)
    m1 = User(
        email='dev.rohan@pms.com',
        first_name='Rohan',
        last_name='Kulkarni',
        role_id=3,
        is_active=True,
        is_email_verified=True
    )
    m1.set_password('MemberPassword123!')
    db.session.add(m1)

    m2 = User(
        email='dev.sneha@pms.com',
        first_name='Sneha',
        last_name='Joshi',
        role_id=3,
        is_active=True,
        is_email_verified=True
    )
    m2.set_password('MemberPassword123!')
    db.session.add(m2)

    m3 = User(
        email='qa.aniket@pms.com',
        first_name='Aniket',
        last_name='Shinde',
        role_id=3,
        is_active=True,
        is_email_verified=True
    )
    m3.set_password('MemberPassword123!')
    db.session.add(m3)

    m4 = User(
        email='designer.aditya@pms.com',
        first_name='Aditya',
        last_name='Pawar',
        role_id=3,
        is_active=True,
        is_email_verified=True
    )
    m4.set_password('MemberPassword123!')
    db.session.add(m4)

    db.session.commit()
    print("Users created successfully.")

    db.session.commit()
    print("Users created successfully.")
    print("Skipping sample projects, teams, and tasks creation per request.")

print("DATABASE RESET COMPLETED SUCCESSFULLY (ONLY USERS PRESERVED)!")


"""Add RBAC user role_id and project manager_id columns

Revision ID: b189a20d4f10
Revises: e677c0ea842d
Create Date: 2026-10-03 00:45:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b189a20d4f10'
down_revision = 'e677c0ea842d'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('users', sa.Column('role_id', sa.Integer(), nullable=False, server_default='3'))
    op.create_foreign_key('fk_users_role_id', 'users', 'roles', ['role_id'], ['id'], ondelete='RESTRICT')
    
    op.add_column('projects', sa.Column('manager_id', sa.BigInteger(), nullable=True))
    op.create_foreign_key('fk_projects_manager_id', 'projects', 'users', ['manager_id'], ['id'], ondelete='SET NULL')


def downgrade():
    op.drop_constraint('fk_projects_manager_id', 'projects', type_='foreignkey')
    op.drop_column('projects', 'manager_id')
    
    op.drop_constraint('fk_users_role_id', 'users', type_='foreignkey')
    op.drop_column('users', 'role_id')

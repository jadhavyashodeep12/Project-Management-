from functools import wraps
from flask import request, g, current_app
from app.services.auth_service import AuthService
from app.repositories.user_repo import UserRepository
from app.repositories.project_repo import ProjectRepository
from app.utils.errors import AuthenticationException, AuthorizationException, NotFoundException


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # 1. Look for token in Authorization header
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            
        # 2. Fallback to access_token cookie
        if not token:
            token = request.cookies.get("access_token")
            
        if not token:
            raise AuthenticationException("Access token is missing or expired")
            
        try:
            payload = AuthService.verify_access_token(token)
        except AuthenticationException as e:
            current_app.logger.warning(f"require_auth failed for token '{token[:10]}...': {e.message}")
            raise

        sub = payload.get("sub")
        user_id = int(sub) if sub is not None else None

        
        user = UserRepository.get_by_id(user_id)
        if not user or not user.is_active:
            current_app.logger.warning(f"require_auth failed: user_id {user_id} not found or inactive")
            raise AuthenticationException("Active user session could not be established")
            
        g.current_user = user
        return f(*args, **kwargs)
    return decorated


def require_roles(*allowed_roles):
    """
    Ensures g.current_user has one of the specified system roles ('admin', 'project_manager', 'team_member').
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, 'current_user') or not g.current_user:
                raise AuthenticationException("Authentication required")
                
            user_role = g.current_user.role_code
            if user_role not in allowed_roles and user_role != 'admin':
                raise AuthorizationException("You do not have the required system permissions for this operation")
                
            return f(*args, **kwargs)
        return decorated
    return decorator


from flask import request, g, current_app, has_request_context

def require_project_manager_access(param_name="project_id"):
    """
    Ensures caller is either system ADMIN or the assigned PROJECT_MANAGER of the project.
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, 'current_user') or not g.current_user:
                raise AuthenticationException("Authentication required")
                
            if g.current_user.role_code == 'admin':
                return f(*args, **kwargs)
                
            project_id = kwargs.get(param_name)
            if not project_id and has_request_context() and request.view_args:
                project_id = request.view_args.get(param_name)
                
            if not project_id:
                return f(*args, **kwargs)
                
            project = ProjectRepository.get_by_id(project_id)
            if not project:
                raise NotFoundException("Project not found")
                
            is_manager = (project.manager_id == g.current_user.id or project.owner_id == g.current_user.id)
            if not (g.current_user.role_code == 'project_manager' and is_manager):
                raise AuthorizationException("Only the assigned Project Manager or Admin can perform this action")
                
            return f(*args, **kwargs)
        return decorated
    return decorator


def require_project_access(param_name="project_id"):
    """
    Ensures caller is system ADMIN, the project's PROJECT_MANAGER, or an assigned TEAM_MEMBER of the project.
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(g, 'current_user') or not g.current_user:
                raise AuthenticationException("Authentication required")
                
            if g.current_user.role_code == 'admin':
                return f(*args, **kwargs)
                
            project_id = kwargs.get(param_name)
            if not project_id and has_request_context() and request.view_args:
                project_id = request.view_args.get(param_name)
                
            if not project_id:
                return f(*args, **kwargs)
                
            project = ProjectRepository.get_by_id(project_id)
            if not project:
                raise NotFoundException("Project not found")
                
            is_manager = (project.manager_id == g.current_user.id or project.owner_id == g.current_user.id)
            if is_manager:
                return f(*args, **kwargs)
                
            from app.repositories.team_repo import TeamRepository
            user_teams = TeamRepository.list_for_user(g.current_user.id)
            in_project_team = any(t.project_id == project.id for t in user_teams)
            in_project_members = any(m.id == g.current_user.id for m in project.members)
            
            if not (in_project_team or in_project_members):
                raise AuthorizationException("You do not have access to this project")
                
            return f(*args, **kwargs)
        return decorated
    return decorator





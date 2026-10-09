from app.repositories.task_repo import TaskRepository
from app.repositories.project_repo import ProjectRepository
from app.repositories.user_repo import UserRepository
from app.repositories.team_repo import TeamRepository
from app.utils.errors import NotFoundException, AuthorizationException, ConflictException

class TaskService:
    @classmethod
    def _is_valid_project_assignee(cls, project_id: int, user_id: int) -> bool:
        project = ProjectRepository.get_by_id(project_id)
        if not project:
            return False
            
        target_user = UserRepository.get_by_id(user_id)
        if not target_user:
            return False

        # Rule 1 constraint: PM cannot be assigned tasks as team member
        if target_user.role_code == 'project_manager' or project.manager_id == user_id:
            return False

        # Ensure target user is registered in project_members roster
        in_project_members = any(m.id == user_id for m in project.members)
        if not in_project_members:
            target_role_id = target_user.role_id if target_user.role_id else 3
            ProjectRepository.add_member(project_id, user_id, role_id=target_role_id)
        
        return True

    @classmethod
    def create_task(
        cls,
        project_id: int,
        title: str,
        creator_id: int,
        description: str = None,
        priority: str = "medium",
        type: str = "task",
        column_id: int = None,
        assignee_id: int = None,
        due_date = None,
        story_points = None
    ):
        project = ProjectRepository.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project not found")

        creator = UserRepository.get_by_id(creator_id)
        if not creator:
            raise AuthorizationException("Creator user not found")

        if creator.role_code == 'admin':
            raise AuthorizationException("Admin cannot create tasks. Tasks can only be created by assigned Project Managers.")

        is_pm = (creator.role_code == 'project_manager' and (project.manager_id == creator_id or project.owner_id == creator_id))

        if not is_pm:
            raise AuthorizationException("Only assigned Project Manager can create tasks")

        if assignee_id is not None:
            if not cls._is_valid_project_assignee(project_id, assignee_id):
                raise ConflictException("Tasks can only be assigned to valid Team Members of this project")

        count = TaskRepository.count_by_project(project_id) + 1
        key = f"{project.key}-{count}"

        return TaskRepository.create(
            project_id=project_id,
            key=key,
            title=title,
            creator_id=creator_id,
            description=description,
            priority=priority,
            type=type,
            column_id=column_id,
            assignee_id=assignee_id,
            due_date=due_date,
            story_points=story_points
        )

    @classmethod
    def list_tasks_for_project(cls, project_id: int, current_user_id: int):
        project = ProjectRepository.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project not found")

        user = UserRepository.get_by_id(current_user_id)
        if not user:
            raise AuthorizationException("User not found")

        is_admin = (user.role_code == 'admin')
        is_pm = (user.role_code == 'project_manager' and (project.manager_id == current_user_id or project.owner_id == current_user_id))

        # Admin and assigned Project Manager see all tasks in the project
        if is_admin or is_pm:
            return TaskRepository.list_for_project(project_id)

        # Team Members only see their own assigned tasks
        all_tasks = TaskRepository.list_for_project(project_id)
        return [t for t in all_tasks if t.assignee_id == current_user_id]

    @classmethod
    def get_task(cls, task_id: int):
        task = TaskRepository.get_by_id(task_id)
        if not task:
            raise NotFoundException("Task not found")
        return task

    @classmethod
    def update_task(cls, task_id: int, data: dict, current_user_id: int):
        task = cls.get_task(task_id)
        project = ProjectRepository.get_by_id(task.project_id)
        user = UserRepository.get_by_id(current_user_id)
        if not user:
            raise AuthorizationException("User not found")

        if user.role_code == 'admin':
            raise AuthorizationException("Admin cannot update task progress or details.")

        is_pm = (user.role_code == 'project_manager' and (project.manager_id == current_user_id or project.owner_id == current_user_id))
        is_assignee = (task.assignee_id == current_user_id)

        if not (is_pm or is_assignee):
            raise AuthorizationException("You do not have permission to update this task")

        # Team Member restriction: can ONLY update status / column_id / board_position
        if not is_pm:
            restricted_fields = ["title", "description", "priority", "type", "assignee_id", "due_date", "story_points"]
            for rf in restricted_fields:
                if rf in data and data[rf] is not None and getattr(task, rf) != data[rf]:
                    raise AuthorizationException("Team Members can only update task status or column")

        # Validate assignee_id if being updated by PM
        if "assignee_id" in data and data["assignee_id"] is not None:
            if not cls._is_valid_project_assignee(task.project_id, data["assignee_id"]):
                raise ConflictException("Tasks can only be assigned to valid Team Members of this project")

        for field in ["title", "description", "status", "priority", "type", "column_id", "assignee_id", "due_date", "story_points", "order_index", "board_position"]:
            if field in data and data[field] is not None:
                setattr(task, field, data[field])

        return TaskRepository.save(task)

    @classmethod
    def delete_task(cls, task_id: int, current_user_id: int):
        task = cls.get_task(task_id)
        project = ProjectRepository.get_by_id(task.project_id)
        user = UserRepository.get_by_id(current_user_id)
        if not user:
            raise AuthorizationException("User not found")

        if user.role_code == 'admin':
            raise AuthorizationException("Admin cannot delete tasks. Only assigned Project Managers can delete tasks.")

        is_pm = (user.role_code == 'project_manager' and (project.manager_id == current_user_id or project.owner_id == current_user_id))

        if not is_pm:
            raise AuthorizationException("Only assigned Project Manager can delete tasks")

        TaskRepository.delete(task)



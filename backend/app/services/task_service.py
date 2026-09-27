from app.repositories.task_repo import TaskRepository
from app.repositories.project_repo import ProjectRepository
from app.utils.errors import NotFoundException, AuthorizationException

class TaskService:
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

        # Check authorization: Only Project Owner or Team Lead can create tasks
        from app.repositories.team_repo import TeamRepository
        teams = TeamRepository.list_for_project(project_id)
        is_owner = (project.owner_id == creator_id)
        is_team_lead = any(t.lead_id == creator_id for t in teams)

        if not (is_owner or is_team_lead):
            raise AuthorizationException("Only the project owner or a team lead can create tasks in this project")

        # Generate unique task key (e.g. PMS-1, PMS-2)

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

        # Check if current user is Project Owner or Team Lead
        from app.repositories.team_repo import TeamRepository
        teams = TeamRepository.list_for_project(project_id)

        is_owner = (project.owner_id == current_user_id)
        is_team_lead = any(t.lead_id == current_user_id for t in teams)

        # Owner and Team Leads see all tasks in the project
        if is_owner or is_team_lead:
            return TaskRepository.list_for_project(project_id)

        # Regular users ONLY see tasks assigned to them or created by them
        all_tasks = TaskRepository.list_for_project(project_id)
        return [
            t for t in all_tasks 
            if t.assignee_id == current_user_id or t.creator_id == current_user_id
        ]

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

        # Check authorization: Owner, Team Lead, Task Assignee, or Task Creator
        from app.repositories.team_repo import TeamRepository
        teams = TeamRepository.list_for_project(task.project_id)

        is_owner = (project.owner_id == current_user_id)
        is_team_lead = any(t.lead_id == current_user_id for t in teams)
        is_assignee = (task.assignee_id == current_user_id)
        is_creator = (task.creator_id == current_user_id)

        if not (is_owner or is_team_lead or is_assignee or is_creator):
            raise AuthorizationException("Only the project owner, team lead, or assigned user can update this task")
        
        for field in ["title", "description", "status", "priority", "type", "column_id", "assignee_id", "due_date", "story_points", "order_index"]:
            if field in data and data[field] is not None:
                setattr(task, field, data[field])

        return TaskRepository.save(task)

    @classmethod
    def delete_task(cls, task_id: int, current_user_id: int):
        task = cls.get_task(task_id)
        project = ProjectRepository.get_by_id(task.project_id)
        
        from app.repositories.team_repo import TeamRepository
        teams = TeamRepository.list_for_project(task.project_id)

        is_owner = (project.owner_id == current_user_id)
        is_team_lead = any(t.lead_id == current_user_id for t in teams)
        is_creator = (task.creator_id == current_user_id)

        if not (is_owner or is_team_lead or is_creator):
            raise AuthorizationException("Only the project owner, team lead, or creator can delete this task")

        TaskRepository.delete(task)


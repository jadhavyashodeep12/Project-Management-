import React, { useEffect, useState } from 'react';
import { projectsService, type Project } from '../../services/projects';
import { teamsService, type Team } from '../../services/teams';
import { tasksService, type Task } from '../../services/tasks';
import { Button } from '../../components/ui/button';
import api from '../../services/api';
import type { User } from '../../types/auth';
import { useAuthStore } from '../../stores/authStore';
import { KanbanBoard } from '../../components/board/KanbanBoard';
import { Loader2, ArrowLeft, Trash2, Plus } from 'lucide-react';





interface ProjectDetailProps {
  projectId: number;
  onBack: () => void;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId, onBack }) => {
  const currentUser = useAuthStore((state) => state.user);
  const [project, setProject] = useState<Project | null>(null);

  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Task Modal State
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newTaskType, setNewTaskType] = useState<'task' | 'bug' | 'story' | 'epic'>('task');
  const [newTaskTeamId, setNewTaskTeamId] = useState<number | ''>('');
  const [taskTeamMembers, setTaskTeamMembers] = useState<User[]>([]);
  const [isLoadingTaskTeamMembers, setIsLoadingTaskTeamMembers] = useState(false);
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState<number | ''>('');
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  // Tabs: 'board' | 'teams' | 'members' | 'settings'
  const [activeTab, setActiveTab] = useState<'board' | 'teams' | 'members' | 'settings'>('board');

  // Add Member Modal State
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | ''>('');
  const [selectedRoleId, setSelectedRoleId] = useState<number>(3); // Default to Developer (role ID 3)
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);

  // Create Team Modal State
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<number | ''>('');
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Manage Team Members Modal State
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [isTeamMembersLoading, setIsTeamMembersLoading] = useState(false);

  const handleOpenTeamMembersModal = async (team: Team) => {
    setSelectedTeam(team);
    setIsTeamMembersLoading(true);
    try {
      const m = await teamsService.listMembers(team.id);
      setTeamMembers(m);
    } catch (err) {
      console.error('Failed to load team members', err);
    } finally {
      setIsTeamMembersLoading(false);
    }
  };



  // Settings Edit State
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'archived'>('active');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [projData, teamsData, membersData, tasksData] = await Promise.all([
        projectsService.get(projectId),
        teamsService.listForProject(projectId),
        projectsService.listMembers(projectId),
        tasksService.listForProject(projectId),
      ]);
      setProject(projData);
      setTeams(teamsData);
      setMembers(membersData);
      setTasks(tasksData);

      // Initialize edit fields
      setEditName(projData.name);
      setEditDesc(projData.description || '');
      setEditStatus(projData.status);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to load project details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (newTaskTeamId) {
      setIsLoadingTaskTeamMembers(true);
      teamsService.listMembers(Number(newTaskTeamId))
        .then((mList) => {
          setTaskTeamMembers(mList.filter((u) => u.role_code !== 'admin' && u.role_code !== 'project_manager'));
        })
        .catch((err) => {
          console.error('Failed to load team members for task assignment', err);
          setTaskTeamMembers([]);
        })
        .finally(() => {
          setIsLoadingTaskTeamMembers(false);
        });
    } else {
      setTaskTeamMembers([]);
    }
  }, [newTaskTeamId]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setIsCreatingTask(true);
    setTaskError(null);
    try {
      await tasksService.create(projectId, {
        title: newTaskTitle,
        description: newTaskDesc || undefined,
        priority: newTaskPriority,
        type: newTaskType,
        assignee_id: newTaskAssigneeId ? Number(newTaskAssigneeId) : undefined,
      });
      const updatedTasks = await tasksService.listForProject(projectId);
      setTasks(updatedTasks);
      setIsCreateTaskOpen(false);
      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskPriority('medium');
      setNewTaskType('task');
      setNewTaskAssigneeId('');
      setNewTaskTeamId('');
      setTaskTeamMembers([]);
    } catch (err: any) {
      setTaskError(err.response?.data?.error?.message || 'Failed to create task');
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleTaskStatusChange = async (taskId: number, newStatus: 'todo' | 'in_progress' | 'in_review' | 'done') => {
    try {
      const updated = await tasksService.update(taskId, { status: newStatus });
      setTasks(tasks.map((t) => (t.id === taskId ? updated : t)));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update task status');
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) return;
    try {
      await tasksService.delete(taskId);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete task');
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    try {
      await teamsService.deleteTeam(teamId);
      setTeams(teams.filter((t) => t.id !== teamId));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to delete team');
    }
  };


  useEffect(() => {

    loadData();
  }, [projectId]);

  // Load all users to populate the Add Member dropdown list
  const loadAllUsers = async () => {
    try {
      const response = await api.get<User[]>('/users');
      setAllUsers(response.data);
    } catch (err) {
      console.error('Failed to load system users', err);
    }
  };

  useEffect(() => {
    if (isAddMemberOpen || isCreateTeamOpen) {
      loadAllUsers();
    }
  }, [isAddMemberOpen, isCreateTeamOpen]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setIsAddingMember(true);
    setMemberError(null);
    try {
      await projectsService.addMember(projectId, Number(selectedUserId), selectedRoleId);
      // Reload members list
      const updatedMembers = await projectsService.listMembers(projectId);
      setMembers(updatedMembers);
      setIsAddMemberOpen(false);
      setSelectedUserId('');
    } catch (err: any) {
      setMemberError(err.response?.data?.error?.message || 'Failed to add member');
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!window.confirm('Are you sure you want to remove this member from the project?')) return;
    try {
      await projectsService.removeMember(projectId, userId);
      setMembers(members.filter((m) => m.id !== userId));
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to remove member');
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingTeam(true);
    setTeamError(null);
    try {
      const params: any = {
        name: newTeamName,
        description: newTeamDesc || undefined,
        project_id: projectId,
      };
      if (selectedLeadId) {
        params.lead_id = Number(selectedLeadId);
      }
      const created = await teamsService.create(params);
      setTeams([...teams, created]);
      setIsCreateTeamOpen(false);
      setNewTeamName('');
      setNewTeamDesc('');
      setSelectedLeadId('');
    } catch (err: any) {
      setTeamError(err.response?.data?.error?.message || 'Failed to create team');
    } finally {
      setIsCreatingTeam(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsError(null);
    setSettingsSuccess(false);
    try {
      const updated = await projectsService.update(projectId, {
        name: editName,
        description: editDesc || undefined,
        status: editStatus,
      });
      setProject(updated);
      setSettingsSuccess(true);
    } catch (err: any) {
      setSettingsError(err.response?.data?.error?.message || 'Failed to update project settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center font-sans text-white">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-4" />
        <p className="text-sm text-gray-400">Loading project details...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6 font-sans text-white">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none">
          <ArrowLeft className="w-4 h-4" /> Back to projects
        </button>
        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-2xl text-center text-red-400">
          <p className="font-semibold">{error || 'Project not found'}</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role_code === 'admin';
  const isPM = currentUser?.role_code === 'project_manager' && (project?.manager_id === currentUser?.id || project?.owner_id === currentUser?.id);
  const canManageProject = isAdmin || isPM;
  const canCreateTask = !isAdmin && isPM;

  return (
    <div className="space-y-8 font-sans text-white">
      {/* Header */}
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors cursor-pointer bg-transparent border-none">
          <ArrowLeft className="w-4 h-4" /> Back to projects
        </button>

        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs font-bold tracking-wider text-purple-400 uppercase">
                {project.key}
              </span>
              <span className="text-xs text-gray-500 font-medium capitalize">
                • {project.status}
              </span>
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">
              {project.name}
            </h1>
            <p className="text-gray-400 max-w-2xl text-sm">
              {project.description || 'No description provided.'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/[0.06] flex gap-8">
        {(['board', 'teams', 'members', 'settings'] as const)
          .filter((tab) => tab !== 'settings' || canManageProject)
          .map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-sm font-semibold tracking-wide border-b-2 cursor-pointer transition-all uppercase ${activeTab === tab
                ? 'border-purple-500 text-white'
                : 'border-transparent text-gray-500 hover:text-gray-300'
                }`}
            >
              {tab}
            </button>
          ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'board' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Project Board</h3>
                <p className="text-xs text-gray-400">Track and manage tasks across workflow columns.</p>
              </div>
              {canCreateTask && (
                <Button
                  onClick={() => setIsCreateTaskOpen(true)}
                  className="rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold px-4 py-2 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-purple-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Task</span>
                </Button>
              )}
            </div>

            <KanbanBoard
              tasks={tasks}
              members={members}
              currentUser={currentUser}
              ownerId={project?.owner_id || 0}
              teamLeads={teams.map((t) => t.lead_id).filter((id): id is number => id !== null)}
              onStatusChange={(taskId, newStatus) => handleTaskStatusChange(taskId, newStatus as any)}
              onDeleteTask={handleDeleteTask}
            />
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Teams ({teams.length})</h3>
            </div>


            {teams.length === 0 ? (
              <div className="bg-[#121214]/40 border border-white/[0.06] border-dashed rounded-2xl p-12 text-center">
                <p className="text-sm text-gray-400">No teams created for this project yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {teams.map((team) => {
                  const leadMember = members.find((m) => m.id === team.lead_id);
                  return (
                    <div key={team.id} className="bg-[#121214]/60 border border-white/[0.06] p-6 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-lg text-white">{team.name}</h4>
                        {!isAdmin && isPM && (
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            className="p-2 rounded-xl text-red-400/80 hover:text-red-400 hover:bg-red-500/20 transition-all border-none bg-transparent cursor-pointer flex items-center justify-center"
                            title="Delete team"
                          >
                            <Trash2 className="w-5.5 h-5.5" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-gray-400 line-clamp-2 h-8">{team.description || 'No description'}</p>
                      <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-semibold">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-300">{leadMember ? leadMember.full_name : 'No Lead'}</span>
                          {leadMember && (
                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-bold uppercase tracking-wider">
                              Team Lead
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleOpenTeamMembersModal(team)}
                          className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer border-none bg-transparent"
                        >
                          View members
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Project Members ({members.length})</h3>
              {!isAdmin && isPM && (
                <Button
                  onClick={() => setIsAddMemberOpen(true)}
                  className="rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white border border-white/[0.08] hover:border-purple-500/40 text-xs font-semibold px-4 py-2 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </Button>
              )}
            </div>


            <div className="bg-[#121214]/40 border border-white/[0.06] rounded-2xl overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02] text-gray-400 font-semibold">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const isOwner = member.id === project.owner_id;
                    return (

                      <tr key={member.id} className="border-b border-white/[0.04] hover:bg-white/[0.01] transition-colors">
                        <td className="p-4 font-semibold text-white flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-semibold uppercase text-xs">
                            {member.first_name[0]}{member.last_name[0]}
                          </div>
                          <span>{member.full_name}</span>
                          <div className="flex items-center gap-1.5">
                            {isOwner && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold uppercase tracking-wider">
                                OWNER
                              </span>
                            )}
                            {!isOwner && (member.role_code === 'project_manager' || member.role_id === 2) && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-bold uppercase tracking-wider">
                                PROJECT MANAGER
                              </span>
                            )}
                            {!isOwner && (member.role_code === 'viewer' || member.role_id === 4) && (
                              <span className="px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[9px] font-bold uppercase tracking-wider">
                                VIEWER
                              </span>
                            )}
                            {!isOwner && (member.role_code === 'developer' || member.role_id === 3 || (!member.role_id && !member.role_code)) && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider">
                                DEVELOPER
                              </span>
                            )}
                          </div>

                        </td>
                        <td className="p-4 text-gray-400">{member.email}</td>
                      </tr>
                    );
                  })}
                </tbody>

              </table>
            </div>
          </div>
        )}


        {activeTab === 'settings' && canManageProject && (
          <form onSubmit={handleSaveSettings} className="bg-[#121214]/40 border border-white/[0.06] p-8 rounded-3xl max-w-xl space-y-6">
            <h3 className="text-lg font-bold mb-4">Project Settings</h3>

            {settingsError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-xl">
                {settingsError}
              </div>
            )}
            {settingsSuccess && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium rounded-xl">
                Settings saved successfully!
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Project Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Description</label>
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm h-24 resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Project Status</label>
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as any)}
                className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={isSavingSettings}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg px-6 py-2.5 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isSavingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </form>
        )}
      </div>

      {/* Add Member Modal */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#121214] border border-white/[0.08] w-full max-w-md rounded-3xl p-8 shadow-2xl relative">
            <h3 className="text-2xl font-bold tracking-tight mb-6">Add Member to Project</h3>

            <form onSubmit={handleAddMember} className="space-y-6">
              {memberError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-xl">
                  {memberError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Select User</label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm"
                >
                  <option value="">-- Choose User --</option>
                  {allUsers
                    .filter((u) => !members.some((m) => m.id === u.id))
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                      </option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Project Role</label>
                <select
                  value={selectedRoleId}
                  onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                  className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm"
                >
                  <option value={2}>Project Manager</option>
                  <option value={3}>Developer</option>
                  <option value={4}>Viewer</option>
                </select>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-sm transition-all cursor-pointer border-none bg-transparent"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isAddingMember || !selectedUserId}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isAddingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Member'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Team Modal */}
      {isCreateTeamOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#121214] border border-white/[0.08] w-full max-w-md rounded-3xl p-8 shadow-2xl relative">
            <h3 className="text-2xl font-bold tracking-tight mb-6">Create New Team</h3>

            <form onSubmit={handleCreateTeam} className="space-y-6">
              {teamError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-xl">
                  {teamError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Team Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Frontend Core"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Description</label>
                <textarea
                  placeholder="What is this team responsible for?"
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm h-24 resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Team Lead (Optional)</label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => setSelectedLeadId(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm"
                >
                  <option value="">-- No Lead Assigned --</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name} ({member.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateTeamOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-sm transition-all cursor-pointer border-none bg-transparent"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isCreatingTeam}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isCreatingTeam ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Team'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {isCreateTaskOpen && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#121214] border border-white/[0.08] w-full max-w-lg rounded-3xl p-8 shadow-2xl relative">
            <h3 className="text-2xl font-bold tracking-tight text-white mb-6">Create New Task</h3>

            <form onSubmit={handleCreateTask} className="space-y-5">
              {taskError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium rounded-xl">
                  {taskError}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement PostgreSQL Task Repositories"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Description (Optional)</label>
                <textarea
                  placeholder="Provide task implementation details..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm h-24 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Type</label>
                  <select
                    value={newTaskType}
                    onChange={(e) => setNewTaskType(e.target.value as any)}
                    className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm"
                  >
                    <option value="task">Task</option>
                    <option value="bug">Bug</option>
                    <option value="story">Story</option>
                    <option value="epic">Epic</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Team (Optional)</label>
                  <select
                    value={newTaskTeamId}
                    onChange={(e) => {
                      setNewTaskTeamId(e.target.value ? Number(e.target.value) : '');
                      setNewTaskAssigneeId('');
                    }}
                    className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm"
                  >
                    <option value="">-- All Teams --</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-300 tracking-wide uppercase">Assignee (Optional)</label>
                  <select
                    value={newTaskAssigneeId}
                    onChange={(e) => setNewTaskAssigneeId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full bg-[#0d0d0f]/85 text-white px-4 py-2.5 rounded-xl border border-white/[0.08] focus:border-purple-500/50 outline-none transition-all text-sm"
                  >
                    <option value="">-- Unassigned --</option>
                    {newTaskTeamId ? (
                      isLoadingTaskTeamMembers ? (
                        <option value="" disabled>Loading team members...</option>
                      ) : taskTeamMembers.length === 0 ? (
                        <option value="" disabled>No members in selected team</option>
                      ) : (
                        taskTeamMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.full_name} ({m.email})
                          </option>
                        ))
                      )
                    ) : (
                      members.filter((m) => m.role_code !== 'admin' && m.role_code !== 'project_manager').map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.full_name} ({member.email})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateTaskOpen(false)}
                  className="flex-1 h-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-sm transition-all cursor-pointer border-none bg-transparent"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isCreatingTask}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isCreatingTask ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Task'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Team Members Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-[#121214] border border-white/[0.08] w-full max-w-lg rounded-3xl p-8 shadow-2xl relative">
            <h3 className="text-2xl font-bold tracking-tight text-white mb-2">{selectedTeam.name} Members</h3>
            <p className="text-xs text-gray-500 mb-6">Members currently assigned to this team.</p>

            <div className="max-h-60 overflow-y-auto border border-white/[0.06] rounded-2xl bg-white/[0.01]">
              {isTeamMembersLoading ? (
                <div className="py-8 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                </div>
              ) : teamMembers.length === 0 ? (
                <p className="p-6 text-center text-xs text-gray-500 font-medium">No members assigned to this team.</p>
              ) : (
                <table className="w-full text-left text-sm border-collapse">
                  <tbody>
                    {teamMembers.map((member) => (
                      <tr key={member.id} className="border-b border-white/[0.04] last:border-none hover:bg-white/[0.01] transition-colors">
                        <td className="p-3 font-semibold flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-semibold uppercase text-xs">
                            {member.first_name[0]}{member.last_name[0]}
                          </div>
                          {member.full_name}
                        </td>
                        <td className="p-3 text-gray-400 text-xs text-right">{member.email}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="flex justify-end pt-6">
              <button
                type="button"
                onClick={() => setSelectedTeam(null)}
                className="h-10 px-6 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-sm transition-all cursor-pointer border-none bg-transparent"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


